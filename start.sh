#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ -d backend ]]; then
  API_DIR=backend
  UI_DIR=frontend
  MIGRATION=backend/migrations/001_governed_workflows.sql
else
  API_DIR=server
  UI_DIR=client
  MIGRATION=server/migrations/001_governed_workflows.sql
fi

check() {
  command -v node >/dev/null || { echo "node is required" >&2; return 1; }
  command -v npm >/dev/null || { echo "npm is required" >&2; return 1; }
  [[ -f .env ]] || { echo "Create .env from .env.example; no defaults are generated." >&2; return 1; }
  grep -Eq '^JWT_SECRET=.{32,}$' .env ||
    { echo "JWT_SECRET must be set to at least 32 characters." >&2; return 1; }
  if ! grep -Eq '^DATABASE_URL=.+|^DB_HOST=.+' .env; then
    echo "DATABASE_URL or explicit DB_* settings are required." >&2
    return 1
  fi
  if grep -Eqi 'password123|your_.*key|change[_-]?me|placeholder' .env; then
    echo "Refusing placeholder or demo credentials." >&2
    return 1
  fi
  echo "Configuration shape is valid. External connectivity and credentials were not verified."
}

migrate() {
  check
  [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]] ||
    { echo "Set ALLOW_SCHEMA_MIGRATION=true for this explicit operation." >&2; return 1; }
  : "${DATABASE_URL:?Export DATABASE_URL for the migration process.}"
  command -v psql >/dev/null || { echo "psql is required" >&2; return 1; }
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION"
}

start_services() {
  check
  [[ -d "$API_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] ||
    { echo "Dependencies are absent. Run locked installs explicitly before startup." >&2; return 1; }

  npm --prefix "$API_DIR" start &
  api_pid=$!
  if node -e "const p=require('./$UI_DIR/package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"; then
    npm --prefix "$UI_DIR" run dev &
  else
    BROWSER=none npm --prefix "$UI_DIR" start &
  fi
  ui_pid=$!

  cleanup() {
    kill "$api_pid" "$ui_pid" 2>/dev/null || true
    wait "$api_pid" "$ui_pid" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM
  wait "$api_pid" "$ui_pid"
}

case "${1:-check}" in
  check) check ;;
  migrate) migrate ;;
  start) start_services ;;
  *) echo "Usage: ./start.sh [check|migrate|start]" >&2; exit 64 ;;
esac
