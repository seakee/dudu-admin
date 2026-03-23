#!/usr/bin/env bash

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { printf "${BLUE}%-9s${NC} %s\n" "[INFO]" "$1"; }
print_success() { printf "${GREEN}%-9s${NC} %s\n" "[SUCCESS]" "$1"; }
print_warning() { printf "${YELLOW}%-9s${NC} %s\n" "[WARNING]" "$1"; }
print_error() { printf "${RED}%-9s${NC} %s\n" "[ERROR]" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DEFAULT_BACKEND_ROOT="/Users/seakee/WorkSpace/Golang/src/github.com/seakee/dudu-admin-api"
BACKEND_ROOT="$DEFAULT_BACKEND_ROOT"
BACKEND_CONFIG=""
FRONTEND_ENV_FILE="$PROJECT_ROOT/.env.development"

EXPECTED_BACKEND_PORT="8080"
EXPECTED_FRONTEND_ORIGIN="http://localhost:3000"
EXPECTED_FRONTEND_CALLBACK_PATH="/auth/callback"

show_usage() {
  cat <<'EOF'
Usage:
  ./scripts/check-backend-linkage.sh [options]

Options:
  --backend-root <path>     Backend repository root
  --backend-config <path>   Backend config file path
  --frontend-env <path>     Frontend env overlay file (default: .env.development)
  -h, --help                Show help
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    print_error "Missing required command: $1"
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  shift
  local file
  local line
  local value=""

  for file in "$@"; do
    [[ -f "$file" ]] || continue
    line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
    if [[ -n "$line" ]]; then
      value="${line#*=}"
      value="${value%$'\r'}"
    fi
  done

  printf "%s" "$value"
}

normalize_route_prefix() {
  local value="${1:-}"
  value="${value#/}"
  value="${value%/}"

  if [[ -z "$value" ]]; then
    value="dudu-admin-api"
  fi

  printf "%s" "$value"
}

normalize_port() {
  local value="${1:-}"
  value="${value#:}"
  printf "%s" "$value"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-root)
      if [[ $# -lt 2 ]]; then
        print_error "--backend-root requires a value"
        exit 1
      fi
      BACKEND_ROOT="$2"
      shift
      ;;
    --backend-config)
      if [[ $# -lt 2 ]]; then
        print_error "--backend-config requires a value"
        exit 1
      fi
      BACKEND_CONFIG="$2"
      shift
      ;;
    --frontend-env)
      if [[ $# -lt 2 ]]; then
        print_error "--frontend-env requires a value"
        exit 1
      fi
      FRONTEND_ENV_FILE="$2"
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
  shift
done

require_cmd node

if [[ -z "$BACKEND_CONFIG" ]]; then
  if [[ -f "$BACKEND_ROOT/bin/configs/local.json" ]]; then
    BACKEND_CONFIG="$BACKEND_ROOT/bin/configs/local.json"
  else
    BACKEND_CONFIG="$BACKEND_ROOT/bin/configs/local.json.default"
    print_warning "local.json not found, fallback to local.json.default"
  fi
fi

if [[ ! -f "$BACKEND_CONFIG" ]]; then
  print_error "Backend config file not found: $BACKEND_CONFIG"
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  print_error "Frontend base env file not found: $PROJECT_ROOT/.env"
  exit 1
fi

frontend_api_base_url="$(read_env_value "VITE_API_BASE_URL" "$PROJECT_ROOT/.env" "$FRONTEND_ENV_FILE")"
frontend_api_route_prefix="$(read_env_value "VITE_API_ROUTE_PREFIX" "$PROJECT_ROOT/.env" "$FRONTEND_ENV_FILE")"
frontend_use_mock="$(read_env_value "VITE_USE_MOCK" "$PROJECT_ROOT/.env" "$FRONTEND_ENV_FILE")"

if [[ -z "$frontend_api_base_url" ]]; then
  frontend_api_base_url="/"
fi

if [[ -z "$frontend_use_mock" ]]; then
  frontend_use_mock="false"
fi

backend_values_raw="$(
  node -e "const fs = require('fs'); const path = process.argv[1]; const cfg = JSON.parse(fs.readFileSync(path, 'utf8')); const system = cfg.system || {}; const admin = system.admin || {}; const oauth = admin.oauth || {}; const webauthn = admin.webauthn || {}; console.log(system.route_prefix || ''); console.log(system.http_port || ''); console.log(oauth.redirect_url || ''); console.log(JSON.stringify(Array.isArray(webauthn.rp_origins) ? webauthn.rp_origins : []));" \
    "$BACKEND_CONFIG"
)"

backend_route_prefix="$(normalize_route_prefix "$(printf '%s\n' "$backend_values_raw" | sed -n '1p')")"
backend_http_port="$(normalize_port "$(printf '%s\n' "$backend_values_raw" | sed -n '2p')")"
backend_oauth_redirect_url="$(printf '%s\n' "$backend_values_raw" | sed -n '3p')"
backend_rp_origins_json="$(printf '%s\n' "$backend_values_raw" | sed -n '4p')"
frontend_route_prefix="$(normalize_route_prefix "$frontend_api_route_prefix")"

oauth_redirect_meta="$(
  node -e "const value = process.argv[1] || ''; try { const url = new URL(value); console.log(url.origin); console.log(url.pathname); } catch { console.log(''); console.log(''); }" \
    "$backend_oauth_redirect_url"
)"

oauth_redirect_origin="$(printf '%s\n' "$oauth_redirect_meta" | sed -n '1p')"
oauth_redirect_path="$(printf '%s\n' "$oauth_redirect_meta" | sed -n '2p')"

rp_origin_contains_expected="$(
  node -e "const list = JSON.parse(process.argv[1] || '[]'); const expected = process.argv[2]; console.log(Array.isArray(list) && list.includes(expected) ? 'true' : 'false');" \
    "$backend_rp_origins_json" \
    "$EXPECTED_FRONTEND_ORIGIN"
)"

errors=0
warnings=0

print_info "Frontend env overlay: $FRONTEND_ENV_FILE"
print_info "Backend config: $BACKEND_CONFIG"
print_info "Frontend VITE_API_BASE_URL=$frontend_api_base_url"
print_info "Frontend VITE_API_ROUTE_PREFIX=/$frontend_route_prefix"
print_info "Frontend VITE_USE_MOCK=$frontend_use_mock"
print_info "Backend system.route_prefix=$backend_route_prefix"
print_info "Backend system.http_port=:${backend_http_port}"

if [[ "$frontend_api_base_url" != "/" ]]; then
  print_warning "VITE_API_BASE_URL is not '/', local Vite proxy may be bypassed"
  warnings=$((warnings + 1))
fi

if [[ "$frontend_use_mock" == "true" ]]; then
  print_warning "VITE_USE_MOCK=true, current frontend requests will not validate real backend linkage"
  warnings=$((warnings + 1))
fi

if [[ "$frontend_route_prefix" != "$backend_route_prefix" ]]; then
  print_error "Route prefix mismatch: frontend=/$frontend_route_prefix backend=$backend_route_prefix"
  errors=$((errors + 1))
fi

if [[ "$backend_http_port" != "$EXPECTED_BACKEND_PORT" ]]; then
  print_error "Backend port mismatch: frontend proxy expects $EXPECTED_BACKEND_PORT but backend config is $backend_http_port"
  errors=$((errors + 1))
fi

if [[ "$oauth_redirect_path" != "$EXPECTED_FRONTEND_CALLBACK_PATH" ]]; then
  print_warning "OAuth redirect path is '$oauth_redirect_path', expected '$EXPECTED_FRONTEND_CALLBACK_PATH' to match the current frontend callback route"
  warnings=$((warnings + 1))
elif [[ "$oauth_redirect_origin" != "http://localhost:3000" && "$oauth_redirect_origin" != "http://127.0.0.1:3000" ]]; then
  print_warning "OAuth redirect origin is '$oauth_redirect_origin', expected a local frontend origin such as 'http://localhost:3000'"
  warnings=$((warnings + 1))
fi

if [[ "$rp_origin_contains_expected" != "true" ]]; then
  print_warning "WebAuthn rp_origins does not include $EXPECTED_FRONTEND_ORIGIN"
  warnings=$((warnings + 1))
fi

if [[ "$errors" -gt 0 ]]; then
  print_error "Backend linkage check failed with $errors error(s) and $warnings warning(s)"
  exit 1
fi

print_success "Backend linkage check passed with $warnings warning(s)"
