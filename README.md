# Business Reporting Application

A mobile-optimized web application for business reporting and management with a modern minimalist gothic design. Built with Next.js, Node.js, Express, and SQLite.

## Features

- **Multi-Type Report System**: Opening, Closing, Problem, and Stock reports
- **User Management**: Admin and User roles with JWT authentication
- **Photo Management**: Category-based photo uploads with validation
- **Checklist System**: Template-based checklists for Opening/Closing reports
- **Mobile-First Design**: Responsive gothic minimalist interface
- **Real-time Updates**: Live status tracking and notifications

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- Tailwind CSS with custom gothic theme
- React Hook Form for form management
- Axios for API communication
- Lucide React for icons

### Backend
- Node.js with Express.js
- SQLite database with Prisma ORM
- JWT authentication with refresh tokens
- Multer for file uploads
- Joi for input validation

### Deployment
- Docker containers
- Nginx reverse proxy
- SSL/TLS support
- Health checks and monitoring

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for production deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd business-reporting-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp config.env.example config.env
   # Edit config.env with your settings
   ```

4. **Initialize database**
   ```bash
   cd backend
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Backend API on http://localhost:5000
   - Frontend on http://localhost:3000

### Demo Credentials

- **Admin**: username=`admin`, password=`Admin123!`
- **User**: username=`user`, password=`User123!`

## Project Structure

```
business-reporting-app/
├── backend/                 # Node.js/Express API
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── prisma/            # Database schema and migrations
│   └── server.js          # Main server file
├── frontend/               # Next.js React app
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   └── lib/               # Utility functions
├── docker-compose.yml     # Docker services configuration
├── Dockerfile.backend     # Backend container
├── Dockerfile.frontend    # Frontend container
└── nginx.conf            # Nginx configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token validity

### Reports
- `GET /api/reports` - List reports with filters
- `POST /api/reports` - Create new report
- `GET /api/reports/:id` - Get report details
- `PATCH /api/reports/:id` - Update draft report
- `DELETE /api/reports/:id` - Delete draft report
- `POST /api/reports/:id/submit` - Submit report
- `POST /api/reports/:id/resolve` - Resolve problem report

### Photos
- `POST /api/photos/:id` - Upload photos
- `GET /api/photos/:id` - Get report photos
- `DELETE /api/photos/:id/:photoId` - Delete photo
- `GET /api/photos/categories/:reportType` - Get photo categories

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats/summary` - Get statistics

## Production Deployment

### Using Docker Compose

1. **Set up environment variables**
   ```bash
   export JWT_SECRET="your-super-secure-jwt-secret"
   ```

2. **Build and start services**
   ```bash
   docker-compose up -d
   ```

3. **Set up SSL certificates**
   ```bash
   # Using Let's Encrypt
   sudo certbot certonly --standalone -d yourdomain.com
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
   ```

4. **Update nginx.conf**
   - Replace `yourdomain.com` with your actual domain
   - Update SSL certificate paths if needed

### Manual Deployment

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start backend**
   ```bash
   cd backend
   npm start
   ```

3. **Configure reverse proxy**
   - Set up Nginx or similar
   - Configure SSL certificates
   - Set up rate limiting

## Configuration

### Environment Variables

#### Backend (.env)
```bash
DATABASE_URL="file:./data/dev.db"
JWT_SECRET="your-secret-key"
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=7
UPLOAD_DIR="./uploads"
PORT=5000
NODE_ENV=development
```

#### Frontend
```bash
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

## Database Schema

The application uses SQLite with the following main tables:

- **Users**: User accounts and authentication
- **Reports**: Report data and metadata
- **ReportPhotos**: Photo attachments with categories
- **PhotoCategories**: Configurable photo categories
- **ChecklistTemplates**: Checklist item templates
- **ReportChecklists**: Report-specific checklist items
- **StockReports**: Stock count data

## Security Features

- JWT authentication with refresh token rotation
- Password complexity requirements
- Rate limiting on all endpoints
- File upload validation and sanitization
- CORS configuration
- Security headers via Helmet
- SQL injection protection via Prisma

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
