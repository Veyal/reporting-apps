#!/bin/bash

# Docker startup script for Business Reporting Application
# This script sets up and starts the application with Traefik reverse proxy

set -e

echo "🚀 Starting Business Reporting Application with Traefik"
echo "=================================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "❌ .env.docker file not found. Please create it from .env.example"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.docker | xargs)

echo "📦 Building and starting services..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans
# Force remove any containers with the same name
docker rm -f reporting-backend reporting-frontend traefik 2>/dev/null || true

# Build and start services
echo "🔨 Building services..."
docker-compose --env-file .env.docker build --no-cache

echo "🚀 Starting services..."
docker-compose --env-file .env.docker up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check Traefik
if curl -s -f http://localhost:8080/api/entrypoints > /dev/null; then
    echo "✅ Traefik dashboard is accessible at http://localhost:8080"
else
    echo "⚠️  Traefik dashboard might not be ready yet"
fi

# Check backend health
if docker-compose exec -T backend curl -s -f http://localhost:5000/health > /dev/null; then
    echo "✅ Backend service is healthy"
else
    echo "⚠️  Backend service might not be ready yet"
fi

echo ""
echo "🎉 Application started successfully!"
echo "=================================================="
echo "🌐 Frontend: https://localhost"
echo "🔧 Backend API: https://localhost/api"
echo "📊 Traefik Dashboard: http://localhost:8080"
echo "=================================================="
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop the application:"
echo "   docker-compose down"
echo ""
echo "🔄 To restart services:"
echo "   docker-compose restart"
echo ""
echo "⚠️  Note: If this is your first run, you may need to:"
echo "   1. Set up the database: docker-compose exec backend npm run db:push"
echo "   2. Seed initial data: docker-compose exec backend npm run db:seed"
echo ""