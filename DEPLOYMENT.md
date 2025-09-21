# Production Deployment Guide

## Overview
This application uses Docker with Traefik as a reverse proxy for production deployment. The setup includes:
- **Traefik**: Reverse proxy with automatic SSL certificates (port 443)
- **Frontend**: Next.js application (proxied through Traefik)
- **Backend**: Express.js API with Prisma/SQLite (proxied through Traefik at /api)

## Prerequisites
- Docker and Docker Compose installed
- Domain name configured (DNS pointing to server)
- Ports 80, 443, and 8080 available

## Deployment Architecture

```
Internet (HTTPS:443)
    ↓
[Traefik Reverse Proxy]
    ├── / → Frontend (Next.js on port 3000)
    └── /api → Backend (Express on port 5000/api)
```

## Quick Start

### 1. Configure Environment
Edit `.env.docker` and update:
```bash
DOMAIN=your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
CORS_ORIGIN=https://your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
JWT_SECRET=generate-secure-secret-here  # Use: openssl rand -base64 32
```

### 2. Update Domain in Docker Compose
Edit `docker-compose.yml` and replace `do-dev.veyal.org` with your domain:
- Line 52: Frontend rule
- Line 81: Backend rule

### 3. Deploy
```bash
# Make start script executable
chmod +x docker-start.sh

# Start all services
sudo ./docker-start.sh
```

The script will:
- Build all Docker images
- Start Traefik, frontend, and backend services
- Automatically initialize the database on first run
- Create default admin user (admin/admin123)

## File Structure

```
reporting-apps/
├── docker-compose.yml       # Main orchestration file
├── docker-start.sh          # Deployment script
├── .env.docker             # Environment configuration
├── frontend/
│   ├── Dockerfile          # Frontend container config
│   └── ...
├── backend/
│   ├── Dockerfile          # Backend container config
│   ├── docker-entrypoint.sh # Database initialization script
│   ├── healthcheck.js      # Health check endpoint
│   └── ...
└── traefik/
    ├── traefik.yml         # Traefik static configuration
    ├── dynamic.yml         # Traefik dynamic routes
    └── acme.json          # SSL certificates (auto-generated)
```

## Key Features

### Automatic Database Initialization
- Database is automatically created and seeded on first run
- Uses SQLite with persistent storage inside container
- Prisma migrations applied automatically

### SSL/HTTPS
- Traefik automatically obtains Let's Encrypt certificates
- HTTP automatically redirects to HTTPS
- Certificates auto-renew

### Health Checks
- Backend has health check endpoint at `/health`
- Docker monitors container health
- Auto-restart on failure

## Management Commands

### View Logs
```bash
# All services
sudo docker-compose logs -f

# Specific service
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
sudo docker-compose logs -f traefik
```

### Restart Services
```bash
# All services
sudo docker-compose restart

# Specific service
sudo docker-compose restart backend
```

### Stop Services
```bash
sudo docker-compose down
```

### Rebuild After Code Changes
```bash
# Backend changes
sudo docker-compose --env-file .env.docker build backend
sudo docker-compose up -d backend

# Frontend changes
sudo docker-compose --env-file .env.docker build frontend
sudo docker-compose up -d frontend
```

### Database Management
```bash
# Access database shell
sudo docker-compose exec backend sqlite3 /app/data/prod.db

# Run migrations manually
sudo docker-compose exec backend npx prisma db push

# Seed database
sudo docker-compose exec backend npm run db:seed
```

## Access Points

- **Frontend**: https://your-domain.com
- **API**: https://your-domain.com/api
- **API Health**: https://your-domain.com/api/health
- **Traefik Dashboard**: http://your-domain.com:8080

## Security Notes

1. **Change Default Passwords**:
   - Update admin password after first login
   - Generate strong JWT_SECRET

2. **Firewall Configuration**:
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 8080/tcp  # Optional: Traefik dashboard
   ```

3. **Traefik Dashboard**:
   - Consider adding authentication to Traefik dashboard
   - Or disable it in production by removing port 8080 from docker-compose.yml

## Troubleshooting

### Database Issues
If database initialization fails:
```bash
# Stop backend
sudo docker-compose stop backend

# Remove container
sudo docker rm reporting-backend

# Rebuild and start
sudo docker-compose --env-file .env.docker build --no-cache backend
sudo docker-compose --env-file .env.docker up -d backend
```

### SSL Certificate Issues
If certificates fail to generate:
1. Ensure domain DNS is properly configured
2. Check Traefik logs: `sudo docker-compose logs traefik`
3. Verify acme.json permissions: `sudo chmod 600 traefik/acme.json`

### Container Won't Start
Check logs for specific service:
```bash
sudo docker-compose logs [service-name]
```

## Backup & Restore

### Backup Database
```bash
# Create backup
sudo docker-compose exec backend sqlite3 /app/data/prod.db ".backup /app/data/backup.db"

# Copy to host
sudo docker cp reporting-backend:/app/data/backup.db ./backup-$(date +%Y%m%d).db
```

### Backup Uploaded Files
```bash
# Create tar archive
sudo docker-compose exec backend tar -czf /tmp/uploads.tar.gz -C /app uploads

# Copy to host
sudo docker cp reporting-backend:/tmp/uploads.tar.gz ./uploads-backup-$(date +%Y%m%d).tar.gz
```

## Environment Variables

Key environment variables in `.env.docker`:

| Variable | Description | Example |
|----------|-------------|---------|
| DOMAIN | Your domain name | example.com |
| NEXT_PUBLIC_API_URL | Frontend API endpoint | https://example.com/api |
| DATABASE_URL | Database file path | file:/app/data/prod.db |
| JWT_SECRET | Secret for JWT tokens | (generate with openssl) |
| CORS_ORIGIN | Allowed CORS origin | https://example.com |
| LETSENCRYPT_EMAIL | Email for SSL certs | admin@example.com |

## Performance Optimization

1. **Enable Docker BuildKit**:
   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

2. **Use Docker Build Cache**:
   ```bash
   export COMPOSE_BAKE=true
   ```

3. **Resource Limits** (add to docker-compose.yml):
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

## Monitoring

Consider adding:
- Prometheus + Grafana for metrics
- ELK stack for centralized logging
- Uptime monitoring service

## Updates & Maintenance

1. **Update Dependencies**:
   ```bash
   # Update Node packages
   cd frontend && npm update
   cd ../backend && npm update
   ```

2. **Update Docker Images**:
   ```bash
   docker-compose pull
   docker-compose build --no-cache
   ```

3. **Apply Database Migrations**:
   ```bash
   sudo docker-compose exec backend npx prisma migrate deploy
   ```

## Support

For issues or questions:
- Check application logs first
- Verify all environment variables are set correctly
- Ensure domain DNS is properly configured
- Check Docker and Docker Compose versions are up to date