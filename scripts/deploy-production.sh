#!/usr/bin/env bash
set -Eeuo pipefail

ONLYFOOD_PROJECT_DIR="${ONLYFOOD_PROJECT_DIR:-/opt/onlyfood-saas}"
ONLYFOOD_PROJECT_NAME="onlyfood-saas"
ONLYFOOD_COMPOSE_FILE="$ONLYFOOD_PROJECT_DIR/compose.npm.yaml"
ONLYFOOD_ENV_FILE="$ONLYFOOD_PROJECT_DIR/.env.docker"
ONLYFOOD_BACKUP_DIR="${ONLYFOOD_BACKUP_DIR:-/root/onlyfood-backups}"
ONLYFOOD_APP_PORT="${APP_PORT:-3007}"

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

[[ -d "$ONLYFOOD_PROJECT_DIR/.git" ]] || fail "No existe el repositorio en $ONLYFOOD_PROJECT_DIR."
[[ -f "$ONLYFOOD_COMPOSE_FILE" ]] || fail "Falta compose.npm.yaml."
[[ -f "$ONLYFOOD_ENV_FILE" ]] || fail "Falta .env.docker."

cd "$ONLYFOOD_PROJECT_DIR"

printf '== Validando topología Nginx Proxy Manager ==\n'
compose config --quiet
if compose config --services | grep -qx 'proxy'; then
  fail "La configuración de producción no debe incluir Caddy/proxy."
fi

printf '== Creando respaldo de MariaDB ==\n'
mkdir -p "$ONLYFOOD_BACKUP_DIR"
ONLYFOOD_BACKUP_FILE="$ONLYFOOD_BACKUP_DIR/onlyfood-$(date +%Y%m%d-%H%M%S).sql.gz"
compose exec -T db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' | gzip > "$ONLYFOOD_BACKUP_FILE"
[[ -s "$ONLYFOOD_BACKUP_FILE" ]] || fail "El respaldo quedó vacío."
ls -lh "$ONLYFOOD_BACKUP_FILE"

printf '== Actualizando código desde GitHub ==\n'
git fetch origin main
git pull --ff-only origin main
ONLYFOOD_COMMIT="$(git rev-parse --short HEAD)"

ONLYFOOD_ROLLBACK_TAG=""
ONLYFOOD_CURRENT_IMAGE="$(docker inspect --format '{{.Image}}' onlyfood-saas-app-1 2>/dev/null || true)"
if [[ -n "$ONLYFOOD_CURRENT_IMAGE" ]]; then
  ONLYFOOD_ROLLBACK_TAG="onlyfood-saas-app:rollback-$(date +%Y%m%d-%H%M%S)"
  docker image tag "$ONLYFOOD_CURRENT_IMAGE" "$ONLYFOOD_ROLLBACK_TAG"
  printf 'Rollback conservado: %s\n' "$ONLYFOOD_ROLLBACK_TAG"
fi

printf '== Construyendo app e inicializador ==\n'
compose build app database-init

printf '== Aplicando migraciones ==\n'
compose up -d --no-build db database-init
ONLYFOOD_INIT_CONTAINER="$(compose ps -a -q database-init)"
[[ -n "$ONLYFOOD_INIT_CONTAINER" ]] || fail "No se creó database-init."
docker wait "$ONLYFOOD_INIT_CONTAINER" >/dev/null
ONLYFOOD_INIT_EXIT="$(docker inspect --format '{{.State.ExitCode}}' "$ONLYFOOD_INIT_CONTAINER")"
[[ "$ONLYFOOD_INIT_EXIT" == "0" ]] || fail "database-init terminó con código $ONLYFOOD_INIT_EXIT. Revisá sus logs."

printf '== Reemplazando únicamente la aplicación ==\n'
compose up -d --no-build --no-deps app

printf '== Esperando healthcheck en puerto %s ==\n' "$ONLYFOOD_APP_PORT"
ONLYFOOD_HEALTHY=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 "http://127.0.0.1:${ONLYFOOD_APP_PORT}/api/health" >/dev/null; then
    ONLYFOOD_HEALTHY=true
    break
  fi
  sleep 2
done

if [[ "$ONLYFOOD_HEALTHY" != "true" ]]; then
  compose logs --tail=150 app >&2 || true
  if [[ -n "$ONLYFOOD_ROLLBACK_TAG" ]]; then
    printf 'Healthcheck falló; restaurando imagen anterior.\n' >&2
    docker image tag "$ONLYFOOD_ROLLBACK_TAG" onlyfood-saas-app:latest
    compose up -d --no-build --no-deps --force-recreate app
  fi
  fail "La versión nueva no superó el healthcheck."
fi

printf '%s\n' "$ONLYFOOD_COMMIT" > "$ONLYFOOD_PROJECT_DIR/.deployed-commit"
compose ps -a
printf '== OnlyFood %s desplegado y saludable ==\n' "$ONLYFOOD_COMMIT"
