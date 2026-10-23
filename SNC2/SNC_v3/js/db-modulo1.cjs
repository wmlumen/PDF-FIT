/**
 * db-modulo1.cjs — Persistencia del "Módulo 1" (experimental).
 *
 * Este módulo es ADITIVO: no toca el esquema de `db.cjs` ni sus grupos existentes.
 * Provee los 5 métodos que `server-api.cjs` (stub) necesita y que `db.cjs` no define:
 *   modulo1Estado, modulo1Coordinates, modulo1Certificate, modulo1Validate, modulo1Export
 *
 * Estado: PENDIENTE / experimental. Ver docs/SERVER_API_CJS_PENDIENTE.md
 *
 * Uso (cuando se quiera activar el stub):
 *   const { dbAPI } = require('./db.cjs');
 *   const modulo1 = require('./js/db-modulo1.cjs');
 *   Object.assign(dbAPI, modulo1);
 */

const { existsSync, mkdirSync, appendFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const DATA_DIR = process.env.SNC_DATA_DIR || join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const M1_LOG = join(DATA_DIR, 'modulo1.log');
const M1_STORE = join(DATA_DIR, 'modulo1.json');

function log(event, meta = {}) {
  try {
    appendFileSync(M1_LOG, JSON.stringify({ ts: new Date().toISOString(), event, ...meta }) + '\n', 'utf8');
  } catch {
    /* el logging nunca debe romper la operación */
  }
}

function readStore() {
  try {
    if (!existsSync(M1_STORE)) return { coordenadas: {}, certificados: {}, validaciones: {}, exportaciones: {} };
    const parsed = JSON.parse(readFileSync(M1_STORE, 'utf8'));
    return {
      coordenadas: parsed.coordenadas || {},
      certificados: parsed.certificados || {},
      validaciones: parsed.validaciones || {},
      exportaciones: parsed.exportaciones || {},
    };
  } catch (error) {
    log('store_read_error', { error: error.message });
    return { coordenadas: {}, certificados: {}, validaciones: {}, exportaciones: {} };
  }
}

function writeStore(store) {
  try {
    appendFileSync(M1_STORE, JSON.stringify(store), 'utf8');
  } catch (error) {
    log('store_write_error', { error: error.message });
  }
}

/** Estado general del módulo 1 para el usuario. */
async function modulo1Estado(userId) {
  const store = readStore();
  return {
    userId,
    coordenadas: (store.coordenadas[userId] || []).length,
    certificados: (store.certificados[userId] || []).length,
    validaciones: (store.validaciones[userId] || []).length,
    exportaciones: (store.exportaciones[userId] || []).length,
    listo: true,
    pendiente: ['login', 'proyectos', 'expedientes', 'pagos', 'health'],
  };
}

/** Coordenadas registradas por el usuario. */
async function modulo1Coordinates(userId) {
  const store = readStore();
  return store.coordenadas[userId] || [];
}

/** Certificados emitidos al usuario. */
async function modulo1Certificate(userId) {
  const store = readStore();
  return store.certificados[userId] || [];
}

/** Validación de geometría/atributos (implementación mínima y determinista). */
async function modulo1Validate(userId, payload = {}) {
  const features = Array.isArray(payload?.geojson?.features) ? payload.geojson.features : [];
  const errores = [];
  if (!features.length) errores.push('Sin geometrías para validar');
  features.forEach((feature, index) => {
    if (!feature?.geometry?.type) errores.push(`Feature ${index + 1}: geometría ausente`);
  });
  const resultado = {
    userId,
    valido: errores.length === 0,
    total: features.length,
    errores,
    ts: new Date().toISOString(),
  };
  const store = readStore();
  store.validaciones[userId] = [resultado, ...(store.validaciones[userId] || [])].slice(0, 100);
  writeStore(store);
  log('validate', { userId, total: features.length, errores: errores.length });
  return resultado;
}

/** Exportación: deja constancia y devuelve un resumen listo para el cliente. */
async function modulo1Export(userId, payload = {}) {
  const resultado = {
    userId,
    formato: payload?.formato || 'geojson',
    features: Array.isArray(payload?.geojson?.features) ? payload.geojson.features.length : 0,
    archivo: `modulo1_${userId}_${Date.now()}.${payload?.formato || 'geojson'}`,
    ts: new Date().toISOString(),
  };
  const store = readStore();
  store.exportaciones[userId] = [resultado, ...(store.exportaciones[userId] || [])].slice(0, 100);
  writeStore(store);
  log('export', { userId, formato: resultado.formato, features: resultado.features });
  return resultado;
}

module.exports = {
  modulo1Estado,
  modulo1Coordinates,
  modulo1Certificate,
  modulo1Validate,
  modulo1Export,
};
