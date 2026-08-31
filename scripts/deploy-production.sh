#!/usr/bin/env bash
set -Eeuo pipefail

ONLYFOOD_PROJECT_DIR="${ONLYFOOD_PROJECT_DIR:-/opt/apps/onlyfood}"
ONLYFOOD_PROJECT_NAME="onlyfood"
ONLYFOOD_COMPOSE_FILE="$ONLYFOOD_PROJECT_DIR/compose.npm.yaml"
ONLYFOOD_ENV_FILE="$ONLYFOOD_PROJECT_DIR/.env.docker"
ONLYFOOD_BACKUP_SCRIPT="$ONLYFOOD_PROJECT_DIR/scripts/backup-production.sh"
ONLYFOOD_RUN_MIGRATIONS=false

if [[ "${1:-}" == "--migrate" ]]; then
  ONLYFOOD_RUN_MIGRATIONS=true
  shift
fi
[[ $# -eq 0 ]] || {
  printf 'Uso: %s [--migrate]\n' "$0" >&2
  exit 2
}

compose() {
  docker compose \
    --project-name "$ONLYFOOD_PROJECT_NAME" \
    --file "$ONLYFOOD_COMPOSE_FILE" \
    --env-file "$ONLYFOOD_ENV_FILE" \
    "$@"
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ONLYFOOD_ENV_FILE" | tail -n 1
}

require_env() {
  local key="$1"
  [[ -n "$(env_value "$key")" ]] || fail "Falta $key en .env.docker."
}

validate_runtime_env() {
  require_env DB_PASSWORD
  require_env DB_ROOT_PASSWORD
  require_env AUTH_SALT
  require_env NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
  require_env BASE_DOMAIN
  require_env BASE_URL
  require_env R2_ENDPOINT
  require_env R2_BUCKET
  require_env R2_ACCESS_KEY_ID
  require_env R2_SECRET_ACCESS_KEY
  require_env R2_PUBLIC_URL
  if [[ -z "$(env_value ENCRYPTION_KEY)" && -z "$(env_value ENCRYPTION_MASTER_KEY)" ]]; then
    fail "Falta ENCRYPTION_KEY o ENCRYPTION_MASTER_KEY en .env.docker."
  fi
  [[ "$(env_value STORAGE_PROVIDER)" == "r2" ]] || fail "STORAGE_PROVIDER debe ser r2 en producción."
  [[ "$(env_value ALLOW_LOCAL_STORAGE)" == "false" ]] || fail "ALLOW_LOCAL_STORAGE debe ser false en producción."
  [[ "$(env_value SEED_DEMO_DATA)" == "false" ]] || fail "SEED_DEMO_DATA debe ser false en producción."
}

[[ -d "$ONLYFOOD_PROJECT_DIR/.git" ]] || fail "No existe el repositorio en $ONLYFOOD_PROJECT_DIR."
[[ -f "$ONLYFOOD_COMPOSE_FILE" ]] || fail "Falta compose.npm.yaml."
[[ -f "$ONLYFOOD_ENV_FILE" ]] || fail "Falta .env.docker."
[[ -f "$ONLYFOOD_BACKUP_SCRIPT" ]] || fail "Falta el script de backup."

cd "$ONLYFOOD_PROJECT_DIR"
validate_runtime_env
compose config --quiet

[[ "$(git branch --show-current)" == "main" ]] || fail "El checkout productivo debe estar en main."
[[ -z "$(git status --porcelain)" ]] || fail "El checkout productivo contiene cambios locales."

git fetch origin main
git merge-base --is-ancestor HEAD origin/main || fail "origin/main no es un avance directo del checkout productivo."

ONLYFOOD_PREVIOUS_COMMIT="$(git rev-parse HEAD)"
ONLYFOOD_TARGET_COMMIT="$(git rev-parse origin/main)"
ONLYFOOD_ROLLBACK_TAG=""

ONLYFOOD_DB_CONTAINER="$(compose ps -q db 2>/dev/null || true)"
if [[ -n "$ONLYFOOD_DB_CONTAINER" ]] && [[ "$(docker inspect --format '{{.State.Running}}' "$ONLYFOOD_DB_CONTAINER")" == "true" ]]; then
  bash "$ONLYFOOD_BACKUP_SCRIPT" db
else
  printf 'MariaDB todavía no está en ejecución; no hay datos que respaldar.\n'
fi

ONLYFOOD_APP_CONTAINER="$(compose ps -q app 2>/dev/null || true)"
if [[ -n "$ONLYFOOD_APP_CONTAINER" ]]; then
  ONLYFOOD_CURRENT_IMAGE="$(docker inspect --format '{{.Image}}' "$ONLYFOOD_APP_CONTAINER")"
  ONLYFOOD_ROLLBACK_TAG="onlyfood-app:rollback-$(date -u +%Y%m%dT%H%M%SZ)"
  docker image tag "$ONLYFOOD_CURRENT_IMAGE" "$ONLYFOOD_ROLLBACK_TAG"
fi

if [[ "$ONLYFOOD_PREVIOUS_COMMIT" != "$ONLYFOOD_TARGET_COMMIT" ]]; then
  git merge --ff-only origin/main
fi

compose build app database-init
compose up -d --no-build db

if [[ "$ONLYFOOD_RUN_MIGRATIONS" == "true" ]]; then
  printf 'Aplicando únicamente migraciones Prisma pendientes. No se ejecutan seeds.\n'
  compose --profile migration run --rm database-init
else
  printf 'Migraciones omitidas. Usá --migrate sólo después de revisar la base restaurada.\n'
fi

compose up -d --no-build --no-deps app
ONLYFOOD_APP_CONTAINER="$(compose ps -q app)"
[[ -n "$ONLYFOOD_APP_CONTAINER" ]] || fail "No se creó el contenedor de la aplicación."

ONLYFOOD_HEALTHY=false
for _ in $(seq 1 45); do
  ONLYFOOD_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$ONLYFOOD_APP_CONTAINER")"
  if [[ "$ONLYFOOD_HEALTH" == "healthy" ]]; then
    ONLYFOOD_HEALTHY=true
    break
  fi
  [[ "$ONLYFOOD_HEALTH" != "unhealthy" ]] || break
  sleep 2
done

if [[ "$ONLYFOOD_HEALTHY" != "true" ]]; then
  compose logs --tail=150 app >&2 || true
  if [[ -n "$ONLYFOOD_ROLLBACK_TAG" ]]; then
    docker image tag "$ONLYFOOD_ROLLBACK_TAG" onlyfood-app:latest
    compose up -d --no-build --no-deps --force-recreate app
  fi
  fail "La aplicación no superó el healthcheck."
fi

git rev-parse HEAD > "$ONLYFOOD_PROJECT_DIR/.deployed-commit"
compose ps -a
printf 'OnlyFood %s desplegado y saludable.\n' "$(git rev-parse --short HEAD)"
