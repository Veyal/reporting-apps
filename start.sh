#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🚀 Starting Business Reporting Application..."

# Ensure workspace dependencies are installed
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing workspace dependencies..."
  npm install
fi

# Build the Next.js frontend once so it can be served by the backend
echo "🧱 Building frontend bundle..."
npm run build:frontend

# Start the unified server (Express API + Next.js frontend) on a single port
echo "🌐 Starting unified server on port ${PORT:-5001}..."
NODE_ENV="${NODE_ENV:-production}" PORT="${PORT:-5001}" node backend/server.js
