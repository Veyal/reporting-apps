#!/bin/sh

# Docker entrypoint script for backend

# Always ensure the database is properly initialized
echo "Checking database..."

# Use absolute paths
DB_PATH="/app/data/prod.db"
DB_DIR="/app/data"

# Remove any empty or corrupt database file
if [ -f "$DB_PATH" ] && [ ! -s "$DB_PATH" ]; then
  echo "Removing empty database file..."
  rm -f "$DB_PATH"
fi

# Check if database needs initialization
if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
  echo "Initializing database..."

  # Ensure data directory exists with correct permissions
  if [ ! -d "$DB_DIR" ]; then
    echo "ERROR: Data directory does not exist!"
    exit 1
  fi

  # Create an empty database file first
  touch "$DB_PATH"

  # Run Prisma migrations to create the database
  echo "Running database migrations..."
  DATABASE_URL="file:/app/data/prod.db" npx prisma db push --skip-generate

  # Check if database was created successfully
  if [ -f "$DB_PATH" ] && [ -s "$DB_PATH" ]; then
    echo "Database created successfully!"

    # Seed the database
    echo "Seeding database with initial data..."
    DATABASE_URL="file:/app/data/prod.db" npm run db:seed

    echo "Database initialization complete!"
  else
    echo "ERROR: Failed to create database!"
    exit 1
  fi
else
  echo "Database exists and is valid."
fi

# Start the application
echo "Starting application..."
DATABASE_URL="file:/app/data/prod.db" exec npm start