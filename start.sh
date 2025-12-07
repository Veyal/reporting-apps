#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENABLE_HTTPS="${ENABLE_HTTPS:-1}"
CERT_DIR="${CERT_DIR:-$ROOT_DIR/certs}"
DEFAULT_CERT_FILE="$CERT_DIR/server.crt"
DEFAULT_KEY_FILE="$CERT_DIR/server.key"
SERVER_PROTOCOL="http"

echo "🚀 Starting Business Reporting Application..."

# Load .env file if it exists
load_env() {
  if [[ -f "$ROOT_DIR/.env" ]]; then
    echo "📄 Loading environment from .env"
    set -a
    source "$ROOT_DIR/.env"
    set +a
  else
    echo "⚠️  No .env file found. Copy .env.example to .env and configure it."
    echo "   Run: cp .env.example .env"
    exit 1
  fi
}

ensure_dependencies() {
  if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing workspace dependencies..."
    npm install
  fi
}

# Ensure database exists and is initialized
ensure_database() {
  local db_path="${DATABASE_URL#file:}"
  local db_dir=$(dirname "$db_path")
  
  # Create data directory if needed
  mkdir -p "$db_dir"
  
  if [[ ! -f "$db_path" ]]; then
    echo "📊 Initializing database..."
    cd backend
    npx prisma db push
    npx prisma db seed
    cd "$ROOT_DIR"
  else
    echo "📊 Database exists at $db_path"
  fi
}

generate_dev_certificate() {
  if ! command -v openssl >/dev/null 2>&1; then
    echo "❌ OpenSSL is required to generate a self-signed certificate."
    echo "   Please install OpenSSL or provide TLS_CERT_FILE/TLS_KEY_FILE."
    exit 1
  fi

  mkdir -p "$CERT_DIR"
  local openssl_config
  openssl_config="$(mktemp)"

  cat >"$openssl_config" <<'EOF'
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = localhost

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF

  echo "🔐 Generating self-signed TLS certificate (localhost)..."
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$DEFAULT_KEY_FILE" \
    -out "$DEFAULT_CERT_FILE" \
    -days 365 \
    -extensions req_ext \
    -config "$openssl_config" >/dev/null 2>&1

  rm -f "$openssl_config"
  chmod 600 "$DEFAULT_KEY_FILE"
  echo "✅ Self-signed certificate created at $DEFAULT_CERT_FILE"
}

prepare_https() {
  if [[ "${ENABLE_HTTPS}" == "0" ]]; then
    echo "⚠️  ENABLE_HTTPS=0, skipping TLS setup (server will use HTTP)."
    return
  fi

  local cert_file="${TLS_CERT_FILE:-$DEFAULT_CERT_FILE}"
  local key_file="${TLS_KEY_FILE:-$DEFAULT_KEY_FILE}"

  if [[ ! -f "$cert_file" || ! -f "$key_file" ]]; then
    generate_dev_certificate
    cert_file="$DEFAULT_CERT_FILE"
    key_file="$DEFAULT_KEY_FILE"
  fi

  export TLS_CERT_FILE="$cert_file"
  export TLS_KEY_FILE="$key_file"
  SERVER_PROTOCOL="https"
  echo "🔒 HTTPS enabled (cert: $TLS_CERT_FILE, key: $TLS_KEY_FILE)"
}

build_frontend() {
  echo "🧱 Building frontend bundle..."
  npm run build:frontend
}

# Execute the startup sequence
load_env
ensure_dependencies
ensure_database
prepare_https
build_frontend

SERVER_PORT="${PORT:-5001}"
echo "🌐 Starting unified server on ${SERVER_PROTOCOL}://localhost:${SERVER_PORT} ..."
NODE_ENV="${NODE_ENV:-production}" PORT="${SERVER_PORT}" node backend/server.js

