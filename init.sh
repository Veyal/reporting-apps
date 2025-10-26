#!/usr/bin/env bash

# Automated project bootstrap for the Business Reporting application.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FORCE_INSTALL=0
SKIP_DB=0
SKIP_ENV=0

usage() {
  cat <<'EOF'
Usage: ./init.sh [options]

Options:
  --force-install   Reinstall npm dependencies even if node_modules exists
  --skip-db         Skip Prisma generate/push/seed steps
  --skip-env        Skip environment file bootstrap
  -h, --help        Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-install)
      FORCE_INSTALL=1
      shift
      ;;
    --skip-db)
      SKIP_DB=1
      shift
      ;;
    --skip-env)
      SKIP_ENV=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

log_step() {
  printf "\n==> %s\n" "$1"
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required but was not found in PATH."
    exit 1
  fi

  local version major
  version="$(node --version | sed 's/v//')"
  major="${version%%.*}"

  if [[ "$major" -lt 18 ]]; then
    echo "Node.js 18+ is required (found v$version)."
    exit 1
  fi
}

copy_env() {
  local source_file="$1"
  local target_file="$2"

  if [[ -f "$target_file" ]]; then
    echo "✔ $target_file already exists"
    return
  fi

  if [[ ! -f "$source_file" ]]; then
    echo "⚠ Skipping $target_file (missing template $source_file)"
    return
  fi

  cp "$source_file" "$target_file"
  echo "➕ Created $target_file from template"
}

bootstrap_env_files() {
  log_step "Checking environment files"
  copy_env ".env.example" ".env"
  copy_env "backend/.env.example" "backend/.env"
  copy_env "frontend/.env.example" "frontend/.env.local"
}

install_dependencies() {
  log_step "Installing npm dependencies"
  if [[ $FORCE_INSTALL -eq 1 ]]; then
    npm install
    return
  fi

  if [[ -d "node_modules" ]]; then
    echo "✔ Dependencies already installed (use --force-install to reinstall)"
  else
    npm install
  fi
}

prepare_database() {
  log_step "Preparing Prisma database"
  npm run --workspace backend db:generate
  npm run --workspace backend db:push
  npm run --workspace backend db:seed
}

main() {
  ensure_node

  if [[ $SKIP_ENV -eq 0 ]]; then
    bootstrap_env_files
  else
    echo "Skipping environment file bootstrap (--skip-env)"
  fi

  install_dependencies

  if [[ $SKIP_DB -eq 0 ]]; then
    prepare_database
  else
    echo "Skipping database setup (--skip-db)"
  fi

  log_step "All done!"
  echo "Next steps:"
  echo "  1. Review the .env files and update secrets if needed."
  echo "  2. Start the dev servers with: npm run dev"
}

main "$@"
