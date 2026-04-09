#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_PATH=""
MODE="full"
DRY_RUN=false
SKIP_SAFETY_BACKUP=false
FORCE=false

usage() {
  cat <<EOF
Usage: ./scripts/restore.sh --from <backup-dir> [--mode <full|db-only|storage-only|env-only|minio-only>] [--dry-run] [--skip-safety-backup] [--force]
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --from)
      BACKUP_PATH="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-safety-backup)
      SKIP_SAFETY_BACKUP=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [ -z "${BACKUP_PATH}" ]; then
  usage
  exit 1
fi

case "${MODE}" in
  full|db-only|storage-only|env-only|minio-only) ;;
  *)
    echo "Unsupported mode: ${MODE}" >&2
    exit 1
    ;;
esac

resolve_path() {
  local target="$1"
  TARGET_PATH="${target}" node -e "const path=require('node:path'); console.log(path.resolve(process.env.TARGET_PATH));"
}

BACKUP_DIR="$(resolve_path "${BACKUP_PATH}")"

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "Backup directory does not exist: ${BACKUP_DIR}" >&2
  exit 1
fi

if [ ! -f "${BACKUP_DIR}/manifest.json" ] || [ ! -f "${BACKUP_DIR}/checksums.txt" ]; then
  echo "Backup is missing manifest.json or checksums.txt" >&2
  exit 1
fi

if [ "${DRY_RUN}" = false ]; then
  (
    cd "${BACKUP_DIR}"
    sha256sum -c checksums.txt
  )
fi

if [ "${FORCE}" = false ] && [ "${DRY_RUN}" = false ]; then
  echo "Restore will modify current data. Re-run with --force to continue." >&2
  exit 1
fi

run_in_root() {
  (
    cd "${ROOT_DIR}"
    "$@"
  )
}

restore_archive() {
  local archive_rel="$1"
  local target_rel="$2"
  local archive_path="${BACKUP_DIR}/${archive_rel}"
  local target_path="${ROOT_DIR}/${target_rel}"

  if [ ! -f "${archive_path}" ]; then
    return 0
  fi

  echo "Restoring ${archive_rel} -> ${target_rel}"
  rm -rf "${target_path}"
  mkdir -p "${target_path}"
  tar -xzf "${archive_path}" -C "${ROOT_DIR}"
}

detect_minio_profile() {
  local env_path="$1"
  if [ -f "${env_path}" ] && grep -q '^STORAGE_DRIVER=s3$' "${env_path}"; then
    return 0
  fi

  if [ -f "${BACKUP_DIR}/storage/minio.tar.gz" ]; then
    return 0
  fi

  return 1
}

if [ "${SKIP_SAFETY_BACKUP}" = false ] && [ "${DRY_RUN}" = false ] && [ "${MODE}" != "env-only" ]; then
  echo "Creating safety backup before restore"
  (
    cd "${ROOT_DIR}"
    OUTPUT_ROOT="${ROOT_DIR}/backups/pre-restore" ./scripts/backup.sh
  )
fi

if [ "${DRY_RUN}" = true ]; then
  echo "Dry run complete for restore mode: ${MODE}"
  exit 0
fi

run_in_root docker compose down

if [ "${MODE}" = "full" ] || [ "${MODE}" = "env-only" ]; then
  if [ -f "${BACKUP_DIR}/env/.env" ]; then
    echo "Restoring .env"
    cp "${BACKUP_DIR}/env/.env" "${ROOT_DIR}/.env"
  fi
fi

if [ "${MODE}" = "full" ] || [ "${MODE}" = "storage-only" ]; then
  restore_archive "storage/public-media.tar.gz" "public/media"
  restore_archive "storage/draft-media.tar.gz" ".storage/draft"
  restore_archive "storage/minio.tar.gz" ".docker-data/minio"
fi

if [ "${MODE}" = "minio-only" ]; then
  restore_archive "storage/minio.tar.gz" ".docker-data/minio"
fi

COMPOSE_ARGS=()
if detect_minio_profile "${ROOT_DIR}/.env"; then
  COMPOSE_ARGS+=(--profile minio)
fi

if [ "${MODE}" = "full" ] || [ "${MODE}" = "db-only" ]; then
  run_in_root docker compose "${COMPOSE_ARGS[@]}" up -d postgres
  echo "Restoring PostgreSQL dump"
  gunzip -c "${BACKUP_DIR}/db/tsuki_manga.sql.gz" | run_in_root docker compose exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
fi

if [ "${MODE}" = "full" ] || [ "${MODE}" = "storage-only" ] || [ "${MODE}" = "minio-only" ]; then
  if detect_minio_profile "${ROOT_DIR}/.env"; then
    run_in_root docker compose --profile minio up -d minio minio-init
  fi
fi

if [ "${MODE}" = "full" ] || [ "${MODE}" = "db-only" ] || [ "${MODE}" = "storage-only" ] || [ "${MODE}" = "env-only" ]; then
  run_in_root docker compose "${COMPOSE_ARGS[@]}" up -d app
fi

echo "Restore completed for mode: ${MODE}"
