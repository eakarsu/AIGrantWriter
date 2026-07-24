#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ -d backend ]]; then API_DIR=backend; UI_DIR=frontend; else API_DIR=server; UI_DIR=client; fi

load_env() {
  [[ -f .env ]] || { echo "Create .env from .env.example; no defaults are generated." >&2; return 1; }
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
}

check() {
  command -v node >/dev/null || { echo "node is required" >&2; return 1; }
  command -v npm >/dev/null || { echo "npm is required" >&2; return 1; }
  load_env
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

migrate_files() {
  [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]] ||
    { echo "Set ALLOW_SCHEMA_MIGRATION=true for this explicit operation." >&2; return 1; }
  : "${DATABASE_URL:?Set DATABASE_URL in .env for the migration process.}"
  command -v psql >/dev/null || { echo "psql is required" >&2; return 1; }
  for migration in "$API_DIR"/migrations/*.sql; do
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  done
}

migrate() {
  check
  migrate_files
}

start_services() {
  check
  [[ -d "$API_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] ||
    { echo "Dependencies are absent. Run locked installs explicitly before startup." >&2; return 1; }

  api_port="${BACKEND_PORT:-${PORT:-3001}}"
  ui_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
  [[ "$api_port" != "$ui_port" ]] || { echo "Backend and frontend ports must be different." >&2; return 1; }
  for assigned_port in "$api_port" "$ui_port"; do
    if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $assigned_port is already in use." >&2
      return 1
    fi
  done

  if [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]]; then
    migrate_files
    node "$API_DIR/create-admin.js"
  fi

  PORT="$api_port" BACKEND_PORT="$api_port" npm --prefix "$API_DIR" start &
  api_pid=$!
  if node -e "const p=require('./$UI_DIR/package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"; then
    PORT="$ui_port" BACKEND_PORT="$api_port" npm --prefix "$UI_DIR" run dev -- --host "${HOST:-127.0.0.1}" --port "$ui_port" --strictPort &
  else
    BROWSER=none HOST="${HOST:-127.0.0.1}" PORT="$ui_port" REACT_APP_API_ORIGIN="http://127.0.0.1:$api_port" REACT_APP_API_URL="http://127.0.0.1:$api_port/api" npm --prefix "$UI_DIR" start &
  fi
  ui_pid=$!

  cleanup() {
    kill "$api_pid" "$ui_pid" 2>/dev/null || true
    wait "$api_pid" "$ui_pid" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM
  wait "$api_pid" "$ui_pid"
}

case "${1:-start}" in
  check) check ;;
  migrate) migrate ;;
  start) start_services ;;
  *) echo "Usage: ./start.sh [check|migrate|start]" >&2; exit 64 ;;
esac
