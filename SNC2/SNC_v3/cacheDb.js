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

  return promisifyRun(sql, [
    featureId.toString(),
    (props.padron ?? props.PADRON)?.toString() || null,
    props.dist ?? props.DIST ?? null,
    props.zona ?? props.ZONA ?? null,
    props.mz ?? props.MZ ?? null,
    props.lote ?? props.LOTE ?? null,
    JSON.stringify(feature),
    minX, minY, maxX, maxY
  ]).catch(err => {
    cacheLog('save_feature_error', { featureId, error: err.message });
    throw err;
  });
}

export function getFeaturesByBbox(minX, minY, maxX, maxY) {
  return promisify(
    `SELECT geojson FROM parcelas WHERE (minX <= ? AND maxX >= ?) AND (minY <= ? AND maxY >= ?)`,
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
    `SELECT geojson FROM parcelas WHERE minX <= ? AND maxX >= ? AND minY <= ? AND maxY >= ?`,
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
