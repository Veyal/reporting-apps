# Business Reporting Application - Technical Documentation

## Application Purpose
A mobile-optimized web application for business reporting and management that allows users to create, submit, and track various types of reports with photo attachments and checklist validation.

## Core Features

### 1. Multi-Type Report System
- **Opening Reports**: Daily opening procedures with checklists and photos
- **Closing Reports**: Daily closing procedures with checklists and photos  
- **Problem Reports**: Issue reporting with severity levels and resolution tracking
- **Stock Reports**: Inventory tracking with opening/closing/out quantities

### 2. User Management & Authentication
- **Two User Roles**: Admin and User
- **JWT Authentication**: Secure login with access/refresh tokens
- **Password Security**: 8+ chars with complexity requirements
- **Session Management**: Automatic token refresh and logout

### 3. Photo Management
- **Category-based Uploads**: Different photo categories per report type
- **Validation**: 10MB max per photo, JPEG/PNG/GIF/WebP formats
- **Requirements**: Min/max photo requirements per category
- **Security**: File validation, checksum generation, secure storage

### 4. Checklist System
- **Template-based**: Admin-configurable checklists for Opening/Closing reports
- **Completion Tracking**: Required vs optional items
- **Validation**: Must complete required items before submission

### 5. Report Workflow
- **Draft State**: Create and edit reports before submission
- **Submission**: Submit for review (cannot edit after submission)
- **Resolution**: Problem reports can be resolved with notes
- **Status Tracking**: Draft → Submitted → Resolved

## Database Schema (SQLite Only)

### Core Tables
```sql
Users (id, username, name, password_hash, role, last_login, created_at)
Reports (id, type, title, description, status, user_id, submitted_at, resolved_at, resolution, metadata, created_at)
ReportPhotos (id, report_id, category, filename, mime_type, size, checksum, created_at)
PhotoCategories (id, code, name, description, report_type, min_required, max_allowed, order, active)
ChecklistTemplates (id, type, title, order, required, created_at)
ReportChecklists (id, report_id, template_id, completed, created_at)
StockReports (id, report_id, opening, out, closing, posted_at, correction_count)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token validity

### Reports
- `POST /api/reports` - Create new report
- `GET /api/reports` - List reports with filters
- `GET /api/reports/:id` - Get report details
- `PATCH /api/reports/:id` - Update draft report
- `DELETE /api/reports/:id` - Delete draft report
- `POST /api/reports/:id/submit` - Submit report
- `POST /api/reports/:id/resolve` - Resolve problem report

### Photos
- `POST /api/reports/:id/photos` - Upload photos
- `DELETE /api/reports/:id/photos/:photoId` - Delete photo

### Admin Management
- `GET/POST/PATCH/DELETE /api/users` - User management
- `GET/POST/PATCH/DELETE /api/checklists` - Checklist templates
- `GET/POST/PATCH/DELETE /api/photo-categories` - Photo categories
- `GET /api/reports/stats/summary` - Report statistics

## Business Rules

### Report Validation
- **Opening/Closing**: Must complete all required checklists and meet photo requirements
- **Problem Reports**: Must have title and description
- **Stock Reports**: Opening - Out = Closing (validation required)

### Security Requirements
- **Rate Limiting**: 300 requests/minute general, 5 requests/15min for auth
- **File Upload**: 10MB max per file, 10 files max per batch
- **Input Validation**: All inputs validated with schemas
- **Access Control**: Users can only access their own reports (except admins)

### Photo Categories
- **Dynamic per Report Type**: Different categories for Opening/Closing/Problem/Stock
- **Requirements**: Each category has min/max photo requirements
- **Ordering**: Categories displayed in specified order

## User Interface Requirements

### Design Theme: Modern Minimalist Gothic
- **Color Palette**: 
  - Primary: Deep blacks (#0a0a0a, #1a1a1a)
  - Secondary: Charcoal grays (#2d2d2d, #404040)
  - Accent: Electric purple/violet (#8b5cf6, #a855f7)
  - Text: Off-white (#f8f8f8) and light gray (#d1d5db)
  - Success: Emerald green (#10b981)
  - Warning: Amber (#f59e0b)
  - Error: Red (#ef4444)

- **Typography**:
  - Headers: Bold, clean sans-serif (Inter, Poppins, or similar)
  - Body: Readable sans-serif with good contrast
  - Monospace: For technical elements (code, IDs)

- **Visual Elements**:
  - **Minimalist Icons**: Simple, geometric icons with subtle gothic touches
  - **Subtle Shadows**: Deep, soft shadows for depth
  - **Clean Lines**: Sharp, precise borders and dividers
  - **Gothic Accents**: Subtle gothic-inspired elements (decorative borders, ornate dividers)
  - **Dark Mode**: Primary dark theme with high contrast

- **Layout Principles**:
  - **Whitespace**: Generous spacing for breathing room
  - **Grid System**: Clean, organized layouts
  - **Card-based Design**: Elevated cards with subtle borders
  - **Minimal Navigation**: Clean, unobtrusive navigation

### Mobile-First Design
- **Responsive Layout**: Optimized for mobile devices
- **Touch-Friendly**: Large buttons and touch targets
- **Bottom Navigation**: Clean, icon-based navigation
- **Form Optimization**: Mobile-optimized inputs with gothic styling

### Key Pages
- **Dashboard**: Dark, clean report overview with gothic card designs
- **Report Creation**: Minimalist forms with subtle gothic accents
- **Photo Upload**: Drag-and-drop with dark, elegant interface
- **Checklist Interface**: Clean checkbox lists with gothic progress indicators
- **Admin Panel**: Dark, professional management interface

## Technical Requirements

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: SQLite only (file-based database)
- **ORM**: Prisma for database operations
- **Authentication**: JWT with refresh token rotation
- **File Storage**: Local filesystem with organized structure
- **Validation**: Input validation with schemas
- **Security**: CORS, Helmet, rate limiting

### Frontend
- **Framework**: React with Next.js
- **Styling**: Tailwind CSS with custom gothic theme
- **Language**: TypeScript
- **State Management**: Local state with custom hooks
- **Authentication**: JWT token management
- **File Upload**: Multipart form data handling
- **UI Components**: Custom components with gothic minimalist design

### Environment Configuration
```bash
# Backend
DATABASE_URL="file:./data/dev.db"
JWT_SECRET="your-secret-key"
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=7
UPLOAD_DIR="./uploads"
PORT=5000

# Frontend
NEXT_PUBLIC_API_URL=""
BACKEND_URL="https://domain:5000"
```

## Special Features

### Draft Management
- **Auto-save**: Automatic draft saving
- **Multiple Drafts**: Multiple drafts per report type
- **Draft Selection**: Modal to choose existing draft or create new

### Audit Trail
- **Action Logging**: Track all user actions
- **Change History**: Record entity changes
- **Timestamp Tracking**: All actions timestamped

### Mobile Optimization
- **Offline Capability**: Prepared for offline functionality
- **Gesture Support**: Touch gestures ready
- **Performance**: Optimized for mobile networks

## Deployment Considerations

### Development
- **Local Development**: SQLite database
- **HTTPS Support**: SSL certificates for local development
- **Hot Reload**: Development server with watch mode

### Production (Docker + Nginx)
- **Containerization**: Docker containers for frontend and backend
- **Single HTTPS Endpoint**: Nginx reverse proxy with SSL termination
- **API Routing**: Automatic `/api` routing to backend service
- **Database**: SQLite with persistent volume mounting
- **File Storage**: Persistent volume for uploads
- **Security**: HTTPS, proper CORS, rate limiting
- **Auto-Deployment**: Docker Compose with health checks
- **Monitoring**: Health checks and logging

#### Docker Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://yourdomain.com/api
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/prod.db
      - JWT_SECRET=${JWT_SECRET}
      - ACCESS_TOKEN_TTL_MIN=15
      - REFRESH_TOKEN_TTL_DAYS=7
      - UPLOAD_DIR=./uploads
      - PORT=5000
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  data:
  uploads:
```

#### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # API routes to backend
        location /api {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # All other routes to frontend
        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

#### Dockerfile Configuration

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache sqlite

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/ .

# Create necessary directories
RUN mkdir -p data uploads

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "server.js"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
```

#### Auto-Deployment Setup

**Deploy Script:**
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# Pull latest changes
git pull origin main

# Build and start services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 30

# Check health
docker-compose ps

echo "Deployment completed successfully!"
```

**Environment Configuration:**
```bash
# .env.production
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key
DATABASE_URL=file:./data/prod.db
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=7
UPLOAD_DIR=./uploads
PORT=5000
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

#### SSL Certificate Setup
```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
sudo chown -R $USER:$USER ./ssl/
```

#### Production Deployment Commands
```bash
# Initial setup
docker-compose up -d

# Auto-deployment
./deploy.sh

# View logs
docker-compose logs -f

# Scale services (if needed)
docker-compose up -d --scale backend=2

# Backup database
docker-compose exec backend cp /app/data/prod.db /app/backups/backup-$(date +%Y%m%d).db
```

## Implementation Notes

### Database Setup
- Use SQLite with Prisma ORM for all environments
- Database file location: `./data/dev.db`
- Automatic migrations on startup
- Seed data for initial setup

### Frontend Styling
- Implement custom Tailwind CSS theme with gothic color palette
- Create reusable components with consistent gothic minimalist design
- Ensure high contrast for accessibility
- Mobile-first responsive design

### Security Implementation
- JWT tokens with 15-minute access, 7-day refresh
- Password hashing with bcrypt
- File upload validation and sanitization
- Rate limiting on all endpoints
- CORS configuration for production

### File Management
- Organized directory structure: `uploads/reports/{reportId}/`
- File validation: MIME type, size, format checks
- Checksum generation for integrity
- Automatic cleanup of orphaned files

This specification provides a complete technical foundation for building a modern, minimalist gothic reporting application using SQLite as the database solution.
