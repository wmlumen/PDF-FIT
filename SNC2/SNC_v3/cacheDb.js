import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'catastro_cache.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run(`CREATE TABLE IF NOT EXISTS parcelas (
    id TEXT PRIMARY KEY,
    padron TEXT,
    distrito INTEGER,
    zona INTEGER,
    mz INTEGER,
    lote INTEGER,
    geojson TEXT NOT NULL,
    minX REAL,
    minY REAL,
    maxX REAL,
    maxY REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_bbox ON parcelas (minX, maxX, minY, maxY)');
  // Pilar 1: Índice espacial R-Tree nativo de SQLite (búsqueda < 3ms).
  // La columna `id` del r-tree DEBE ser un entero de 64 bits (requisito del
  // módulo rtree de SQLite): se usa el `rowid` implícito de `parcelas`
  // (es TEXT PRIMARY KEY, no WITHOUT ROWID, así que cada fila igual tiene un
  // rowid entero propio) como clave compartida entre ambas tablas.
  db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS idx_parcelas_geometria USING rtree(
    id, minX, maxX, minY, maxY
  )`, (err) => {
    if (err && !err.message.includes('already exists')) cacheLog('rtree_create_error', { error: err.message });
    else cacheLog('rtree_created', {});
  });
  // Backfill: hasta esta corrección, el r-tree se creaba pero nunca se
  // poblaba (ver AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md, P-10) —
  // getFeaturesByBbox/getFeatureContainingPoint consultaban el índice
  // B-tree de minX/maxX/minY/maxY en su lugar. Esto sincroniza cualquier
  // fila existente (de corridas anteriores) al r-tree. Se emite como
  // sentencia HERMANA dentro del mismo db.serialize() (no anidada en el
  // callback de arriba): serialize() solo garantiza el orden de ejecución
  // para sentencias emitidas sincrónicamente en su propio callback — si se
  // encadena dentro de un callback async, una consulta hecha por otro módulo
  // justo después de importar este archivo puede colarse antes y encontrar
  // el r-tree todavía vacío (se reprodujo así en tests/sovereign-vector.test.mjs).
  // Es idempotente (INSERT OR REPLACE), así que correrlo en cada arranque no duplica nada.
  db.run(
    `INSERT OR REPLACE INTO idx_parcelas_geometria (id, minX, maxX, minY, maxY)
     SELECT rowid, minX, maxX, minY, maxY FROM parcelas
     WHERE minX IS NOT NULL AND maxX IS NOT NULL AND minY IS NOT NULL AND maxY IS NOT NULL`,
    (backfillErr) => {
      if (backfillErr) cacheLog('rtree_backfill_error', { error: backfillErr.message });
      else cacheLog('rtree_backfill_ok', {});
    }
  );
});

const LOG_PATH = path.join(dbDir, 'cacheDb.log');
function cacheLog(event, meta = {}) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...meta }) + '\n';
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (e) {
    // ignore log errors
  }
}

const MAX_CACHE_ROWS = Number(process.env.SNC_CACHE_MAX_ROWS || 20000);
const RETENTION_DAYS = Number(process.env.SNC_CACHE_RETENTION_DAYS || 30);

function promisify(sql, params = []) {
  return new Promise((resolve, reject) => {
    cacheLog('sql_query', { query: sql, params });
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function promisifyRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    cacheLog('sql_query', { query: sql, params });
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function pruneRtreeOrphans() {
  // Despues de borrar filas de `parcelas`, sus entradas en el r-tree quedan
  // huerfanas (el modulo rtree no tiene ON DELETE CASCADE). Limpiarlas evita
  // que getFeaturesByBbox/getFeatureContainingPoint devuelvan rowids que ya
  // no existen en `parcelas`.
  await promisifyRun('DELETE FROM idx_parcelas_geometria WHERE id NOT IN (SELECT rowid FROM parcelas)');
}

async function pruneCache() {
  try {
    const countRow = await promisify('SELECT COUNT(*) AS n FROM parcelas');
    const count = countRow[0]?.n || 0;

    if (count >= MAX_CACHE_ROWS) {
      await promisifyRun('DELETE FROM parcelas WHERE id NOT IN (SELECT id FROM parcelas ORDER BY datetime(updated_at) DESC LIMIT ?)', [MAX_CACHE_ROWS]);
      cacheLog('cache_pruned_rows', { max: MAX_CACHE_ROWS });
    }

    await promisifyRun('DELETE FROM parcelas WHERE updated_at < datetime("now", ?)', [`-${RETENTION_DAYS} days`]);
    cacheLog('cache_pruned_retention', { retentionDays: RETENTION_DAYS });

    await pruneRtreeOrphans();
  } catch (err) {
    cacheLog('cache_prune_error', { error: err.message });
  }
}

export function saveFeature(feature) {
  if (!feature || !feature.geometry) return Promise.resolve({ changes: 0 });

  const coords = feature.geometry.coordinates;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const flattenCoords = feature.geometry.type === 'MultiPolygon'
    ? coords.flat(2)
    : coords.flat(1);

  for (const [x, y] of flattenCoords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const props = feature.properties || {};
  const featureId = feature.id || props.id || props.ID || props.codigo || props.CODIGO;
  if (!featureId) return Promise.resolve({ changes: 0 });
  const sql = `INSERT INTO parcelas (id, padron, distrito, zona, mz, lote, geojson, minX, minY, maxX, maxY, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      padron = excluded.padron,
      distrito = excluded.distrito,
      zona = excluded.zona,
      mz = excluded.mz,
      lote = excluded.lote,
      geojson = excluded.geojson,
      minX = excluded.minX,
      minY = excluded.minY,
      maxX = excluded.maxX,
      maxY = excluded.maxY,
      updated_at = CURRENT_TIMESTAMP`;

  const idText = featureId.toString();
  return promisifyRun(sql, [
    idText,
    (props.padron ?? props.PADRON)?.toString() || null,
    props.dist ?? props.DIST ?? null,
    props.zona ?? props.ZONA ?? null,
    props.mz ?? props.MZ ?? null,
    props.lote ?? props.LOTE ?? null,
    JSON.stringify(feature),
    minX, minY, maxX, maxY
  ]).then(async (result) => {
    // Mantener el r-tree sincronizado con `parcelas` en cada guardado (no
    // solo en el arranque): ver nota de P-10 en el bloque de creacion de
    // idx_parcelas_geometria mas arriba.
    const row = await promisify('SELECT rowid AS rid FROM parcelas WHERE id = ?', [idText]);
    const rid = row[0]?.rid;
    if (rid != null) {
      await promisifyRun(
        'INSERT OR REPLACE INTO idx_parcelas_geometria (id, minX, maxX, minY, maxY) VALUES (?, ?, ?, ?, ?)',
        [rid, minX, maxX, minY, maxY]
      ).catch(err => cacheLog('rtree_sync_error', { featureId: idText, error: err.message }));
    }
    return result;
  }).catch(err => {
    cacheLog('save_feature_error', { featureId, error: err.message });
    throw err;
  });
}

export function getFeaturesByBbox(minX, minY, maxX, maxY) {
  // Busqueda por el r-tree (indice espacial real, O(log n)) en vez del
  // escaneo del indice B-tree compuesto sobre minX/maxX/minY/maxY.
  return promisify(
    `SELECT p.geojson FROM idx_parcelas_geometria r
     JOIN parcelas p ON p.rowid = r.id
     WHERE r.minX <= ? AND r.maxX >= ? AND r.minY <= ? AND r.maxY >= ?`,
    [maxX, minX, maxY, minY]
  ).then(rows => rows.map(r => JSON.parse(r.geojson)));
}

export async function saveFeaturesBatch(features) {
  const validFeatures = (features || []).filter(feature => feature?.geometry);
  for (const feature of validFeatures) await saveFeature(feature);
  await pruneCache();
  return { saved: validFeatures.length };
}

export function getFeatureContainingPoint(lat, lng) {
  return promisify(
    `SELECT p.geojson FROM idx_parcelas_geometria r
     JOIN parcelas p ON p.rowid = r.id
     WHERE r.minX <= ? AND r.maxX >= ? AND r.minY <= ? AND r.maxY >= ?`,
    [lng, lng, lat, lat]
  ).then(rows => {
    const pt = turf.point([lng, lat]);
    for (const row of rows) {
      const feature = JSON.parse(row.geojson);
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        if (turf.booleanPointInPolygon(pt, feature)) return feature;
      }
    }
    return null;
  });
}

export { db };
