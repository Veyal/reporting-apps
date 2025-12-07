const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stockService = require('../services/stockService');

const sanitizeStockItemForUser = (item) => {
  if (!item) {
    return item;
  }

  const {
    openingStock,
    expectedOut,
    difference,
    ...safeFields
  } = item;

  return safeFields;
};

const sanitizeStockReportForUser = (stockReport) => {
  if (!stockReport) {
    return stockReport;
  }

  return {
    ...stockReport,
    items: stockReport.items?.map(sanitizeStockItemForUser) || []
  };
};

const sanitizeStatsForUser = (stats) => {
  if (!stats) {
    return stats;
  }

  const {
    totalItems,
    completedItems,
    completionPercentage
  } = stats;

  return {
    totalItems,
    completedItems,
    completionPercentage
  };
};

const sanitizeSummaryForUser = (summary) => {
  if (!summary) {
    return summary;
  }

  return {
    ...summary,
    items: summary.items?.map((item) => {
      const {
        opening,
        expectedOut,
        difference,
        ...rest
      } = item;
      return rest;
    }) || []
  };
};

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'stock');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `stock-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Test route to verify stock API is working
router.get('/test', (req, res) => {
  console.log('Stock API test route called');
  res.json({ message: 'Stock API is working', timestamp: new Date() });
});

// Initialize stock report with Olsera data
router.post('/reports/:reportId/initialize', authenticateToken, async (req, res) => {
  console.log('=== STOCK INITIALIZE ENDPOINT CALLED ===');
  console.log('Report ID:', req.params.reportId);
  console.log('Request Body:', req.body);

  try {
    const { reportId } = req.params;

    const schema = Joi.object({
      stockDate: Joi.date().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.id,
        type: 'STOCK'
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Stock report not found' });
    }

    if (req.user.role !== 'ADMIN') {
      const requestedDate = req.body.stockDate;
      const today = new Date().toISOString().split('T')[0];

      if (requestedDate !== today) {
        return res.status(400).json({
          message: 'Stock reports can only be initialized for today'
        });
      }
    }

    // Initialize stock report with Olsera data
    const stockReport = await stockService.initializeStockReport(reportId, value.stockDate);
    const responseReport = req.user.role === 'ADMIN'
      ? stockReport
      : sanitizeStockReportForUser(stockReport);

    res.json({
      message: 'Stock report initialized successfully',
      stockReport: responseReport
    });
  } catch (error) {
    console.error('Failed to initialize stock report:', error);
    res.status(500).json({
      message: 'Failed to initialize stock report',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get stock report with items
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  console.log('=== STOCK GET ENDPOINT CALLED ===');
  console.log('Report ID:', req.params.reportId);

  try {
    const { reportId } = req.params;

    // Verify report belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.id,
        type: 'STOCK'
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Stock report not found' });
    }

    const stockReport = await stockService.getStockReport(reportId);
    const stats = await stockService.getStockReportStats(reportId);
    const responseReport = req.user.role === 'ADMIN'
      ? stockReport
      : sanitizeStockReportForUser(stockReport);
    const responseStats = req.user.role === 'ADMIN'
      ? stats
      : sanitizeStatsForUser(stats);

    res.json({
      stockReport: responseReport,
      stats: responseStats
    });
  } catch (error) {
    console.error('Failed to get stock report:', error);
    res.status(500).json({ message: 'Failed to get stock report' });
  }
});

// Update stock item with actual closing stock
router.patch('/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const schema = Joi.object({
      actualClosing: Joi.number().min(0).required(),
      notes: Joi.string().allow(null, '').optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Verify item exists and user has access
    const item = await prisma.stockReportItem.findUnique({
      where: { id: itemId },
      include: {
        stockReport: {
          include: {
            report: true
          }
        }
      }
    });

    if (!item || item.stockReport.report.userId !== req.user.id) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    // Update the stock item
    const updatedItem = await stockService.updateStockItem(
      itemId,
      value.actualClosing,
      req.body.photoId || null,
      value.notes
    );
    const responseItem = req.user.role === 'ADMIN'
      ? updatedItem
      : sanitizeStockItemForUser(updatedItem);

    res.json({
      message: 'Stock item updated successfully',
      item: responseItem
    });
  } catch (error) {
    console.error('Failed to update stock item:', error);
    res.status(500).json({ message: 'Failed to update stock item' });
  }
});

// Upload photo for stock item
router.post('/items/:itemId/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    // Verify item exists and user has access
    const item = await prisma.stockReportItem.findUnique({
      where: { id: itemId },
      include: {
        stockReport: {
          include: {
            report: true
          }
        }
      }
    });

    if (!item || item.stockReport.report.userId !== req.user.id) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: 'Stock item not found' });
    }

    // Create photo record
    const photo = await prisma.reportPhoto.create({
      data: {
        reportId: item.stockReport.reportId,
        category: 'STOCK_MEASUREMENT',
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        checksum: '' // You can implement checksum calculation if needed
      }
    });

    // Update stock item with photo reference
    await prisma.stockReportItem.update({
      where: { id: itemId },
      data: { photoId: photo.id }
    });

    res.json({
      message: 'Photo uploaded successfully',
      photo: {
        id: photo.id,
        filename: photo.filename,
        url: `/api/stock/photos/${photo.id}`
      }
    });
  } catch (error) {
    console.error('Failed to upload photo:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

// Get photo
router.get('/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;

    const photo = await prisma.reportPhoto.findUnique({
      where: { id: photoId },
      include: {
        report: true
      }
    });

    if (!photo || photo.report.userId !== req.user.id) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photoPath = path.join(process.cwd(), 'uploads', 'stock', photo.filename);
    res.sendFile(photoPath);
  } catch (error) {
    console.error('Failed to get photo:', error);
    res.status(500).json({ message: 'Failed to get photo' });
  }
});

// Get stock summary
router.get('/reports/:reportId/summary', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;

    // Verify report belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.id,
        type: 'STOCK'
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Stock report not found' });
    }

    const summary = await stockService.generateStockSummary(reportId);
    const responseSummary = req.user.role === 'ADMIN'
      ? summary
      : sanitizeSummaryForUser(summary);

    res.json(responseSummary);
  } catch (error) {
    console.error('Failed to get stock summary:', error);
    res.status(500).json({ message: 'Failed to get stock summary' });
  }
});

// Add custom stock item (not from Olsera)
router.post('/reports/:reportId/items', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;

    const schema = Joi.object({
      productName: Joi.string().required().min(1).max(100),
      openingStock: Joi.number().min(0).required(),
      expectedOut: Joi.number().min(0).optional().default(0),
      unit: Joi.string().optional().default('pcs')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Verify report belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.id,
        type: 'STOCK'
      },
      include: {
        stockReport: true
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Stock report not found' });
    }

    if (!report.stockReport) {
      return res.status(400).json({ message: 'Stock report not initialized. Please select a date first.' });
    }

    // Create custom stock item
    const customItem = await prisma.stockReportItem.create({
      data: {
        stockReportId: report.stockReport.id,
        productId: `custom-${Date.now()}`,
        productName: value.productName,
        productSku: 'CUSTOM',
        unit: value.unit,
        openingStock: value.openingStock,
        expectedOut: value.expectedOut,
        completed: false
      }
    });

    res.json({
      message: 'Custom item added successfully',
      item: customItem
    });
  } catch (error) {
    console.error('Failed to add custom item:', error);
    res.status(500).json({ message: 'Failed to add custom item' });
  }
});

// Finalize stock report
router.post('/reports/:reportId/finalize', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;

    // Verify report belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.id,
        type: 'STOCK',
        status: 'DRAFT'
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Stock report not found or already submitted' });
    }

    // Check if all items are completed
    const isComplete = await stockService.checkReportCompletion(reportId);

    if (!isComplete) {
      return res.status(400).json({ message: 'All stock items must be completed before finalizing' });
    }

    // Update report status
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    res.json({
      message: 'Stock report finalized successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Failed to finalize stock report:', error);
    res.status(500).json({ message: 'Failed to finalize stock report' });
  }
});

module.exports = router;
