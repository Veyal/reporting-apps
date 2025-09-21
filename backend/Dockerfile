# Backend Dockerfile for Node.js Express application
FROM node:18-alpine AS base

# Install dependencies and tools
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    openssl \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy application code
COPY . .

# Generate Prisma client first (needs to be done as root)
RUN npx prisma generate

# Set up health check script
COPY healthcheck.js ./
RUN chmod +x healthcheck.js

# Copy and set up entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create necessary directories with correct permissions
# Must be done as root, then change ownership
RUN mkdir -p /app/data /app/uploads && \
    chown -R nodejs:nodejs /app/data /app/uploads && \
    chmod 755 /app/data /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Use entrypoint script to handle database initialization
ENTRYPOINT ["./docker-entrypoint.sh"]