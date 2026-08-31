#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ $# -eq 0 || "${1:-}" == "db" ]] || {
  printf 'Uso: %s [db]\n' "$0" >&2
  exit 2
}

ONLYFOOD_PROJECT_DIR="${ONLYFOOD_PROJECT_DIR:-/opt/apps/onlyfood}"
ONLYFOOD_PROJECT_NAME="onlyfood"
ONLYFOOD_COMPOSE_FILE="$ONLYFOOD_PROJECT_DIR/compose.npm.yaml"
ONLYFOOD_ENV_FILE="$ONLYFOOD_PROJECT_DIR/.env.docker"
ONLYFOOD_BACKUP_ROOT="${ONLYFOOD_BACKUP_ROOT:-/opt/backups/onlyfood}"
ONLYFOOD_RETENTION_DAYS="${ONLYFOOD_RETENTION_DAYS:-14}"
ONLYFOOD_LOCK_FILE="${ONLYFOOD_LOCK_FILE:-/run/lock/onlyfood-backup.lock}"

compose() {
  docker compose \
    --project-name "$ONLYFOOD_PROJECT_NAME" \
    --file "$ONLYFOOD_COMPOSE_FILE" \
    --env-file "$ONLYFOOD_ENV_FILE" \
    "$@"
}

[[ -f "$ONLYFOOD_COMPOSE_FILE" ]] || { printf 'Falta %s\n' "$ONLYFOOD_COMPOSE_FILE" >&2; exit 1; }
[[ -f "$ONLYFOOD_ENV_FILE" ]] || { printf 'Falta %s\n' "$ONLYFOOD_ENV_FILE" >&2; exit 1; }
[[ "$ONLYFOOD_RETENTION_DAYS" =~ ^[0-9]+$ ]] || { printf 'Retención inválida.\n' >&2; exit 1; }

mkdir -p "$(dirname "$ONLYFOOD_LOCK_FILE")" "$ONLYFOOD_BACKUP_ROOT/db"
exec 9>"$ONLYFOOD_LOCK_FILE"
flock -n 9 || { printf 'Ya existe un backup de OnlyFood en ejecución.\n' >&2; exit 1; }

ONLYFOOD_DB_CONTAINER="$(compose ps -q db)"
[[ -n "$ONLYFOOD_DB_CONTAINER" ]] || { printf 'MariaDB no está creada.\n' >&2; exit 1; }
[[ "$(docker inspect --format '{{.State.Running}}' "$ONLYFOOD_DB_CONTAINER")" == "true" ]] || {
  printf 'MariaDB no está en ejecución.\n' >&2
  exit 1
}

ONLYFOOD_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ONLYFOOD_DB_FINAL="$ONLYFOOD_BACKUP_ROOT/db/onlyfood-db-$ONLYFOOD_STAMP.sql.gz"
ONLYFOOD_DB_TEMP="$ONLYFOOD_DB_FINAL.partial"
trap 'rm -f "$ONLYFOOD_DB_TEMP"' EXIT

compose exec -T db sh -c 'exec mariadb-dump --single-transaction --quick --routines --events --triggers --hex-blob --default-character-set=utf8mb4 -uroot -p"$MARIADB_ROOT_PASSWORD" --databases "$MARIADB_DATABASE"' \
  | gzip -9 > "$ONLYFOOD_DB_TEMP"
[[ -s "$ONLYFOOD_DB_TEMP" ]] || { printf 'El dump quedó vacío.\n' >&2; exit 1; }
gzip -t "$ONLYFOOD_DB_TEMP"
mv "$ONLYFOOD_DB_TEMP" "$ONLYFOOD_DB_FINAL"
sha256sum "$ONLYFOOD_DB_FINAL" > "$ONLYFOOD_DB_FINAL.sha256"

find "$ONLYFOOD_BACKUP_ROOT/db" -maxdepth 1 -type f -name 'onlyfood-db-*' -mtime "+$ONLYFOOD_RETENTION_DAYS" -delete

printf 'Backup de OnlyFood verificado: %s\n' "$ONLYFOOD_STAMP"
