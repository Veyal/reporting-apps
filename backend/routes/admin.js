const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// All admin routes require admin privileges
router.use(requireAdmin);

// Validation schemas
const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  role: Joi.string().valid('USER', 'ADMIN').default('USER')
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid('USER', 'ADMIN').optional()
});

const createChecklistSchema = Joi.object({
  type: Joi.string().valid('OPENING', 'CLOSING').required(),
  title: Joi.string().min(1).max(200).required(),
  order: Joi.number().integer().min(0).default(0),
  required: Joi.boolean().default(false)
});

const updateChecklistSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  order: Joi.number().integer().min(0).optional(),
  required: Joi.boolean().optional()
});

const createPhotoCategorySchema = Joi.object({
  code: Joi.string().min(1).max(50).required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(''),
  reportType: Joi.string().valid('OPENING', 'CLOSING', 'PROBLEM', 'STOCK').required(),
  minRequired: Joi.number().integer().min(0).default(0),
  maxAllowed: Joi.number().integer().min(1).max(20).default(10),
  order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true)
});

const updatePhotoCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  minRequired: Joi.number().integer().min(0).optional(),
  maxAllowed: Joi.number().integer().min(1).max(20).optional(),
  order: Joi.number().integer().min(0).optional(),
  active: Joi.boolean().optional()
});

// USER MANAGEMENT

// GET /api/admin/users - List all users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: { reports: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
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

// POST /api/admin/users - Create new user
router.post('/users', async (req, res, next) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { username, name, password, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User Exists',
        message: 'Username already taken'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        name,
        passwordHash,
        role
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: value,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Cannot delete your own account'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// CHECKLIST MANAGEMENT

// GET /api/admin/checklists - List checklist templates
router.get('/checklists', async (req, res, next) => {
  try {
    const { type } = req.query;

    const where = {};
    if (type) where.type = type;

    const checklists = await prisma.checklistTemplate.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { order: 'asc' }
      ]
    });

    res.json(checklists);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/checklists - Create checklist template
router.post('/checklists', async (req, res, next) => {
  try {
    const { error, value } = createChecklistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const checklist = await prisma.checklistTemplate.create({
      data: value
    });

    res.status(201).json(checklist);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/checklists/reorder - Update checklist order
// This must come BEFORE the :id route to prevent route matching issues
router.patch('/checklists/reorder', async (req, res, next) => {
  try {
    const { checklists } = req.body;

    if (!Array.isArray(checklists)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Checklists must be an array'
      });
    }

    // Update each checklist's order in a transaction
    await prisma.$transaction(
      checklists.map(item =>
        prisma.checklistTemplate.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );

    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/checklists/:id - Update checklist template
router.patch('/checklists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateChecklistSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const checklist = await prisma.checklistTemplate.update({
      where: { id },
      data: value
    });

    res.json(checklist);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/checklists/:id - Delete checklist template
router.delete('/checklists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.checklistTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Checklist template deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PHOTO CATEGORY MANAGEMENT

// GET /api/admin/photo-categories - List photo categories
router.get('/photo-categories', async (req, res, next) => {
  try {
    const { reportType } = req.query;

    const where = {};
    if (reportType) where.reportType = reportType;

    const categories = await prisma.photoCategory.findMany({
      where,
      orderBy: [
        { reportType: 'asc' },
        { order: 'asc' }
      ]
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/photo-categories - Create photo category
router.post('/photo-categories', async (req, res, next) => {
  try {
    const { error, value } = createPhotoCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const category = await prisma.photoCategory.create({
      data: value
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/photo-categories/:id - Update photo category
router.patch('/photo-categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePhotoCategorySchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const category = await prisma.photoCategory.update({
      where: { id },
      data: value
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/photo-categories/:id - Delete photo category
router.delete('/photo-categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.photoCategory.delete({
      where: { id }
    });

    res.json({ message: 'Photo category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// SYSTEM SETTINGS

// GET /api/admin/settings - Get system settings
router.get('/settings', async (req, res, next) => {
  try {
    // Get the first (and should be only) settings record
    let settings = await prisma.systemSettings.findFirst();

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {} // Uses defaults from schema
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/settings - Update system settings
router.put('/settings', async (req, res, next) => {
  try {
    const settingsSchema = Joi.object({
      systemName: Joi.string().min(1).max(100).optional(),
      maxFileSize: Joi.number().integer().min(1).max(100).optional(),
      maxFilesPerUpload: Joi.number().integer().min(1).max(50).optional(),
      sessionTimeout: Joi.number().integer().min(5).max(60).optional(),
      refreshTokenDays: Joi.number().integer().min(1).max(30).optional(),
      enableNotifications: Joi.boolean().optional(),
      enableAutoBackup: Joi.boolean().optional(),
      backupFrequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional()
    });

    const { error, value } = settingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    // Get existing settings
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      // Create if doesn't exist
      settings = await prisma.systemSettings.create({
        data: value
      });
    } else {
      // Update existing
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: value
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// STATISTICS

// GET /api/admin/stats/summary - Get report statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      totalReports,
      reportsByType,
      reportsByStatus,
      recentReports,
      userStats
    ] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.groupBy({
        by: ['type'],
        where,
        _count: { type: true }
      }),
      prisma.report.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.report.findMany({
        where,
        include: {
          user: {
            select: { username: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ]);

    res.json({
      totalReports,
      reportsByType: reportsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {}),
      reportsByStatus: reportsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentReports,
      userStats: userStats.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {})
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
