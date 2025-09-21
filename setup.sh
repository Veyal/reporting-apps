#!/bin/bash

# =============================================================================
# Business Reporting Application Setup Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Docker version
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Function to setup environment file
setup_env() {
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env file with your configuration before starting services"
    else
        print_info ".env file already exists"
    fi
}

# Function to create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    mkdir -p logs/nginx data uploads backups ssl
    print_success "Directories created"
}

# Function to generate JWT secret
generate_jwt_secret() {
    if command_exists openssl; then
        JWT_SECRET=$(openssl rand -base64 32)
        print_info "Generated JWT secret: $JWT_SECRET"
        print_warning "Please update JWT_SECRET in .env file with the generated secret"
    else
        print_warning "OpenSSL not found. Please generate a secure JWT secret manually"
    fi
}

# Function to start development environment
start_dev() {
    print_info "Starting development environment..."
    docker-compose up -d
    print_success "Development environment started on http://localhost:8443"
}

# Function to start production environment
start_prod() {
    print_info "Starting production environment..."

    # Check for SSL certificates
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        print_error "SSL certificates not found in ssl/ directory"
        print_info "Please place your SSL certificates as:"
        print_info "  - ssl/cert.pem (certificate file)"
        print_info "  - ssl/key.pem (private key file)"
        exit 1
    fi

    docker-compose -f docker-compose.prod.yml up -d
    print_success "Production environment started on https://your-domain"
}

# Function to show logs
show_logs() {
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Function to stop services
stop_services() {
    if [ "$1" = "prod" ]; then
        print_info "Stopping production services..."
        docker-compose -f docker-compose.prod.yml down
    else
        print_info "Stopping development services..."
        docker-compose down
    fi
    print_success "Services stopped"
}

# Function to show status
show_status() {
    print_info "Service status:"
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml ps
    else
        docker-compose ps
    fi
}

# Function to backup database
backup_db() {
    BACKUP_NAME="manual-backup-$(date +%Y%m%d-%H%M%S).db"
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml exec backend cp /app/data/prod.db /app/backups/$BACKUP_NAME
    else
        docker-compose exec backend cp /app/data/dev.db /app/backups/$BACKUP_NAME
    fi
    print_success "Database backed up as $BACKUP_NAME"
}

# Function to show help
show_help() {
    echo "Business Reporting Application Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup           - Initial setup (create directories, .env file)"
    echo "  dev             - Start development environment"
    echo "  prod            - Start production environment"
    echo "  logs [prod]     - Show logs (add 'prod' for production)"
    echo "  stop [prod]     - Stop services (add 'prod' for production)"
    echo "  status [prod]   - Show service status"
    echo "  backup [prod]   - Backup database"
    echo "  restart [prod]  - Restart services"
    echo "  update [prod]   - Update and restart services"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup        # Initial setup"
    echo "  $0 dev          # Start development"
    echo "  $0 prod         # Start production"
    echo "  $0 logs         # Show development logs"
    echo "  $0 logs prod    # Show production logs"
    echo "  $0 stop prod    # Stop production"
    echo ""
}

# Main script logic
case "$1" in
    setup)
        check_docker
        create_directories
        setup_env
        generate_jwt_secret
        print_success "Setup completed!"
        print_info "Next steps:"
        print_info "1. Edit .env file with your configuration"
        print_info "2. Run '$0 dev' to start development environment"
        print_info "3. Or run '$0 prod' for production (after SSL setup)"
        ;;
    dev)
        check_docker
        start_dev
        ;;
    prod)
        check_docker
        start_prod
        ;;
    logs)
        show_logs $2
        ;;
    stop)
        stop_services $2
        ;;
    status)
        show_status $2
        ;;
    backup)
        backup_db $2
        ;;
    restart)
        stop_services $2
        if [ "$2" = "prod" ]; then
            start_prod
        else
            start_dev
        fi
        ;;
    update)
        print_info "Updating services..."
        stop_services $2
        if [ "$2" = "prod" ]; then
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml build --no-cache
            start_prod
        else
            docker-compose pull
            docker-compose build --no-cache
            start_dev
        fi
        print_success "Services updated and restarted"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac