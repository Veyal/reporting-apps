const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const stockService = require('../services/stockService');
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Initialize stock report with Olsera data
    const stockReport = await stockService.initializeStockReport(reportId, value.stockDate);

    res.json({
      message: 'Stock report initialized successfully',
      stockReport
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

    res.json({
      stockReport,
      stats
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

    res.json({
      message: 'Stock item updated successfully',
      item: updatedItem
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

    res.json(summary);
  } catch (error) {
    console.error('Failed to get stock summary:', error);
    res.status(500).json({ message: 'Failed to get stock summary' });
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