#!/usr/bin/env bash
set -euo pipefail

# Restore backup SQLite al directorio data.
# Uso:
#   bash scripts/restore_sqlite.sh backup/secure/snc_YYYYMMDD_HHMMSS.sqlite
#   SNC_DATA_DIR=/ruta/data bash scripts/restore_sqlite.sh /ruta/backup.sqlite

if [ "${#}" -lt 1 ]; then
  echo "[RESTORE] Faltó ruta del backup"
  exit 1
fi

SRC="${1}"
DATA_DIR="${SNC_DATA_DIR:-$(pwd)/data}"
DB_PATH="${DATA_DIR}/snc.sqlite"

if [ ! -f "${SRC}" ]; then
  echo "[RESTORE] No existe ${SRC}"
  exit 1
fi

mkdir -p "${DATA_DIR}"
cp "${SRC}" "${DB_PATH}"
echo "[RESTORE] Restaurado ${SRC} -> ${DB_PATH}"
