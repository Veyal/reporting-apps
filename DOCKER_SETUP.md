# Docker Setup and Deployment Guide

This guide explains how to deploy the Business Reporting Application using Docker with nginx reverse proxy.

## 🚀 Quick Start

### Development (Local)
```bash
# Copy environment variables
cp .env.example .env

# Start all services on port 8443
docker-compose up

# Or run in detached mode
docker-compose up -d
```

Access the application at: http://localhost:8443

### Production (VPS)
```bash
# Copy and configure environment variables
cp .env.example .env
# Edit .env with your production values

# Place SSL certificates in ssl/ directory
# - ssl/cert.pem
# - ssl/key.pem

# Start production services on port 443
docker-compose -f docker-compose.prod.yml up -d
```

Access the application at: https://yourdomain.com

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- SSL certificates (for production)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required Variables
```env
# Change these for production!
DOMAIN=yourdomain.com
JWT_SECRET=your-super-secure-jwt-secret
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

#### SSL Certificates
Place your SSL certificates in the `ssl/` directory:
- `ssl/cert.pem` - SSL certificate
- `ssl/key.pem` - Private key

## 🏗️ Architecture

The Docker setup includes:

- **nginx**: Reverse proxy (port 8443 dev / 443 prod)
- **frontend**: Next.js application
- **backend**: Node.js Express API
- **backup**: Automated database backups (production only)

### Service Communication
```
Internet → nginx → frontend (port 3000)
              ↘ → backend (port 5000) [/api/* routes]
```

## 📁 Directory Structure

```
.
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── nginx.conf                  # Development nginx config
├── nginx.prod.conf             # Production nginx config
├── Dockerfile.frontend         # Frontend multi-stage build
├── Dockerfile.backend          # Backend multi-stage build
├── .env.example               # Environment variables template
├── ssl/                       # SSL certificates (production)
├── logs/                      # Application logs
├── data/                      # SQLite database
├── uploads/                   # File uploads
└── backups/                   # Database backups
```

## 🛠️ Available Commands

### Development
```bash
# Start all services
docker-compose up

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v
```

### Production
```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

### Maintenance
```bash
# Database backup (manual)
docker-compose exec backend cp /app/data/prod.db /app/backups/manual-backup-$(date +%Y%m%d).db

# View service status
docker-compose ps

# Access backend shell
docker-compose exec backend sh

# Access frontend shell
docker-compose exec frontend sh

# View nginx config
docker-compose exec nginx cat /etc/nginx/nginx.conf
```

## 🔍 Monitoring and Health Checks

### Health Check Endpoints
- Main application: `http://localhost:8443/health`
- nginx status: `http://localhost:8443/nginx-status` (restricted)
- Backend API: `http://localhost:8443/api/health`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx
docker-compose logs -f backend
docker-compose logs -f frontend

# nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## 🔒 Security Features

### Development
- Basic CORS configuration
- Rate limiting (relaxed)
- Health checks

### Production
- SSL/TLS encryption
- Security headers (HSTS, CSP, etc.)
- Strict rate limiting
- Attack pattern blocking
- User agent filtering
- OCSP stapling

## 🚀 Performance Optimizations

### Frontend
- Multi-stage builds
- Standalone output mode
- Static asset caching
- Gzip compression
- Image optimization

### Backend
- Production-only dependencies
- Health checks
- Connection pooling
- Request buffering

### nginx
- Upstream load balancing
- Gzip compression
- Static file caching
- Connection keep-alive

## 📊 Database and Backups

### SQLite Database
- Development: `data/dev.db`
- Production: `data/prod.db`

### Automatic Backups (Production)
- Daily backups at 2 AM
- 7-day retention policy
- Stored in `backups/` directory

### Manual Backup
```bash
# Create manual backup
docker-compose exec backend cp /app/data/prod.db /app/backups/manual-$(date +%Y%m%d-%H%M%S).db

# Restore from backup
docker-compose exec backend cp /app/backups/backup-file.db /app/data/prod.db
docker-compose restart backend
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8443  # or :443

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if system nginx is running
```

#### SSL Certificate Issues
```bash
# Verify certificate files exist
ls -la ssl/

# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER data/ uploads/ logs/
chmod 755 data/ uploads/ logs/
```

#### Database Connection Issues
```bash
# Check if database file exists
docker-compose exec backend ls -la /app/data/

# Reset database
docker-compose down
docker volume rm $(docker volume ls -q)
docker-compose up
```

### Debug Mode

Enable debug logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

Then restart services:
```bash
docker-compose down
docker-compose up
```

## 🔄 Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### Docker Image Updates
```bash
# Update base images
docker-compose pull
docker-compose up -d
```

### Security Updates
```bash
# Update all packages in containers
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Support

For issues and questions:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: Review `.env` file
3. Test connectivity: `curl http://localhost:8443/health`
4. Check Docker status: `docker-compose ps`

## 🔐 Production Checklist

Before deploying to production:

- [ ] Copy `.env.example` to `.env`
- [ ] Set strong `JWT_SECRET`
- [ ] Configure correct `DOMAIN`
- [ ] Place SSL certificates in `ssl/` directory
- [ ] Update `CORS_ORIGIN` for your domain
- [ ] Test SSL configuration
- [ ] Verify backup schedule
- [ ] Configure monitoring
- [ ] Set up log rotation
- [ ] Test disaster recovery procedures