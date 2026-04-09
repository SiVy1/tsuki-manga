#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

OUTPUT_ROOT="${OUTPUT_ROOT:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_NAME="tsuki-backup-${TIMESTAMP}"
TMP_DIR="${OUTPUT_ROOT}/.tmp-${BACKUP_NAME}"
FINAL_DIR="${OUTPUT_ROOT}/${BACKUP_NAME}"
HOSTNAME_VALUE="$(hostname 2>/dev/null || echo unknown)"

mkdir -p "${OUTPUT_ROOT}"
rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}/db" "${TMP_DIR}/env" "${TMP_DIR}/storage"

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT INT TERM

run_in_root() {
  (
    cd "${ROOT_DIR}"
    "$@"
  )
}

create_archive_if_exists() {
  local source_path="$1"
  local archive_path="$2"

  if [ -d "${ROOT_DIR}/${source_path}" ]; then
    tar -czf "${archive_path}" -C "${ROOT_DIR}" "${source_path}"
    return 0
  fi

  return 1
}

echo "Creating PostgreSQL dump"
run_in_root docker compose exec -T postgres sh -lc 'pg_dump --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip -c > "${TMP_DIR}/db/tsuki_manga.sql.gz"

if [ -f "${ROOT_DIR}/.env" ]; then
  cp "${ROOT_DIR}/.env" "${TMP_DIR}/env/.env"
fi

PUBLIC_MEDIA_INCLUDED=false
DRAFT_MEDIA_INCLUDED=false
MINIO_INCLUDED=false

if create_archive_if_exists "public/media" "${TMP_DIR}/storage/public-media.tar.gz"; then
  PUBLIC_MEDIA_INCLUDED=true
fi

if create_archive_if_exists ".storage/draft" "${TMP_DIR}/storage/draft-media.tar.gz"; then
  DRAFT_MEDIA_INCLUDED=true
fi

if create_archive_if_exists ".docker-data/minio" "${TMP_DIR}/storage/minio.tar.gz"; then
  MINIO_INCLUDED=true
fi

(
  cd "${TMP_DIR}"
  find . -type f ! -name 'checksums.txt' -print0 | sort -z | xargs -0 sha256sum > checksums.txt
)

cat > "${TMP_DIR}/manifest.json" <<EOF
{
  "backupName": "${BACKUP_NAME}",
  "createdAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "hostname": "${HOSTNAME_VALUE}",
  "formatVersion": 1,
  "artifacts": {
    "databaseDump": "db/tsuki_manga.sql.gz",
    "envFile": $([ -f "${TMP_DIR}/env/.env" ] && echo '"env/.env"' || echo "null"),
    "publicMedia": $([ "${PUBLIC_MEDIA_INCLUDED}" = true ] && echo '"storage/public-media.tar.gz"' || echo "null"),
    "draftMedia": $([ "${DRAFT_MEDIA_INCLUDED}" = true ] && echo '"storage/draft-media.tar.gz"' || echo "null"),
    "minio": $([ "${MINIO_INCLUDED}" = true ] && echo '"storage/minio.tar.gz"' || echo "null")
  }
}
EOF

mv "${TMP_DIR}" "${FINAL_DIR}"
trap - EXIT INT TERM

echo "Applying retention (${RETENTION_DAYS} days)"
find "${OUTPUT_ROOT}" -maxdepth 1 -mindepth 1 -type d -name 'tsuki-backup-*' -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +

echo "Backup completed: ${FINAL_DIR}"
