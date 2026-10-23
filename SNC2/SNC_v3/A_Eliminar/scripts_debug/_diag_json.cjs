// Diagnostico de integridad JSON - sqlite3 nativo Node (ejecutar desde PowerShell/Windows).
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = path.join(process.cwd(), 'data', 'snc.sqlite');

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

// Campos JSON a auditar por tabla (incluye columnas del modulo 9 y otras).
const SCHEMA = {
  users: ['stats_json'],
  plans: ['limits_json', 'features_json'],
  expedientes: ['state_json', 'validation_results', 'files_json', 'precalificacion_json', 'dictamen_json'],
  payments: ['buyer', 'webhook_data'],
  expediente_historial: ['diff_json'],
  admin_audit_log: ['old_value', 'new_value'],
  temp_projects: ['expedientes_json'],
  ip_events: ['meta']
};

(async () => {
  try {
    const tables = await run("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tableSet = new Set(tables.map(t => t.name));
    console.log("TABLES:" + JSON.stringify([...tableSet]));
    for (const [table, cols] of Object.entries(SCHEMA)) {
      if (!tableSet.has(table)) { console.log(`[${table}] table MISSING`); continue; }
      const colInfo = await run(`PRAGMA table_info(${table})`);
      const presentCols = cols.filter(c => colInfo.some(ci => ci.name === c));
      const absentCols = cols.filter(c => !colInfo.some(ci => ci.name === c));
      if (absentCols.length) console.log(`[${table}] cols absent in DB: ${absentCols.join(',')}`);
      for (const col of presentCols) {
        try {
          const rows = await run(`SELECT ${col} FROM ${table}`);
          const bad = rows.filter(r => {
            const v = r[col];
            if (v === null || v === undefined || v === '') return false;
            try { JSON.parse(v); return false; } catch { return true; }
          });
          if (bad.length) {
            console.log(`[${table}.${col}] AFECTADAS=${bad.length}/${rows.length} sample=${JSON.stringify(bad[0] && bad[0][col])}`);
          } else {
            console.log(`[${table}.${col}] OK (${rows.length} rows)`);
            // detectar doble encoding aunque sea parseable
            const dbl = rows.filter(r => {
              const v = r[col];
              if (typeof v !== 'string' || v === null) return false;
              try { const p = JSON.parse(v); return typeof p === 'string'; } catch { return false; }
            });
            if (dbl.length) console.log(`[${table}.${col}] posible doble-encoding en ${dbl.length}/${rows.length} rows, sample=${JSON.stringify(dbl[0][col])}`);
          }
        } catch (e) {
          console.log(`[${table}.${col}] ERROR query: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.error("FATAL", e);
  } finally {
    db.close();
  }
})();
