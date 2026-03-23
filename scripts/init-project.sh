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

SKIP_INSTALL=false
INSTALL_MODE="auto"

show_usage() {
  cat <<'EOF'
Usage:
  ./scripts/init-project.sh [options]

Options:
  --skip-install           Skip dependency installation
  --install-mode <mode>    auto|ci|install (default: auto)
  -h, --help               Show help
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      SKIP_INSTALL=true
      ;;
    --install-mode)
      if [[ $# -lt 2 ]]; then
        print_error "--install-mode requires a value"
        exit 1
      fi
      INSTALL_MODE="$2"
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

case "$INSTALL_MODE" in
  auto|ci|install)
    ;;
  *)
    print_error "Invalid install mode: $INSTALL_MODE"
    exit 1
    ;;
esac

require_cmd node
require_cmd npm

cd "$PROJECT_ROOT"

print_info "Project root: $PROJECT_ROOT"
print_info "Node.js: $(node -v)"
print_info "npm: $(npm -v)"

install_cmd=()
if [[ "$INSTALL_MODE" == "ci" ]]; then
  if [[ ! -f package-lock.json ]]; then
    print_error "package-lock.json not found, cannot use npm ci"
    exit 1
  fi
  install_cmd=(npm ci)
elif [[ "$INSTALL_MODE" == "install" ]]; then
  install_cmd=(npm install)
elif [[ -f package-lock.json ]]; then
  install_cmd=(npm ci)
else
  install_cmd=(npm install)
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  print_warning "Skip dependency installation"
else
  print_info "Running: ${install_cmd[*]}"
  "${install_cmd[@]}"
fi

api_base_url="$(read_env_value "VITE_API_BASE_URL" ".env" ".env.development")"
api_route_prefix="$(read_env_value "VITE_API_ROUTE_PREFIX" ".env" ".env.development")"
use_mock="$(read_env_value "VITE_USE_MOCK" ".env" ".env.development")"

if [[ -z "$api_base_url" ]]; then
  api_base_url="/"
fi

if [[ -z "$api_route_prefix" || "$api_route_prefix" == "/" ]]; then
  api_route_prefix="/dudu-admin-api"
fi

if [[ -z "$use_mock" ]]; then
  use_mock="false"
fi

print_success "Frontend initialization is ready"
print_info "VITE_API_BASE_URL=$api_base_url"
print_info "VITE_API_ROUTE_PREFIX=$api_route_prefix"
print_info "VITE_USE_MOCK=$use_mock"

if [[ "$use_mock" == "true" ]]; then
  print_warning "Mock mode is enabled; frontend can run without backend linkage"
else
  print_info "For real backend integration, run: npm run check:backend"
fi

print_info "Start dev server: npm run dev"
