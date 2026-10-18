#!/usr/bin/env bash
set -euo pipefail

# Migra usuarios con legacy hash a password_hash_v2 (bcrypt).
# Uso:
#   bash scripts/rotate_legacy_hashes.sh
# Opcional:
#   SNC_DATA_DIR=/ruta/data bash scripts/rotate_legacy_hashes.sh
#   BATCH=20 bash scripts/rotate_legacy_hashes.sh

DATA_DIR="${SNC_DATA_DIR:-$(pwd)/data}"
DB_PATH="${DATA_DIR}/snc.sqlite"
BATCH="${BATCH:-20}"

if [ ! -f "${DB_PATH}" ]; then
  echo "[ROTATE] No existe ${DB_PATH}"
  exit 1
fi

node - <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const dataDir = process.env.SNC_DATA_DIR || path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'snc.sqlite');
const batch = parseInt(process.env.BATCH || '20', 10);

async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(dbPath);
  const promisifyRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
  });
  const promisifyQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
  });

  const rows = await promisifyQuery('SELECT id, email, password_hash FROM users WHERE password_hash IS NOT NULL AND password_hash <> \'\' AND (password_hash_v2 IS NULL OR password_hash_v2 = \'\') LIMIT ?', [batch]);
  if (!rows.length) {
    console.log('[ROTATE] No hay usuarios con legacy hash pendientes.');
    await db.close();
    return;
  }

  for (const row of rows) {
    const fakePassword = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(fakePassword, 10);
    await promisifyRun('UPDATE users SET password_hash_v2 = ?, updated_at = ? WHERE id = ?', [hash, new Date().toISOString(), row.id]);
    console.log(`[ROTATE] Actualizado ${row.email}`);
  }

  console.log(`[ROTATE] Migrados ${rows.length} usuarios`);
  await db.close();
}

main().catch(err => {
  console.error('[ROTATE] Error:', err);
  process.exit(1);
});
NODE
