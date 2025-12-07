const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Validation schemas
const createReportSchema = Joi.object({
  type: Joi.string().valid('OPENING', 'CLOSING', 'PROBLEM', 'STOCK').required(),
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).allow(''),
  metadata: Joi.object().optional()
});

const updateReportSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  metadata: Joi.object().optional()
});

const stockReportSchema = Joi.object({
  opening: Joi.number().min(0).required(),
  out: Joi.number().min(0).required(),
  closing: Joi.number().min(0).required()
});

// GET /api/reports - List reports with filters
router.get('/', async (req, res, next) => {
  try {
    const {
      type,
      status,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where = {
      userId: req.user.role === 'ADMIN' ? undefined : req.user.id
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true }
          },
          photos: {
            select: { id: true, category: true, filename: true }
          },
          checklists: {
            include: {
              template: {
                select: { title: true, required: true }
              }
            }
          },
          stockReport: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/:id - Get report details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id
      },
      include: {
        user: {
          select: { id: true, username: true, name: true }
        },
        photos: true,
        checklists: {
          include: {
            template: true
          }
        },
        stockReport: {
          include: {
            items: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Report not found'
      });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// POST /api/reports - Create new report
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { type, title, description, metadata } = value;

    const report = await prisma.report.create({
      data: {
        type,
        title,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: req.user.id,
        status: 'DRAFT'
      },
      include: {
        user: {
          select: { id: true, username: true, name: true }
        }
      }
    });

    // Create checklist items for opening/closing reports
    if (type === 'OPENING' || type === 'CLOSING') {
      const templates = await prisma.checklistTemplate.findMany({
        where: { type },
        orderBy: { order: 'asc' }
      });

      if (templates.length > 0) {
        await prisma.reportChecklist.createMany({
          data: templates.map(template => ({
            reportId: report.id,
            templateId: template.id,
            completed: false
          }))
        });
      }
    }

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/reports/:id - Update draft report
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateReportSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    // Check if report exists and is a draft
    const existingReport = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        status: 'DRAFT'
      }
    });

    if (!existingReport) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Draft report not found or already submitted'
      });
    }

    const updateData = { ...value };
    if (updateData.metadata) {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, username: true, name: true }
        },
        photos: true,
        checklists: {
          include: {
            template: true
          }
        },
        stockReport: true
      }
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reports/:id - Delete draft report
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        status: 'DRAFT'
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Draft report not found'
      });
    }

    await prisma.report.delete({
      where: { id }
    });

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/submit - Submit report
router.post('/:id/submit', async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        status: 'DRAFT'
      },
      include: {
        checklists: {
          include: {
            template: true
          }
        },
        photos: true
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Draft report not found'
      });
    }

    // Validate submission requirements
    if (report.type === 'OPENING' || report.type === 'CLOSING') {
      const requiredChecklists = report.checklists.filter(
        item => item.template.required && !item.completed
      );

      if (requiredChecklists.length > 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'All required checklist items must be completed before submission'
        });
      }
    }

    if (report.type === 'PROBLEM' && (!report.title || !report.description)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Problem reports must have a title and description'
      });
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, username: true, name: true }
        },
        photos: true,
        checklists: {
          include: {
            template: true
          }
        },
        stockReport: true
      }
    });

    res.json(updatedReport);
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/resolve - Resolve problem report (Admin only)
router.post('/:id/resolve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Resolution is required'
      });
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        type: 'PROBLEM',
        status: 'SUBMITTED'
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Problem report not found or not submitted'
      });
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: resolution.trim()
      },
      include: {
        user: {
          select: { id: true, username: true, name: true }
        },
        photos: true,
        checklists: {
          include: {
            template: true
          }
        },
        stockReport: true
      }
    });

    res.json(updatedReport);
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/checklist/:checklistId - Update checklist item
router.post('/:id/checklist/:checklistId', async (req, res, next) => {
  try {
    const { id, checklistId } = req.params;
    const { completed } = req.body;

    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Completed must be a boolean value'
      });
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        status: 'DRAFT'
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Draft report not found'
      });
    }

    const checklistItem = await prisma.reportChecklist.update({
      where: {
        id: checklistId,
        reportId: id
      },
      data: { completed },
      include: {
        template: true
      }
    });

    res.json(checklistItem);
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/:id/stock - Create/update stock report
router.post('/:id/stock', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = stockReportSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { opening, out, closing } = value;

    // Validate stock calculation
    if (opening - out !== closing) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Stock calculation is incorrect: Opening - Out must equal Closing'
      });
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        type: 'STOCK',
        status: 'DRAFT'
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Draft stock report not found'
      });
    }

    const stockReport = await prisma.stockReport.upsert({
      where: { reportId: id },
      update: {
        opening,
        out,
        closing,
        correctionCount: { increment: 1 }
      },
      create: {
        reportId: id,
        opening,
        out,
        closing
      }
    });

    res.json(stockReport);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
