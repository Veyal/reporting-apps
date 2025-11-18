const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const next = require('next');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const photoRoutes = require('./routes/photos');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const nextFrontendDir = path.join(__dirname, '../frontend');
const nextApp = next({
  dev,
  dir: nextFrontendDir
});
const handleNextRequest = nextApp.getRequestHandler();

// Create necessary directories
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const dataDir = './data';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN || 'https://do-dev.veyal.org']
    : ['http://localhost:3000', 'http://localhost:5001', 'http://127.0.0.1:3000', 'http://127.0.0.1:5001'],
  credentials: true
}));

// Rate limiting - DISABLED FOR DEVELOPMENT
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 300, // 300 requests per window
//   message: 'Too many requests from this IP, please try again later.'
// });

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // 5 requests per window
//   message: 'Too many authentication attempts, please try again later.'
// });

// app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/photos', photoRoutes); // Photo categories are public
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/stock', require('./routes/stock'));

// Error handling middleware for API routes
app.use(errorHandler);

const startServer = async () => {
  try {
    await nextApp.prepare();

    // After Next is ready, let it handle every non-API request
    app.all('*', (req, res) => handleNextRequest(req, res));

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Database: ${process.env.DATABASE_URL}`);
      console.log(`📁 Upload directory: ${uploadDir}`);
    });
  } catch (error) {
    console.error('❌ Failed to prepare Next.js frontend', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
