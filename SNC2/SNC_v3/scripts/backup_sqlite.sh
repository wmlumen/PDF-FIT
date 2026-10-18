#!/usr/bin/env bash
set -euo pipefail

# Backup local de SQLite para hosting/data loss prevention.
# Uso:
#   bash scripts/backup_sqlite.sh
# Opcional:
#   SNC_DATA_DIR=/ruta/data bash scripts/backup_sqlite.sh
#   BACKUP_DIR=/ruta/backups bash scripts/backup_sqlite.sh

DATA_DIR="${SNC_DATA_DIR:-$(pwd)/data}"
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backup/secure}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_PATH="${DATA_DIR}/snc.sqlite"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_PATH}" ]; then
  echo "[BACKUP] No existe ${DB_PATH}"
  exit 1
fi

DEST="${BACKUP_DIR}/snc_${TIMESTAMP}.sqlite"
cp "${DB_PATH}" "${DEST}"
echo "[BACKUP] Backup creado: ${DEST}"

# Retención simple: conservar últimos 14 backups
ls -1t "${BACKUP_DIR}"/snc_*.sqlite 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "[BACKUP] Backups retenidos:"
ls -1t "${BACKUP_DIR}"/snc_*.sqlite 2>/dev/null | head -n 5
