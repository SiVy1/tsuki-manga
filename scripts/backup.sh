#!/usr/bin/env sh

set -eu

OUTPUT_ROOT="${OUTPUT_ROOT:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
ARCHIVE_BASENAME="tsuki-backup-${TIMESTAMP}"
TMP_DIR="${OUTPUT_ROOT}/.tmp-${ARCHIVE_BASENAME}"
ARCHIVE_PATH="${OUTPUT_ROOT}/${ARCHIVE_BASENAME}.tar.gz"
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"

mkdir -p "${OUTPUT_ROOT}"
rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}/storage"

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT INT TERM

echo "Creating PostgreSQL dump"
docker compose exec -T postgres sh -lc 'pg_dump -U postgres -d tsuki_manga' \
  | gzip -c > "${TMP_DIR}/tsuki_manga.sql.gz"

if [ -f ".env" ]; then
  cp ".env" "${TMP_DIR}/.env"
fi

if [ -d "./public/media" ]; then
  cp -R "./public/media" "${TMP_DIR}/storage/public-media"
fi

if [ -d "./.storage/draft" ]; then
  cp -R "./.storage/draft" "${TMP_DIR}/storage/draft-media"
fi

if [ -d "./.docker-data/minio" ]; then
  cp -R "./.docker-data/minio" "${TMP_DIR}/storage/minio"
fi

echo "Creating archive ${ARCHIVE_PATH}"
tar -czf "${ARCHIVE_PATH}" -C "${TMP_DIR}" .

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "${OUTPUT_ROOT}"
    sha256sum "$(basename "${ARCHIVE_PATH}")" > "$(basename "${CHECKSUM_PATH}")"
  )
elif command -v shasum >/dev/null 2>&1; then
  (
    cd "${OUTPUT_ROOT}"
    shasum -a 256 "$(basename "${ARCHIVE_PATH}")" > "$(basename "${CHECKSUM_PATH}")"
  )
fi

echo "Applying retention (${RETENTION_DAYS} days)"
find "${OUTPUT_ROOT}" -maxdepth 1 -type f -name 'tsuki-backup-*.tar.gz' -mtime +"${RETENTION_DAYS}" -delete
find "${OUTPUT_ROOT}" -maxdepth 1 -type f -name 'tsuki-backup-*.tar.gz.sha256' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup completed: ${ARCHIVE_PATH}"
