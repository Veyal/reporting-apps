const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const reportId = req.params.id;
    const uploadPath = path.join(process.env.UPLOAD_DIR, 'reports', reportId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  }
});

// Helper function to generate file checksum
const generateChecksum = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// POST /api/photos/:id - Upload photos to report
router.post('/:id', authenticateToken, upload.array('photos', 10), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Photo category is required'
      });
    }

    // Verify report exists and user has access
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

    // Verify category exists for this report type
    const photoCategory = await prisma.photoCategory.findFirst({
      where: {
        code: category,
        reportType: report.type,
        active: true
      }
    });

    if (!photoCategory) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid photo category for this report type'
      });
    }

    // Check current photo count for this category
    const currentPhotos = await prisma.reportPhoto.count({
      where: {
        reportId: id,
        category
      }
    });

    if (currentPhotos + req.files.length > photoCategory.maxAllowed) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Maximum ${photoCategory.maxAllowed} photos allowed for category ${category}`
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const uploadedPhotos = [];
    
    for (const file of req.files) {
      const checksum = generateChecksum(file.path);
      
      const photo = await prisma.reportPhoto.create({
        data: {
          reportId: id,
          category,
          filename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          checksum
        }
      });

      uploadedPhotos.push(photo);
    }

    res.status(201).json({
      message: 'Photos uploaded successfully',
      photos: uploadedPhotos
    });
  } catch (error) {
    // Clean up uploaded files if database operation fails
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
});

// DELETE /api/photos/:id/:photoId - Delete photo
router.delete('/:id/:photoId', authenticateToken, async (req, res, next) => {
  try {
    const { id, photoId } = req.params;

    // Verify report exists and user has access
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

    // Find photo
    const photo = await prisma.reportPhoto.findFirst({
      where: {
        id: photoId,
        reportId: id
      }
    });

    if (!photo) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo not found'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(
      process.env.UPLOAD_DIR,
      'reports',
      id,
      photo.filename
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.reportPhoto.delete({
      where: { id: photoId }
    });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/photos/file/:reportId/:filename - Serve photo file (MUST BE BEFORE /:id route)
router.get('/file/:reportId/:filename', authenticateToken, async (req, res, next) => {
  try {
    const { reportId, filename } = req.params;

    // Verify report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Report not found'
      });
    }

    // Verify photo belongs to this report
    const photo = await prisma.reportPhoto.findFirst({
      where: {
        reportId,
        filename
      }
    });

    if (!photo) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo not found'
      });
    }

    // Serve the file
    const filePath = path.resolve(
      process.env.UPLOAD_DIR || './uploads',
      'reports',
      reportId,
      filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo file not found on disk'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/photos/:id - Get photos for report
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    // Verify report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id
      }
    });

    if (!report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Report not found'
      });
    }

    const where = { reportId: id };
    if (category) {
      where.category = category;
    }

    const photos = await prisma.reportPhoto.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    res.json(photos);
  } catch (error) {
    next(error);
  }
});

// GET /api/photos/categories/:reportType - Get photo categories for report type (public endpoint)
router.get('/categories/:reportType', async (req, res, next) => {
  try {
    const { reportType } = req.params;

    if (!['OPENING', 'CLOSING', 'PROBLEM', 'STOCK'].includes(reportType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid report type'
      });
    }

    const categories = await prisma.photoCategory.findMany({
      where: {
        reportType,
        active: true
      },
      orderBy: { order: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
