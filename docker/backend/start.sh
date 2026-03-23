#!/bin/sh
set -eu

TEMPLATE_PATH=/compose-config/local.json
CONFIG_PATH=/tmp/dudu-admin-local.json

export DUDU_ADMIN_MYSQL_PASSWORD="${DUDU_ADMIN_MYSQL_PASSWORD:-change-me-local-db-password}"
export DUDU_ADMIN_BACKEND_JWT_SECRET="${DUDU_ADMIN_BACKEND_JWT_SECRET:-local-compose-jwt-secret}"
export DUDU_ADMIN_BACKEND_ADMIN_JWT_SECRET="${DUDU_ADMIN_BACKEND_ADMIN_JWT_SECRET:-local-compose-admin-jwt-secret}"

if [ ! -f "$TEMPLATE_PATH" ]; then
  printf 'missing backend config template: %s\n' "$TEMPLATE_PATH" >&2
  exit 1
fi

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[\\/&|]/\\&/g'
}

MYSQL_PASSWORD_ESCAPED="$(escape_sed_replacement "$DUDU_ADMIN_MYSQL_PASSWORD")"
JWT_SECRET_ESCAPED="$(escape_sed_replacement "$DUDU_ADMIN_BACKEND_JWT_SECRET")"
ADMIN_JWT_SECRET_ESCAPED="$(escape_sed_replacement "$DUDU_ADMIN_BACKEND_ADMIN_JWT_SECRET")"

sed \
  -e "s|\${DUDU_ADMIN_MYSQL_PASSWORD}|$MYSQL_PASSWORD_ESCAPED|g" \
  -e "s|\${DUDU_ADMIN_BACKEND_JWT_SECRET}|$JWT_SECRET_ESCAPED|g" \
  -e "s|\${DUDU_ADMIN_BACKEND_ADMIN_JWT_SECRET}|$ADMIN_JWT_SECRET_ESCAPED|g" \
  "$TEMPLATE_PATH" > "$CONFIG_PATH"

export APP_CONFIG_PATH="$CONFIG_PATH"
exec ./bin/dudu-admin-api
