import express from 'express';
import compression from 'compression';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PLANS, resolvePlan, canCreateProject, canCreateExpediente, canExport } from './js/plans.js';
import { ENV } from './config.env.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Backend de base de datos determinista (A1-3): DB_BACKEND=sqlite|firestore (default: sqlite)
const DB_BACKEND = process.env.DB_BACKEND || 'sqlite';
let dbModule;
if (DB_BACKEND === 'firestore') {
  try {
    dbModule = require('./js/firestore-db.cjs');
    logger.debug('[DB] Usando backend Firestore');
  } catch (err) {
    logger.error('[DB FATAL] Error cargando backend Firestore solicitado:', err.message);
    process.exit(1);
  }
} else {
  dbModule = require('./db.cjs');
  logger.debug('[DB] Usando backend SQLite');
}
const { dbAPI, migrateFromJson, runJsonMigration } = dbModule;
// Fase 11 (auditoria estrategica de modelo de datos, 2026-10-23): solo existe
// en el backend SQLite por ahora (db.cjs); con DB_BACKEND=firestore se omite
// en vez de romper el arranque — ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md.
const syncParcelasFromGeojson = dbModule.syncParcelasFromGeojson || (async () => []);

import { sendRecoveryEmail, sendWelcomeEmail, sendAdminAlert } from './js/mailer.js';
import * as redticketPkg from './js/redticket-api.cjs';
import { verifyWebhook } from './js/redticket-payments.js';
import { logger } from './js/logger.js';
const { hasRedTicketConfig, createCharge, getCharge, getCheckoutByToken } = redticketPkg;

const PORT = ENV.PORT;
const __dirname = join(process.cwd());
const JWT_SECRET = ENV.JWT_SECRET;
const JWT_EXPIRES = ENV.JWT_EXPIRES;

const app = express();

// Perf (auditoria rendimiento 2026-10-23, P-05): sin compresion, las respuestas
// JSON con GeoJSON/state_json y los estaticos .geojson viajaban sin gzip/brotli.
app.use(compression());

// Publicar únicamente recursos que el navegador necesita. Nunca servir la raíz
// del repositorio: contiene SQLite, hashes, configuración y código backend.
const STATIC_OPTIONS = { dotfiles: 'deny', fallthrough: true, index: false, maxAge: ENV.NODE_ENV === 'production' ? '1h' : 0 };
app.use('/css', express.static(join(__dirname, 'css'), STATIC_OPTIONS));
app.use('/js', express.static(join(__dirname, 'js'), STATIC_OPTIONS));
app.use('/img', express.static(join(__dirname, 'img'), STATIC_OPTIONS));
// Fix P3-4 (2026-10-19): index.html referencia /favicon.svg pero no existía y
// no había ruta que lo sirviera (404). Se publica como recurso estático.
app.get('/favicon.svg', (req, res) => res.sendFile(join(__dirname, 'favicon.svg')));
app.get('/apple-touch-icon.png', (req, res) => res.sendFile(join(__dirname, 'apple-touch-icon.png')));

const PUBLIC_HTML_FILES = new Map([
  ['/index.html', 'index.html'],
  ['/login-directo.html', 'login-directo.html'],
  ['/login-safe.html', 'login-safe.html'],
  ['/register.html', 'register.html'],
  ['/recover.html', 'recover.html'],
  ['/terms.html', 'terms.html'],
  ['/privacy.html', 'privacy.html']
]);

for (const [route, file] of PUBLIC_HTML_FILES) {
  app.get(route, (req, res) => res.sendFile(join(__dirname, file)));
}

// Municipal app (presentación oficial Ley 3966/2010)
app.get(['/municipal', '/municipal/', '/municipal/index.html', '/index-municipal.html'], (req, res) => {
  res.sendFile(join(__dirname, 'municipal', 'index.html'));
});

// Portal Ciudadano (consulta pública de parcelas catastrales SNC 551/2023)
app.get(['/ciudadano', '/ciudadano/', '/ciudadano/index.html', '/index-ciudadano.html'], (req, res) => {
  res.sendFile(join(__dirname, 'ciudadano', 'index.html'));
});

// Portal Notarial (Escribanías Públicas & Seguridad Inmobiliaria)
app.get(['/notarial', '/notarial/', '/notarial/index.html', '/Notarial', '/Notarial/', '/Notarial/index.html', '/index-notarial.html'], (req, res) => {
  res.sendFile(join(__dirname, 'notarial', 'index.html'));
});

// Portal Administrador / Super Administrador
app.get(['/admin', '/admin/', '/admin/index.html', '/superadmin', '/superadmin/', '/superadmin/index.html'], (req, res) => {
  res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// Único dataset local requerido por la validación geográfica del frontend.
app.get('/data/DISTRITOS_PY_CNPV2022.geojson', (req, res) => {
  res.sendFile(join(__dirname, 'data', 'DISTRITOS_PY_CNPV2022.geojson'));
});
// Capa de referencia nacional (grupo "Paraguay" del panel): versiones ligeras,
// aptas para cargarse enteras en el navegador (no el corpus crudo de 1.Paraguay/).
app.get('/data/deptos_py_light.geojson', (req, res) => {
  res.sendFile(join(__dirname, 'data', 'deptos_py_light.geojson'));
});
app.get('/data/distritos_py_light.geojson', (req, res) => {
  res.sendFile(join(__dirname, 'data', 'distritos_py_light.geojson'));
});
// Datos municipales (capas por municipio, ej: piribebuy) — única carpeta de datos municipales.
// Carpeta canónica numerada (ver AGENTS.md §3.1): data/2.Municipal/<muniId>/...
app.use('/data/municipal', express.static(join(__dirname, 'data', '2.Municipal'), STATIC_OPTIONS));
// Alias retrocompatible: /data/piribebuy → /data/municipal/piribebuy.
app.use('/data/piribebuy', express.static(join(__dirname, 'data', '2.Municipal', 'piribebuy'), STATIC_OPTIONS));

// Dependencias del frontend servidas localmente (sin depender de CDNs).
// Whitelist explícita: nunca se sirve node_modules/ completo.
const VENDOR_FILES = new Map([
  ['/vendor/leaflet.js', 'node_modules/leaflet/dist/leaflet.js'],
  ['/vendor/leaflet.css', 'node_modules/leaflet/dist/leaflet.css'],
  ['/vendor/turf.min.js', 'node_modules/@turf/turf/turf.min.js'],
  ['/vendor/proj4.js', 'node_modules/proj4/dist/proj4.js'],
  ['/vendor/xlsx.full.min.js', 'node_modules/xlsx/dist/xlsx.full.min.js'],
  ['/vendor/xlsx.mjs', 'node_modules/xlsx/xlsx.mjs'],
  ['/vendor/jszip.min.js', 'node_modules/jszip/dist/jszip.min.js'],
  ['/vendor/jspdf.umd.min.js', 'node_modules/jspdf/dist/jspdf.umd.min.js'],
  ['/vendor/jspdf.plugin.autotable.min.js', 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js'],
  ['/vendor/shpwrite.js', 'node_modules/shp-write/shpwrite.js'],
  ['/vendor/dxf-parser.js', 'node_modules/dxf-parser/dist/dxf-parser.js'],
  ['/vendor/dom-to-image.min.js', 'node_modules/dom-to-image/dist/dom-to-image.min.js'],
  ['/vendor/docx.mjs', 'node_modules/docx/dist/index.mjs']
]);
for (const [route, rel] of VENDOR_FILES) {
  app.get(route, (req, res) => res.sendFile(join(__dirname, rel)));
}

// Font Awesome (CSS + webfonts): se sirve el paquete completo (solo CSS/fuentes).
app.use('/vendor/fontawesome', express.static(join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.argv.includes('--migrate')) {
  runJsonMigration().then(() => dbAPI.users.ensureAdmin()).then(() => {
    logger.debug('[MIGRATE] Migración completada');
    // keep process alive for server start if needed after script finishes
  }).catch(err => {
    logger.error('[MIGRATE] Error:', err);
  });
} else {
  setImmediate(() => {
    dbAPI.users.ensureAdmin().then(() => {
      logger.debug('[BOOT] Inicialización de usuarios completada');
    }).catch(err => logger.error('[BOOT] Error inicializando usuarios:', err));
  });
}

function getTodayKey() { return new Date().toISOString().slice(0, 10); }
async function countExportsToday(userId) {
  const today = getTodayKey();
  const value = await dbAPI.usage.get(`exports:${userId}:${today}`);
  return Number(value) || 0;
}
async function incrementExportsToday(userId) {
  const today = getTodayKey();
  await dbAPI.usage.increment(`exports:${userId}:${today}`);
}

let firebaseAdminAuth = null;
try {
  const admin = require('firebase-admin');
  if (admin.apps.length) firebaseAdminAuth = admin.auth();
} catch {}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {}
  if (firebaseAdminAuth) {
    try {
      const decoded = await firebaseAdminAuth.verifyIdToken(token);
      req.user = { userId: decoded.sub, email: decoded.email, role: decoded.role || 'member', provider: 'firebase' };
      return next();
    } catch (e) {}
  }
  return res.status(401).json({ error: 'Token inválido o expirado' });
}

async function adminMiddleware(req, res, next) {
  try {
    let user = await dbAPI.users.findById(req.user.userId);
    if ((!user || !user.id) && req.user.provider === 'firebase' && req.user.email) {
      user = await dbAPI.users.findByEmail(req.user.email);
    }
    if (!user || user.status !== 'active' || (!['superadmin', 'admin', 'admin_municipal', 'admin_notarial'].includes(user.role))) {
      return res.status(403).json({ error: 'Se requiere rol administrador' });
    }
    req.member = user;
    next();
  } catch (error) {
    logger.error('admin authorization error', error);
    res.status(500).json({ error: 'Error verificando permisos' });
  }
}

function hashPasswordBcrypt(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(hash, plaintext) {
  if (!hash || !plaintext) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

const rateMap = new Map();
const sensitiveRateMap = new Map();
function getClientIdentifier(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  // Fix seguridad: NO usar User-Agent (fácil de evadir). Usar solo IP + token prefix
  const authHeader = req.headers.authorization || '';
  const tokenPart = authHeader.split(' ')[1];
  const tokenPrefix = tokenPart ? String(tokenPart).slice(0, 16) : '';
  if (req.user?.userId) return `u:${req.user.userId}`;
  return `${ip}|${tokenPrefix}`;
}
function rateLimit(req, res, next) {
  const key = getClientIdentifier(req);
  const now = Date.now();
  const window = ENV.RATE_LIMIT_WINDOW_MS;
  const limit = ENV.RATE_LIMIT_MAX;
  const entry = rateMap.get(key) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + window;
  }
  entry.count += 1;
  rateMap.set(key, entry);
  if (entry.count > limit) {
    return res.status(429).json({ error: 'Demasiadas solicitudes', retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
  }
  next();
}
function sensitiveRateLimit(req, res, next) {
  const isSensitive = req.path.startsWith('/api/auth/') || req.path.startsWith('/api/admin/');
  if (!isSensitive) return next();
  const key = getClientIdentifier(req);
  const now = Date.now();
  const window = Math.max(ENV.RATE_LIMIT_WINDOW_MS, 60_000);
  const limit = Math.min(ENV.RATE_LIMIT_MAX, 60);
  const entry = sensitiveRateMap.get(key) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + window;
  }
  entry.count += 1;
  sensitiveRateMap.set(key, entry);
  if (entry.count > limit) {
    return res.status(429).json({ error: 'Demasiadas solicitudes en endpoint sensible', retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
  }
  next();
}

app.use(rateLimit);
app.use(sensitiveRateLimit);

function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function sanitizeClientState(state) {
  if (!state || typeof state !== 'object') return state;
  const out = { ...state };
  if (typeof out.geojson === 'string') {
    try { out.geojson = JSON.parse(out.geojson); } catch { delete out.geojson; }
  }
  if (typeof out.excelData === 'string') {
    try { out.excelData = JSON.parse(out.excelData); } catch { delete out.excelData; }
  }
  return out;
}

function sanitizeFilesArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 200).map((item, index) => ({
    id: String(item?.id || `file-${index}-${Date.now()}`),
    name: String(item?.name || '').slice(0, 120),
    size: Number(item?.size) || 0,
    type: String(item?.type || '').slice(0, 80),
    url: String(item?.url || '').slice(0, 500),
    created_at: new Date().toISOString()
  }));
}

function sanitizeBuyer(input) {
  const buyer = input && typeof input === 'object' ? input : {};
  return {
    name: String(buyer.name || '').trim().slice(0, 120),
    email: String(buyer.email || '').trim().slice(0, 160),
    document: String(buyer.document || '').trim().slice(0, 40),
    phone: String(buyer.phone || '').trim().slice(0, 40)
  };
}

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const allowed = ENV.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes(origin)) return res.status(403).json({ error: 'Origin no permitido' });
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; connect-src 'self' https://www.catastro.gov.py https://firestore.googleapis.com https://secure.retarget.com https://api.redticket.com.py; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://secure.retarget.com https://api.redticket.com.py;");
  if (ENV.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    const probe = await dbAPI.health();
    const dbOk = !!(probe && probe.ok);
    if (!dbOk) return res.status(503).json({ status: 'degraded', ts: new Date().toISOString(), db: false, error: probe?.error || 'DB no disponible' });
    return res.json({ status: 'ok', ts: new Date().toISOString(), db: true });
  } catch {
    return res.status(503).json({ status: 'degraded', ts: new Date().toISOString(), db: false });
  }
});

// Pilar 2: Endpoint soberano de teselas vectoriales (R-Tree, SQLite, offline-capable)
// GET /api/v3/catastro/vector-view?minX=&minY=&maxX=&maxY=
// Devuelve FeatureCollection de parcelas colindantes con el bbox visible del mapa.
app.get('/api/v3/catastro/vector-view', async (req, res) => {
  try {
    let { minX, minY, maxX, maxY } = req.query;
    minX = Number(minX);
    minY = Number(minY);
    maxX = Number(maxX);
    maxY = Number(maxY);
    if (Number.isNaN(minX) || Number.isNaN(minY) || Number.isNaN(maxX) || Number.isNaN(maxY)) {
      return res.status(400).json({ error: 'Faltan o son inválidos los parámetros minX, minY, maxX, maxY' });
    }
    // Uso del índice R-Tree para búsqueda ultra-rápida (< 3ms)
    const { db } = await import('/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/cacheDb.js');
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, padron, distrito, zona, mz, lote, geojson,
                (maxX - minX) AS widthM, (maxY - minY) AS heightM
         FROM idx_parcelas_geometria
         WHERE minX <= ? AND maxX >= ? AND minY <= ? AND maxY >= ?
         LIMIT 3000`,
        [maxX, minX, maxY, minY],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    const features = rows.map(r => ({
      type: 'Feature',
      id: r.id,
      properties: {
        id: r.id,
        padron: r.padron,
        distrito: r.distrito,
        zona: r.zona,
        mz: r.mz,
        lote: r.lote,
        widthM: r.widthM,
        heightM: r.heightM
      },
      geometry: JSON.parse(r.geojson).geometry
    }));
    return res.json({ type: 'FeatureCollection', features, count: features.length });
  } catch (e) {
    logger.error('vector-view error', e);
    return res.status(500).json({ error: 'Error consultando teselas', detail: e.message });
  }
});

// ==========================================
// ENDPOINTS MAG PARAGUAY - Capas Agropecuarias y Trazabilidad (Ciclo 15 días)
// ==========================================
let magManagerInstance = null;
async function getMagManager() {
  if (!magManagerInstance) {
    const { db } = await import('/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/cacheDb.js');
    const { MagSyncManager } = await import('./magSync.js');
    magManagerInstance = new MagSyncManager(db);
  }
  return magManagerInstance;
}

app.get('/api/v3/mag/catalog', async (req, res) => {
  try {
    const manager = await getMagManager();
    const catalog = await manager.getCatalog();
    res.json(catalog);
  } catch (e) {
    logger.error('Error obteniendo catálogo MAG:', e);
    res.status(500).json({ error: 'Error obteniendo catálogo MAG', detail: e.message });
  }
});

app.post('/api/v3/mag/sync', async (req, res) => {
  try {
    const manager = await getMagManager();
    const results = await manager.syncAll(true);
    res.json({ ok: true, cycleDays: 15, updated: results.length, layers: results });
  } catch (e) {
    logger.error('Error sincronizando capas MAG:', e);
    res.status(500).json({ error: 'Error sincronizando capas MAG', detail: e.message });
  }
});

for (const plan of Object.values(PLANS)) {
  dbAPI.plans.upsert(plan).catch(error => logger.error('plan seed error', error));
}

// ==================== ENDPOINTS MUNICIPALES (PORTAL CIUDADANO / PUBLICACIÓN) ====================
app.get('/api/municipal/:muniId/info', (req, res) => {
  const muniId = String(req.params.muniId || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(muniId)) {
    return res.status(400).json({ ok: false, error: 'Identificador municipal inválido' });
  }
  const infoPath = join(__dirname, 'data', '2.Municipal', muniId, 'info.json');
  if (!existsSync(infoPath)) {
    return res.status(404).json({ ok: false, error: 'Municipalidad no encontrada o sin datos publicados' });
  }
  try {
    const raw = readFileSync(infoPath, 'utf8');
    const info = JSON.parse(raw);
    return res.json({ ok: true, data: info });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Error al leer metadatos municipales' });
  }
});

app.get('/api/municipal/:muniId/parcelas', (req, res) => {
  const muniId = String(req.params.muniId || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(muniId)) {
    return res.status(400).json({ ok: false, error: 'Identificador municipal inválido' });
  }
  const parcelasPath = join(__dirname, 'data', '2.Municipal', muniId, 'parcelas.geojson');
  if (!existsSync(parcelasPath)) {
    return res.status(404).json({ ok: false, error: 'Parcelas no disponibles para esta municipalidad' });
  }
  res.setHeader('Content-Type', 'application/json');
  return res.sendFile(parcelasPath);
});

app.post('/api/municipal/:muniId/publicar', authMiddleware, (req, res) => {
  const muniId = String(req.params.muniId || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(muniId)) {
    return res.status(400).json({ ok: false, error: 'Identificador municipal inválido' });
  }
  const geojson = req.body;
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    return res.status(400).json({ ok: false, error: 'El cuerpo debe ser un FeatureCollection GeoJSON válido' });
  }
  const muniDir = join(__dirname, 'data', '2.Municipal', muniId);
  if (!existsSync(muniDir)) {
    mkdirSync(muniDir, { recursive: true });
  }
  const parcelasPath = join(muniDir, 'parcelas.geojson');
  writeFileSync(parcelasPath, JSON.stringify(geojson, null, 2), 'utf8');

  // Actualizar o crear info.json
  const infoPath = join(muniDir, 'info.json');
  let info = {
    id: muniId,
    nombre: `Municipalidad de ${muniId.charAt(0).toUpperCase() + muniId.slice(1)}`,
    actualizado: new Date().toISOString().slice(0, 10),
    fuente: 'Dirección de Catastro Municipal'
  };
  if (existsSync(infoPath)) {
    try {
      info = JSON.parse(readFileSync(infoPath, 'utf8'));
      info.actualizado = new Date().toISOString().slice(0, 10);
    } catch {}
  }
  writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf8');

  return res.json({
    ok: true,
    message: 'Datos catastrales municipales publicados exitosamente',
    featuresCount: geojson.features.length,
    actualizado: info.actualizado
  });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_hash, password_hash_v2: _ph2, ...safeUser } = user;
    res.json({ user: { ...safeUser, plan: safeUser.plan || 'free' } });
  } catch (e) {
    logger.error('me error', e);
    res.status(500).json({ error: 'Error obteniendo sesión' });
  }
});

app.patch('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    await dbAPI.users.updateMembership(req.user.userId, { name });
    const user = await dbAPI.users.findById(req.user.userId);
    const { password_hash, password_hash_v2, ...safeUser } = user || {};
    res.json({ user: safeUser });
  } catch (error) {
    logger.error('profile update error', error);
    res.status(500).json({ error: 'No se pudo actualizar el perfil' });
  }
});

app.post('/api/map/snc-toggle', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findById(req.user.userId);
    const planType = resolvePlan(user?.plan || 'free').type;
    if (planType !== 'paid' && planType !== 'enterprise') {
      return res.status(403).json({ error: 'La capa SNC está disponible solo en planes pagos.' });
    }
    const { visible } = req.body || {};
    res.json({ allowed: true, visible: Boolean(visible), plan: user?.plan || 'free' });
  } catch (e) {
    logger.error('snc-toggle error', e);
    res.status(500).json({ error: 'Error validando acceso a capa SNC' });
  }
});

app.get('/api/plans', async (req, res) => {
  try { res.json(await dbAPI.plans.list(true)); }
  catch (error) {
    logger.error('plans list error; usando catálogo local:', error);
    res.json(Object.values(PLANS).filter(plan => plan.active !== false));
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordCheck = enforcePasswordPolicy(password);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !passwordCheck.ok) return res.status(400).json({ error: 'Email inválido o ' + passwordCheck.reason });
    const existing = await dbAPI.users.findByEmail(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Email ya registrado' });
    const isFirstUser = (await dbAPI.users.count()) === 0;
    const password_hash_v2 = await hashPasswordBcrypt(password);
    const newUser = { id: crypto.randomUUID(), email: normalizedEmail, password_hash: null, password_hash_v2, name: String(name || '').trim().slice(0, 120), plan: 'free', role: isFirstUser ? 'admin' : 'member', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await dbAPI.users.insert(newUser);
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, plan: newUser.plan, role: newUser.role, status: newUser.status } });
  } catch (e) {
    logger.error('register error', e);
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await dbAPI.users.findByEmail(String(email || '').trim().toLowerCase());
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Usuario suspendido o inactivo' });

    // Fix P0-7 (2026-10-19): soportar hash legacy SHA-256 (A-03) antes de bcrypt.
    // El legacy es sha256(password) sin sal; tras validar, se migra a bcrypt v2.
    let valid = await verifyPassword(user.password_hash_v2, password);
    if (!valid && user.password_hash && !user.password_hash_v2) {
      const legacyHash = crypto.createHash('sha256').update(String(password)).digest('hex');
      valid = legacyHash === user.password_hash;
    }
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Migración a bcrypt v2 en segundo plano (si el usuario era legacy).
    if (!user.password_hash_v2) {
      const password_hash_v2 = await hashPasswordBcrypt(password);
      const now = new Date().toISOString();
      dbAPI.users.updateHashV2(user.id, password_hash_v2, now).then(() => dbAPI.users.clearLegacyHash(user.id, now)).catch(err => logger.error('rehash/clear legacy error', err));
    }

    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
    const isSameIp = await dbAPI.users.findByIp(ip || '');
    dbAPI.users.updateLoginIp(user.id, ip).catch(err => logger.error('login ip error', err));
    dbAPI.users.insertIpEvent({ ip, user_id: user.id, event: 'login' }).catch(err => logger.error('ip event error', err));
    const stats = (await dbAPI.users.getStats(user.id)) || {};
    const sameIpUsers = isSameIp || [];

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role, status: user.status, department: user.department || '', last_login_ip: ip }, stats, sameIpUsers });
  } catch (e) {
    logger.error('login error', e);
    res.status(500).json({ error: 'Error iniciando sesión' });
  }
});

app.post('/api/auth/recover', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await dbAPI.users.findByEmail(normalizedEmail);
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return res.json({ success: true, message: 'Si el correo existe, se ha enviado un enlace de recuperación.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiration
    
    await dbAPI.recovery.deleteByEmail(normalizedEmail); // Delete previous tokens
    await dbAPI.recovery.insert({ token, email: normalizedEmail, expires_at: expiresAt });

    const recoveryLink = `${req.protocol === 'https' || req.get('X-Forwarded-Proto') === 'https' ? 'https' : 'http'}://${req.get('host')}/recover.html?token=${token}`;
    try {
      await sendRecoveryEmail({ to: normalizedEmail, name: user?.name, recoveryLink });
    } catch (mailErr) {
      logger.error('[MAIL] recovery email error', mailErr);
    }

    res.json({ success: true, message: 'Enlace de recuperación generado.' });
  } catch (e) {
    logger.error('recover error', e);
    res.status(500).json({ error: 'Error al procesar recuperación' });
  }
});

const USER_ROLES = new Set(['superadmin', 'admin', 'admin_municipal', 'admin_notarial', 'manager', 'professional', 'notary', 'technician', 'member', 'viewer']);
const USER_STATUSES = new Set(['active', 'suspended', 'inactive']);
const PLAN_TYPES = new Set(['free', 'paid', 'enterprise']);
const PLAN_ID_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REQUIREMENTS = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo.`;

app.post('/api/auth/reset', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Token inválido o ' + PASSWORD_REQUIREMENTS });
    }

    const recoveryRecord = await dbAPI.recovery.findByToken(token);
    if (!recoveryRecord) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    if (new Date() > new Date(recoveryRecord.expires_at)) {
      await dbAPI.recovery.deleteByToken(token);
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    // Hashear nueva contraseña
    const password_hash_v2 = await hashPasswordBcrypt(password);
    const now = new Date().toISOString();
    const user = await dbAPI.users.findByEmail(recoveryRecord.email);
    const userId = user?.id || recoveryRecord.email;
    await dbAPI.users.updateHashV2(userId, password_hash_v2, now).catch(() => {});
    
    // Borrar token
    await dbAPI.recovery.deleteByToken(token);

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (e) {
    logger.error('reset password error', e);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

// NUEVOS: Check y Logout de sesión
app.get('/api/auth/check', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findById(req.user.userId);
    if (!user || user.status !== 'active') {
      return res.json({ authenticated: false, user: null });
    }
    res.json({ authenticated: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
  } catch (e) {
    logger.error('check auth error', e);
    res.status(500).json({ authenticated: false, error: 'Error verificando sesión' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    // En un entorno con httpOnly cookies, aquí se invalidaría la sesión
    // Por ahora,limpiar el token local
    res.json({ success: true, message: 'Cierre de sesión exitoso' });
  } catch (e) {
    logger.error('logout error', e);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

function enforcePasswordPolicy(password) {
  const reason = [];
  if (String(password).length < MIN_PASSWORD_LENGTH) reason.push('longitud mínima 8');
  if (!/[A-Z]/.test(password)) reason.push('una mayúscula');
  if (!/[a-z]/.test(password)) reason.push('una minúscula');
  if (!/[0-9]/.test(password)) reason.push('un número');
  if (!/[^A-Za-z0-9]/.test(password)) reason.push('un símbolo');
  if (reason.length) return { ok: false, reason: `Contraseña insegura: faltan ${reason.join(', ')}.` };
  return { ok: true };
}

// Almacenamiento efímero para proyectos temporales en memoria.
// Se pierde al cerrar el servidor; no cumple límites de plan.
const tempProjects = new Map();

app.get('/api/admin/members', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await dbAPI.users.list();
    const planCache = new Map();
    const out = [];
    for (const u of users) {
      const { password_hash, password_hash_v2: _ph2, ...safeUser } = u;
      const plan = planCache.get(u.plan) || await dbAPI.plans.findById(u.plan);
      planCache.set(u.plan, plan);
      const projectRows = await dbAPI.projects.findByUser(u.id);
      out.push({
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
        status: safeUser.status,
        plan: safeUser.plan,
        plan_name: plan?.name || u.plan,
        plan_type: plan?.type || 'free',
        plan_currency: plan?.currency || 'GS',
        plan_price: plan?.price || 0,
        project_count: projectRows.length,
        project_limit: plan?.limits?.projects || 0,
        project_free: Math.max(0, (plan?.limits?.projects || 0) - projectRows.length),
        limits: plan?.limits || {},
        created_at: u.created_at,
        updated_at: u.updated_at
      });
    }
    res.json(out);
  } catch (error) { logger.error('members list error', error); res.status(500).json({ error: 'Error listando miembros' }); }
});

app.post('/api/admin/members', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, role, plan, status } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordCheck = enforcePasswordPolicy(password);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !passwordCheck.ok) return res.status(400).json({ error: 'Email inválido o ' + passwordCheck.reason });
    
    if (role && !USER_ROLES.has(role)) return res.status(400).json({ error: 'Tipo de usuario inválido' });
    if (status && !USER_STATUSES.has(status)) return res.status(400).json({ error: 'Estado de usuario inválido' });
    
    if (plan) {
      const planObj = await dbAPI.plans.findById(plan);
      if (!planObj || !planObj.active) return res.status(400).json({ error: 'Plan inválido o inactivo' });
    }
    
    const existing = await dbAPI.users.findByEmail(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Email ya registrado' });

    const password_hash_v2 = await hashPasswordBcrypt(password);
    const newUser = { 
      id: crypto.randomUUID(), 
      email: normalizedEmail, 
      password_hash: null, 
      password_hash_v2, 
      name: String(name || '').trim().slice(0, 120), 
      plan: plan || 'free', 
      role: role || 'member', 
      status: status || 'active', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };
    await dbAPI.users.insert(newUser);
    const { password_hash, password_hash_v2: p2, ...safeUser } = newUser;
    try {
      await sendWelcomeEmail({ to: newUser.email, name: newUser.name, role: newUser.role });
    } catch (mailErr) {
      logger.error('[MAIL] welcome email error', mailErr);
    }
    res.status(201).json(safeUser);
  } catch (error) {
    logger.error('member create error', error);
    res.status(500).json({ error: 'Error creando miembro' });
  }
});

app.patch('/api/admin/members/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const target = await dbAPI.users.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Miembro no encontrado' });
    const fields = {};
    if (req.body.name !== undefined) fields.name = String(req.body.name).trim().slice(0, 120);
    if (req.body.role !== undefined) {
      if (!USER_ROLES.has(req.body.role)) return res.status(400).json({ error: 'Tipo de usuario inválido' });
      fields.role = req.body.role;
    }
    if (req.body.status !== undefined) {
      if (!USER_STATUSES.has(req.body.status)) return res.status(400).json({ error: 'Estado de usuario inválido' });
      fields.status = req.body.status;
    }
    if (req.body.plan !== undefined) {
      const plan = await dbAPI.plans.findById(req.body.plan);
      if (!plan || !plan.active) return res.status(400).json({ error: 'Plan inválido o inactivo' });
      fields.plan = plan.id;
    }
    if (target.id === req.user.userId && ((fields.role && fields.role !== 'admin') || (fields.status && fields.status !== 'active'))) return res.status(409).json({ error: 'No puede retirar su propio acceso administrativo' });
    await dbAPI.users.updateMembership(target.id, fields);
    const updated = await dbAPI.users.findById(target.id);
    const { password_hash, password_hash_v2, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error) { logger.error('member update error', error); res.status(500).json({ error: 'Error actualizando miembro' }); }
});

app.get('/api/admin/plans', authMiddleware, adminMiddleware, async (req, res) => {
  try { 
    const plans = await dbAPI.plans.list(false);
    const stats = await dbAPI.plans.getStats();
    const merged = plans.map(p => {
      const pStat = stats.find(s => s.plan_id === p.id) || { consultados: 0, concretados: 0, active_users: 0 };
      return { ...p, stats: pStat };
    });
    res.json(merged);
  }
  catch (error) { logger.error('admin plans list error', error); res.status(500).json({ error: 'Error listando planes' }); }
});

app.put('/api/admin/plans/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || '').toLowerCase();
    const { name, type, price, currency = 'USD', limits = {}, features = [], watermark = true, active = true } = req.body || {};
    if (!PLAN_ID_PATTERN.test(id) || !String(name || '').trim() || !PLAN_TYPES.has(type)) return res.status(400).json({ error: 'Identificador, nombre o tipo de plan inválido' });
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || (type === 'free' && numericPrice !== 0)) return res.status(400).json({ error: 'Precio inválido; un plan gratuito debe valer 0' });
    if (!limits || typeof limits !== 'object' || Array.isArray(limits) || !Array.isArray(features)) return res.status(400).json({ error: 'Límites o funcionalidades inválidos' });
    const sanitizedLimits = {};
    for (const [key, value] of Object.entries(limits)) {
      const number = Number(value);
      if (!/^[A-Za-z][A-Za-z0-9]{1,40}$/.test(key) || !Number.isInteger(number) || number < 0) return res.status(400).json({ error: `Límite inválido: ${key}` });
      sanitizedLimits[key] = number;
    }
    await dbAPI.plans.upsert({ id, name: String(name).trim().slice(0, 80), type, price: numericPrice, currency: String(currency).toUpperCase().slice(0, 3), limits: sanitizedLimits, features: features.map(item => String(item).trim().slice(0, 160)).filter(Boolean).slice(0, 30), watermark: Boolean(watermark), active: Boolean(active) });
    res.json(await dbAPI.plans.findById(id));
  } catch (error) { logger.error('plan upsert error', error); res.status(500).json({ error: 'Error guardando plan' }); }
});

app.get('/api/admin/members/:id/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await dbAPI.users.getStats(req.params.id);
    const sameIpUsers = await dbAPI.users.listByIp(req.params.id).catch(() => []);
    res.json({ stats: stats || {}, sameIpUsers });
  } catch (error) { logger.error('admin member stats error', error); res.status(500).json({ error: 'Error obteniendo estadísticas' }); }
});

app.post('/api/admin/members/:id/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = req.body && typeof req.body === 'object' ? req.body : {};
    await dbAPI.users.updateStats(req.params.id, stats);
    res.json({ ok: true, stats });
  } catch (error) { logger.error('admin member stats update error', error); res.status(500).json({ error: 'Error actualizando estadísticas' }); }
});

app.post('/api/admin/members/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason, blocked_until } = req.body || {};
    const user = await dbAPI.users.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const currentBlocked = user.blocked_until ? new Date(user.blocked_until) > new Date() : false;
    const nextStatus = currentBlocked ? 'active' : 'suspended';
    const nextBlockedUntil = currentBlocked ? null : (blocked_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    const nextReason = currentBlocked ? null : (String(reason || 'Bloqueo administrativo').slice(0, 160));
    await dbAPI.users.setBlocked(req.params.id, nextReason, nextBlockedUntil);
    await dbAPI.users.updateMembership(req.params.id, { status: nextStatus });
    res.json({ ok: true, status: nextStatus, blocked_until: nextBlockedUntil });
  } catch (error) { logger.error('admin member block error', error); res.status(500).json({ error: 'Error cambiando estado de bloqueo' }); }
});

app.get('/api/admin/ips/:ip/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await dbAPI.users.listByIp(req.params.ip);
    res.json(users);
  } catch (error) { logger.error('admin ip users error', error); res.status(500).json({ error: 'Error consultando usuarios por IP' }); }
});

// Fix P0-8 (2026-10-19): la PK de projects es TEXT (uuid) según el contrato
// db-contract. La DB heredada conserva filas con id INTEGER, por eso
// POST /api/projects devolvía {"id":19864}. Normaliza a uuid para que
// proyectos/expedientes/temp_projects compartan identificador.
function normalizeProjectId(id) {
  const value = String(id ?? '').trim();
  if (!value) return crypto.randomUUID();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
  return crypto.randomUUID();
}

app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findByEmail(req.user.email);
    const projects = await dbAPI.projects.findByUser(req.user.userId);
    const plan = await dbAPI.plans.getById(user?.plan || 'free');
    const limits = plan ? safeJsonParse(plan.limits_json, {}) : {};
    const maxProjects = Number(limits.projects || 1);
    const withCounts = await Promise.all(projects.map(async project => {
      const projectId = normalizeProjectId(project.id);
      let expedientes = [];
      try {
        const rows = await dbAPI.expedientes.findByProject(projectId);
        expedientes = Array.isArray(rows) ? rows : [];
      } catch (error) {
        logger.warn('no se pudieron contar expedientes del proyecto', error?.message);
      }
      return { ...project, id: projectId, expedientes: expedientes.length, expedienteLimit: Number(limits.expedientesPerProject || 2) };
    }));
    res.json({ projects: withCounts, limit: maxProjects, usage: projects.length, maxExpedientes: Number(limits.expedientesPerProject || 2), planLimits: limits });
  } catch (err) {
    logger.error('list projects error', err);
    res.status(500).json({ error: 'Error listando proyectos' });
  }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAPI.projects.findByUser(req.user.userId);
    const projectsCount = rows.length;
    const user = await dbAPI.users.findByEmail(req.user.email);
    if (!canCreateProject(user?.plan, projectsCount)) {
      return res.status(403).json({ error: 'Límite de proyectos alcanzado para tu plan', code: 'PLAN_LIMIT' });
    }
    const { name } = req.body || {};
    // Fix P0-8 (2026-10-19): el proyecto ya se crea con uuid; el nombre se
    // limpia sin depender de un helper inexistente.
    const projectName = String(name ?? '').trim().slice(0, 120) || 'Proyecto sin nombre';
    // Fix P0-8 (2026-10-19): promisifyRun resuelve {changes,lastID}; lastID no
    // existe en sqlite3, por eso el id devuelto era undefined/numérico.
    const project = { id: crypto.randomUUID(), user_id: req.user.userId, name: projectName, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await dbAPI.projects.insert(project);
    res.status(201).json(project);
  } catch (err) {
    logger.error('create project error', err);
    res.status(500).json({ error: 'Error creando proyecto' });
  }
});

app.delete('/api/projects/:id', authMiddleware, (req, res) => {
  const projectId = normalizeProjectId(req.params.id);
  dbAPI.projects.findById(projectId).then(project => {
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    return dbAPI.expedientes.deleteByProject(projectId).then(() => dbAPI.projects.deleteById(projectId));
  }).then(() => {
    res.json({ ok: true });
  }).catch(err => {
    logger.error('delete project error', err);
    res.status(500).json({ error: 'Error eliminando proyecto' });
  });
});

app.post('/api/projects/temp', authMiddleware, (req, res) => {
  try {
    const state = req.body?.state_json || req.body?.state || null;
    const name = req.body?.name || 'Proyecto temporal';
    const projectId = crypto.randomUUID();
    const expedienteId = crypto.randomUUID();
    const tempProject = {
      id: projectId,
      user_id: req.user.userId,
      name: String(name).trim().slice(0, 120) || 'Proyecto temporal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expedientes: [
        {
          id: expedienteId,
          project_id: projectId,
          name: 'Expediente temporal',
          state_json: state ? JSON.stringify(state) : null,
          validation_results: null,
          files_json: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    tempProjects.set(projectId, tempProject);
    res.status(201).json({
      id: projectId,
      expediente_id: expedienteId,
      name: tempProject.name,
      temp: true,
      created_at: tempProject.created_at
    });
  } catch (err) {
    logger.error('create temp project error', err);
    res.status(500).json({ error: 'Error creando proyecto temporal' });
  }
});

app.get('/api/projects/temp', authMiddleware, (req, res) => {
  try {
    const userTemps = Array.from(tempProjects.values()).filter(p => p.user_id === req.user.userId);
    const list = userTemps.map(({ user_id, expedientes, ...rest }) => ({
      ...rest,
      expedientes: expedientes.map(({ project_id, ...e }) => e)
    }));
    res.json(list);
  } catch (err) {
    logger.error('list temp projects error', err);
    res.status(500).json({ error: 'Error listando proyectos temporales' });
  }
});

app.get('/api/projects/temp/:id', authMiddleware, (req, res) => {
  const project = tempProjects.get(req.params.id);
  if (!project || project.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Proyecto temporal no encontrado' });
  }
  const { user_id, expedientes, ...rest } = project;
  res.json({
    ...rest,
    expedientes: expedientes.map(({ project_id, ...e }) => e),
    temp: true
  });
});

app.post('/api/projects/temp/:id', authMiddleware, (req, res) => {
  const project = tempProjects.get(req.params.id);
  if (!project || project.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Proyecto temporal no encontrado' });
  }
  const state = req.body?.state_json || req.body?.state || null;
  const expediente = project.expedientes && project.expedientes[0];
  if (expediente) {
    expediente.state_json = state ? JSON.stringify(state) : null;
    expediente.updated_at = new Date().toISOString();
  }
  project.updated_at = new Date().toISOString();
  res.json({ ok: true, id: project.id, expediente_id: expediente ? expediente.id : null, temp: true });
});

app.get('/api/projects/:projectId/expedientes', authMiddleware, (req, res) => {
  const projectId = normalizeProjectId(req.params.projectId);
  dbAPI.projects.findById(projectId).then(project => {
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    return dbAPI.expedientes.findByProject(projectId);
  }).then(rows => {
    // Fix P0-8 (2026-10-19): rows.map lanzaba "rows.map is not a function" si
    // findByProject devolvía algo que no era un array (DB heredada con ids
    // enteros). Se normaliza a array antes de mapear.
    const list = Array.isArray(rows) ? rows : [];
    res.json(list.map(({ project_id, ...rest }) => rest));
  }).catch(err => {
    logger.error('expedientes list error', err);
    res.status(500).json({ error: 'Error listando expedientes' });
  });
});

app.post('/api/projects/:projectId/expedientes', authMiddleware, async (req, res) => {
  try {
    const project = await dbAPI.projects.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const rows = await dbAPI.expedientes.findByProject(req.params.projectId);
    const expedientesCount = rows.length;
    const user = await dbAPI.users.findByEmail(req.user.email);
    if (!canCreateExpediente(user?.plan, expedientesCount)) {
      return res.status(403).json({ error: 'Límite de expedientes alcanzado para tu plan', code: 'PLAN_LIMIT' });
    }
    const { name, state_json } = req.body || {};
    const sanitizedState = state_json ? sanitizeClientState(state_json) : null;
    const sanitizedStateJson = sanitizedState ? JSON.stringify(sanitizedState) : null;
    // Fix P0-8 (2026-10-19): project_id normalizado a uuid + id del expediente
    // tomado del objeto insertado (result.lastID no existe en sqlite3).
    const expedienteName = String(name ?? '').trim().slice(0, 120) || 'Expediente';
    const projectId = normalizeProjectId(req.params.projectId);
    const expediente = { id: crypto.randomUUID(), project_id: projectId, name: expedienteName, state_json: sanitizedStateJson, validation_results: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await dbAPI.expedientes.insert(expediente);
    // Fase 11: parcela como entidad direccionable (ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md).
    // Se sincroniza con el objeto ya sanitizado, no releido de la columna, para
    // no depender de como quede codificado state_json en la fila. Un error aca
    // no debe tumbar la creacion del expediente (ya persistido): se loguea y sigue.
    if (sanitizedState?.geojson) {
      try { await syncParcelasFromGeojson(expediente.id, sanitizedState.geojson); }
      catch (syncErr) { logger.error('sync parcelas (create) error', syncErr); }
    }
    res.status(201).json(expediente);
  } catch (err) {
    logger.error('create expediente error', err);
    res.status(500).json({ error: 'Error creando expediente' });
  }
});

app.get('/api/expedientes/:id', authMiddleware, async (req, res) => {
  try {
    const expediente = await dbAPI.expedientes.findById(req.params.id);
    const project = expediente ? await dbAPI.projects.findById(expediente.project_id) : null;
    if (!expediente || !project) return res.status(404).json({ error: 'Expediente no encontrado' });
    let state = null;
    if (expediente.state_json) {
      try { state = JSON.parse(expediente.state_json); }
      catch { return res.status(500).json({ error: 'JSON inválido en state_json' }); }
    }
    let validation_results = null;
    if (expediente.validation_results) {
      try { validation_results = JSON.parse(expediente.validation_results); }
      catch { return res.status(500).json({ error: 'JSON inválido en validation_results' }); }
    }
    res.json({
      id: expediente.id,
      project_id: expediente.project_id,
      name: expediente.name,
      state,
      validation_results,
      created_at: expediente.created_at,
      updated_at: expediente.updated_at
    });
  } catch (err) {
    logger.error('get expediente error', err);
    res.status(500).json({ error: 'Error obteniendo expediente' });
  }
});

app.put('/api/expedientes/:id', authMiddleware, async (req, res) => {
  try {
    const expediente = await dbAPI.expedientes.findById(req.params.id);
    const project = expediente ? await dbAPI.projects.findById(expediente.project_id) : null;
    if (!expediente || !project || project.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    const { state_json, validation_results, name } = req.body || {};
    const sanitizedState = state_json ? sanitizeClientState(state_json) : null;
    await dbAPI.expedientes.update(req.params.id, {
      name,
      state_json: sanitizedState ? JSON.stringify(sanitizedState) : null,
      validation_results: validation_results ? JSON.stringify(validation_results) : null
    });
    // Fase 11: ver nota equivalente en POST /api/projects/:projectId/expedientes.
    if (sanitizedState?.geojson) {
      try { await syncParcelasFromGeojson(req.params.id, sanitizedState.geojson); }
      catch (syncErr) { logger.error('sync parcelas (update) error', syncErr); }
    }
    res.json({ ok: true, updated_at: new Date().toISOString() });
  } catch (err) {
    logger.error('update expediente error', err);
    res.status(500).json({ error: 'Error actualizando expediente' });
  }
});

app.delete('/api/expedientes/:id', authMiddleware, (req, res) => {
  dbAPI.expedientes.findById(req.params.id).then(expediente => {
    const project = expediente ? dbAPI.projects.findById(expediente.project_id) : null;
    if (!expediente || !project) return res.status(404).json({ error: 'Expediente no encontrado' });
    return dbAPI.expedientes.deleteById(req.params.id);
  }).then(() => res.json({ ok: true })).catch(err => {
    logger.error('delete expediente error', err);
    res.status(500).json({ error: 'Error eliminando expediente' });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Fase 11 (auditoria estrategica de modelo de datos, 2026-10-23): parcela
// como entidad direccionable (CCC, matricula, propietario, linaje).
// Ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md.
// Cada endpoint verifica ownership expediente -> proyecto -> usuario (igual
// que PUT /api/expedientes/:id) para no agregar una IDOR nueva mientras C-04
// sigue abierto en el resto del archivo.
// ═══════════════════════════════════════════════════════════════════

async function loadOwnedExpediente(expedienteId, userId) {
  const expediente = await dbAPI.expedientes.findById(expedienteId);
  if (!expediente) return null;
  const project = await dbAPI.projects.findById(expediente.project_id);
  if (!project || project.user_id !== userId) return null;
  return { expediente, project };
}

async function loadOwnedParcela(parcelaId, userId) {
  const parcela = await dbAPI.parcelas.findById(parcelaId);
  if (!parcela) return null;
  const owned = await loadOwnedExpediente(parcela.expediente_id, userId);
  if (!owned) return null;
  return { parcela, ...owned };
}

app.get('/api/expedientes/:id/parcelas', authMiddleware, async (req, res) => {
  try {
    const owned = await loadOwnedExpediente(req.params.id, req.user.userId);
    if (!owned) return res.status(404).json({ error: 'Expediente no encontrado' });
    const parcelas = await dbAPI.parcelas.listByExpediente(req.params.id);
    const detalle = await Promise.all(parcelas.map(async (parcela) => ({
      ...parcela,
      cuenta_catastral: await dbAPI.cuentaCatastral.findByParcela(parcela.id),
      matricula: await dbAPI.matriculas.findByParcela(parcela.id),
      propietarios: await dbAPI.parcelaPropietario.listByParcela(parcela.id)
    })));
    res.json(detalle);
  } catch (err) {
    logger.error('list parcelas error', err);
    res.status(500).json({ error: 'Error listando parcelas' });
  }
});

app.get('/api/parcelas/:id', authMiddleware, async (req, res) => {
  try {
    const owned = await loadOwnedParcela(req.params.id, req.user.userId);
    if (!owned) return res.status(404).json({ error: 'Parcela no encontrada' });
    const { parcela } = owned;
    res.json({
      ...parcela,
      cuenta_catastral: await dbAPI.cuentaCatastral.findByParcela(parcela.id),
      matricula: await dbAPI.matriculas.findByParcela(parcela.id),
      propietarios: await dbAPI.parcelaPropietario.listByParcela(parcela.id)
    });
  } catch (err) {
    logger.error('get parcela error', err);
    res.status(500).json({ error: 'Error obteniendo parcela' });
  }
});

const TIPOS_RELACION_PARCELA = ['PROPIETARIO', 'COPROPIETARIO', 'POSEEDOR', 'USUFRUCTUARIO', 'ARRENDATARIO', 'HEREDERO'];

app.post('/api/parcelas/:id/propietarios', authMiddleware, async (req, res) => {
  try {
    const owned = await loadOwnedParcela(req.params.id, req.user.userId);
    if (!owned) return res.status(404).json({ error: 'Parcela no encontrada' });
    const { cedula, nombre, apellido, fecha_nacimiento, telefono, correo, tipo_relacion, porcentaje, fecha_desde, fecha_hasta } = req.body || {};
    const cedulaLimpia = String(cedula || '').trim();
    if (!cedulaLimpia) return res.status(400).json({ error: 'cedula requerida' });
    const tipo = TIPOS_RELACION_PARCELA.includes(tipo_relacion) ? tipo_relacion : 'PROPIETARIO';
    const persona = await dbAPI.personas.findOrCreateByCedula({
      cedula: cedulaLimpia,
      nombre: String(nombre || '').trim().slice(0, 120) || null,
      apellido: String(apellido || '').trim().slice(0, 120) || null,
      fecha_nacimiento: fecha_nacimiento || null,
      telefono: String(telefono || '').trim().slice(0, 40) || null,
      correo: String(correo || '').trim().slice(0, 160) || null
    });
    const pct = porcentaje === undefined || porcentaje === null || porcentaje === '' ? null : Number(porcentaje);
    const propietarios = await dbAPI.parcelaPropietario.upsert({
      parcela_id: req.params.id,
      persona_id: persona.id,
      tipo_relacion: tipo,
      porcentaje: Number.isFinite(pct) ? pct : null,
      fecha_desde: fecha_desde || null,
      fecha_hasta: fecha_hasta || null
    });
    res.status(201).json({ persona, propietarios });
  } catch (err) {
    logger.error('upsert propietario error', err);
    res.status(500).json({ error: 'Error registrando propietario' });
  }
});

app.get('/api/expedientes/:id/lineage', authMiddleware, async (req, res) => {
  try {
    const owned = await loadOwnedExpediente(req.params.id, req.user.userId);
    if (!owned) return res.status(404).json({ error: 'Expediente no encontrado' });
    res.json(await dbAPI.parcelLineage.listByExpediente(req.params.id));
  } catch (err) {
    logger.error('list lineage error', err);
    res.status(500).json({ error: 'Error listando linaje parcelario' });
  }
});

app.post('/api/expedientes/:id/lineage', authMiddleware, async (req, res) => {
  try {
    const owned = await loadOwnedExpediente(req.params.id, req.user.userId);
    if (!owned) return res.status(404).json({ error: 'Expediente no encontrado' });
    const { codigo_origen, codigo_destino, tipo_evento, fecha, meta } = req.body || {};
    if (!tipo_evento) return res.status(400).json({ error: 'tipo_evento requerido' });
    const entry = await dbAPI.parcelLineage.append({
      expediente_id: req.params.id,
      codigo_origen: codigo_origen ? String(codigo_origen).slice(0, 80) : null,
      codigo_destino: codigo_destino ? String(codigo_destino).slice(0, 80) : null,
      tipo_evento: String(tipo_evento).slice(0, 40),
      fecha: fecha || null,
      meta: meta && typeof meta === 'object' ? meta : null
    });
    res.status(201).json(entry);
  } catch (err) {
    logger.error('append lineage error', err);
    res.status(500).json({ error: 'Error registrando evento de linaje' });
  }
});

app.get('/api/expedientes/:id/files', authMiddleware, (req, res) => {
  dbAPI.expedientes.findById(req.params.id).then(expediente => {
    if (!expediente) return res.status(404).json({ error: 'Expediente no encontrado' });
    let files = [];
    if (expediente.files_json) {
      try { files = JSON.parse(expediente.files_json); }
      catch { return res.status(500).json({ error: 'JSON inválido en files_json' }); }
    }
    res.json(files);
  }).catch(err => {
    logger.error('list files error', err);
    res.status(500).json({ error: 'Error listando archivos' });
  });
});

app.post('/api/expedientes/:id/files', authMiddleware, (req, res) => {
  dbAPI.expedientes.findById(req.params.id).then(expediente => {
    if (!expediente) return res.status(404).json({ error: 'Expediente no encontrado' });
    const files = sanitizeFilesArray(req.body?.files || (req.body ? [req.body] : []));
    return dbAPI.expedientes.update(req.params.id, { files_json: JSON.stringify(files) });
  }).then(() => res.status(201).json({ ok: true })).catch(err => {
    logger.error('add file error', err);
    res.status(500).json({ error: 'Error agregando archivo' });
  });
});

app.delete('/api/expedientes/:id/files/:fileId', authMiddleware, (req, res) => {
  dbAPI.expedientes.findById(req.params.id).then(expediente => {
    if (!expediente) return res.status(404).json({ error: 'Expediente no encontrado' });
    let files = [];
    if (expediente.files_json) {
      try { files = JSON.parse(expediente.files_json); }
      catch { return res.status(500).json({ error: 'JSON inválido en files_json' }); }
    }
    const next = files.filter(f => f.id !== req.params.fileId);
    return dbAPI.expedientes.update(req.params.id, { files_json: JSON.stringify(next) });
  }).then(() => res.json({ ok: true })).catch(err => {
    logger.error('delete file error', err);
    res.status(500).json({ error: 'Error eliminando archivo' });
  });
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  try {
    let { html_content } = req.body || {};
    if (!html_content) return res.status(400).json({ error: 'Falta html_content' });
    // Fix seguridad: Sanitizar html_content para prevenir XSS almacenado
    // Eliminar scripts, event handlers y javascript: URLs
    html_content = html_content
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/ on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/ on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/<link\b[^>]*>/gi, '');
    const reportId = crypto.randomUUID();
    await dbAPI.public_reports.insert({
      id: reportId,
      user_id: req.user.userId,
      html_content
    });
    res.status(201).json({ id: reportId, url: `${req.protocol}://${req.get('host')}/report/${reportId}` });
  } catch (err) {
    logger.error('create report error', err);
    res.status(500).json({ error: 'Error creando reporte público' });
  }
});

app.get('/report/:id', authMiddleware, async (req, res) => {
  try {
    const report = await dbAPI.public_reports.findById(req.params.id);
    if (!report) return res.status(404).send('<h1>Reporte no encontrado</h1>');
    if (report.user_id !== req.user.userId) return res.status(403).send('<h1>No autorizado</h1>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(report.html_content);
  } catch (err) {
    logger.error('get report error', err);
    res.status(500).send('<h1>Error cargando reporte</h1>');
  }
});

app.post('/api/autocompletar', authMiddleware, async (req, res) => {
  try {
    const points = req.body || [];
    const out = [];
    for (const pt of (Array.isArray(points) ? points : [])) {
      try {
        // Fix seguridad: Validar que lat/lng sean números finitos antes de SQLite
        const lat = Number(pt.lat);
        const lng = Number(pt.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          out.push({ id: pt.id, properties: { NOTA: 'Coordenadas inválidas' } });
          continue;
        }
        const feature = await getFeatureContainingPoint(lat, lng);
        out.push({ id: pt.id, properties: feature ? feature.properties : { NOTA: 'Sin coincidencia en caché' } });
      } catch (e) {
        out.push({ id: pt.id, properties: { NOTA: 'Capa offline sin WFS en este backend' } });
      }
    }
    res.json(out);
  } catch (e) {
    logger.error('autocompletar', e);
    res.status(500).json({ error: 'Error procesando autocompletado' });
  }
});

// ==========================================
// ENDPOINT POSTGIS — Motor espacial (buffer 200m, catastro, hídrica)
// ==========================================
// Este endpoint delega al backend PostGIS las consultas espaciales pesadas:
// - ST_Buffer/ST_Touches/ST_Difference para gaps
// - ST_DWithin para restricción hídrica 30m
// - ST_Intersects para cruce catastral
app.get('/api/postgis/analisis-espacial', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, buffer_metros = 200 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Faltan parámetros lat, lng' });

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }
    const bufferM = Number(buffer_metros);
    if (!Number.isFinite(bufferM) || bufferM <= 0 || bufferM > 10000) {
      return res.status(400).json({ error: 'Buffer debe ser un número entre 1 y 10000' });
    }

    // Si hay PG_HOST configurado, ejecuta la consulta PostGIS
    if (process.env.PG_HOST && process.env.PG_DATABASE && process.env.PG_USER) {
      const { Client } = await import('pg').catch(() => ({ Client: null }));
      if (!Client) {
        return res.status(503).json({ error: 'Módulo pg no disponible. Instalar con: npm install pg' });
      }
      const client = new Client({
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT || 5432),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD || ''
      });
      await client.connect();
      try {
        // Consulta combinada: buffer, hidrografía 30m, cruce catastral
        const sql = `
          WITH punto AS (
            SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS geom
          ),
          buffer_zone AS (
            SELECT ST_Buffer(geom, $3)::geometry AS geom FROM punto
          )
          SELECT
            (SELECT json_agg(json_build_object('nombre', h.nombre, 'dist_m', ST_Distance(h.geom, (SELECT geom FROM punto))))
             FROM hidrografia_mades h
             WHERE ST_DWithin(h.geom, (SELECT geom FROM punto), 30.0)) AS hidrografia_cercana,
            (SELECT count(*) FROM parcelas_oficiales po
             WHERE ST_Intersects(po.geom, (SELECT geom FROM buffer_zone))) AS parcelas_en_buffer,
            (SELECT json_agg(json_build_object('id', po.id, 'dist_m', ST_Distance(po.geom, (SELECT geom FROM punto))))
             FROM parcelas_oficiales po
             WHERE ST_DWithin(po.geom, (SELECT geom FROM punto), 30.0)) AS restriccion_hidrica
        `;
        const result = await client.query(sql, [lngNum, latNum, bufferM]);
        await client.end();
        return res.json({
          source: 'postgis',
          buffer_m: bufferM,
          coordenadas: { lat: latNum, lng: lngNum },
          resultados: result.rows[0] || {}
        });
      } catch (pgErr) {
        await client.end().catch(() => {});
        logger.error('Error PostGIS:', pgErr.message);
        return res.status(502).json({ error: 'Error consultando PostGIS', detalle: pgErr.message });
      }
    }

    // Fallback: sin PostGIS, usar WFS del Catastro + caché local
    logger.warn('PostGIS no configurado, usando fallback WFS');
    const offset = bufferM / 111000; // conversión aprox grados
    const bbox = `${lngNum - offset},${latNum - offset},${lngNum + offset},${latNum + offset},EPSG:4326`;
    const wfsUrl = `https://www.catastro.gov.py/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=snc:parcelas_activas&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox}`;
    const response = await fetch(wfsUrl);
    if (!response.ok) throw new Error(`WFS devolvió status ${response.status}`);
    const geojson = await response.json();

    // Determinar zona de restricción hídrica (simplificado, sin hidrografia_mades)
    const zonaHidrica = geojson.features?.some(f =>
      f.properties?.TIPO === 'RIO' || f.properties?.TIPO === 'ARROYO' || f.properties?.TIPO ==='LAGUNA'
    ) ? 'Posible zona de restricción hídrica. Verificar con hidrografia_mades en PostGIS.' : 'Sin hidrografía detectada en buffer';

    // Guardar features en caché local
    if (geojson?.features?.length > 0) {
      try {
        const cacheResult = await saveFeaturesBatch(geojson.features);
        logger.debug(`[Caché] Guardadas ${cacheResult.saved} parcelas en SQLite WGS84.`);
      } catch (cacheErr) {
        logger.warn('Error guardando caché:', cacheErr.message);
      }
    }

    return res.json({
      source: 'wfs_fallback',
      buffer_m: bufferM,
      coordenadas: { lat: latNum, lng: lngNum },
      total_parcelas: geojson.features?.length || 0,
      zona_hidrica: zonaHidrica,
      geoserver_disponible: true,
      note: 'PostGIS no configurado. Para análisis completo (gaps, linderos, hidrografía) configurar PG_HOST, PG_DATABASE, PG_USER en .env'
    });
  } catch (error) {
    logger.error('Error en análisis espacial:', error.message);
    return res.status(500).json({ error: 'Error consultando análisis espacial' });
  }
});


app.get('/api/entorno', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Faltan parámetros lat, lng' });
    const offset = 0.01;
    const minX = parseFloat(lng) - offset;
    const maxX = parseFloat(lng) + offset;
    const minY = parseFloat(lat) - offset;
    const maxY = parseFloat(lat) + offset;
    const bbox = `${minX},${minY},${maxX},${maxY},EPSG:4326`;
    const wfsUrl = `https://www.catastro.gov.py/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=snc:parcelas_activas&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox}`;
    logger.debug(`[WFS] Descargando entorno para ${lat}, ${lng}...`);
    const response = await fetch(wfsUrl);
    if (!response.ok) throw new Error(`WFS devolvió status ${response.status}`);
    const geojson = await response.json();
    if (geojson && geojson.features && geojson.features.length > 0) {
      // El WFS ya responde en EPSG:4326; conservar esas coordenadas evita una
      // segunda reproyección que desplazaría las parcelas fuera de Paraguay.
      geojson.features.forEach(feature => delete feature.bbox);
      const cacheResult = await saveFeaturesBatch(geojson.features);
      logger.debug(`[Caché] Guardadas ${cacheResult.saved} parcelas en SQLite WGS84.`);
    }
    res.json(geojson);
  } catch (error) {
    logger.error('Error en /api/entorno:', error.message);
    res.status(500).json({ error: 'Error consultando WFS' });
  }
});

const spatialIdentifyCache = new Map();
app.get('/api/spatial-identify', async (req, res) => {
  try {
    const { lat, lng, noGeom } = req.query;
    if (!lat || !lng) return res.status(400).json({ ok: false, error: 'Faltan parámetros lat, lng' });
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return res.status(400).json({ ok: false, error: 'Coordenadas inválidas' });

    const cacheKey = `${parsedLat.toFixed(4)},${parsedLng.toFixed(4)}_${noGeom || '0'}`;
    if (spatialIdentifyCache.has(cacheKey)) {
      return res.json(spatialIdentifyCache.get(cacheKey));
    }

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const scriptPath = join(__dirname, 'scripts', 'spatial_identify.py');
    const args = ['--lat', String(parsedLat), '--lng', String(parsedLng)];
    if (noGeom === 'true' || noGeom === '1') args.push('--no-geom');

    const { stdout } = await execFileAsync('python', [scriptPath, ...args], { timeout: 10000 });
    const data = JSON.parse(stdout);

    if (spatialIdentifyCache.size > 500) spatialIdentifyCache.clear();
    spatialIdentifyCache.set(cacheKey, data);

    res.json(data);
  } catch (error) {
    logger.error('Error en /api/spatial-identify:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/resolve-maps-url', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).json({ ok: false, error: 'Falta parámetro url' });
    let targetUrl = String(rawUrl).trim();

    if (!/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).json({ ok: false, error: 'URL no válida' });
    }

    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(targetUrl)) {
      try {
        const response = await fetch(targetUrl, {
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const loc = response.headers.get('location');
        if (loc) {
          targetUrl = loc;
        } else if (response.status >= 300 && response.status < 400) {
          const r2 = await fetch(targetUrl, { redirect: 'follow' });
          targetUrl = r2.url;
        }
      } catch (fetchErr) {
        logger.warn('Error resolviendo redirect de Google Maps:', fetchErr.message);
      }
    }

    const dLat = targetUrl.match(/!3d(-?\d+(?:\.\d+)?)/);
    const dLng = targetUrl.match(/!4d(-?\d+(?:\.\d+)?)/);
    const atMatch = targetUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const qMatch = targetUrl.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?)[,+](-?\d+(?:\.\d+)?)/);
    const placeMatch = targetUrl.match(/\/place\/([^/@?]+)/);
    const label = placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : 'Ubicación Google Maps';

    let lat = null, lng = null;
    if (dLat && dLng) {
      lat = parseFloat(dLat[1]);
      lng = parseFloat(dLng[1]);
    } else if (qMatch) {
      lat = parseFloat(qMatch[1]);
      lng = parseFloat(qMatch[2]);
    } else if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return res.json({ ok: true, lat, lng, label, resolvedUrl: targetUrl });
    }

    return res.status(422).json({ ok: false, error: 'No se pudieron extraer coordenadas del enlace', targetUrl });
  } catch (error) {
    logger.error('Error en /api/resolve-maps-url:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function activatePayment(payment, paidAt = new Date().toISOString(), providerData = null) {
  if (!payment) throw new Error('Pago inexistente');
  if (payment.status !== 'paid') await dbAPI.payments.updateStatus(payment.id, 'paid', paidAt);
  await dbAPI.users.updatePlan(payment.user_id, payment.plan_id, paidAt);
  const user = await dbAPI.users.findById(payment.user_id);
  const plan = resolvePlan(payment.plan_id);
  try {
    await sendAdminAlert({ to: user?.email, subject: 'Plan activado', message: `Confirmamos el pago. Tu plan ${plan?.name || payment.plan_id} ya está activo en SNC v3.` });
  } catch (mailErr) { logger.error('[MAIL] activation email error', mailErr); }
  return { user, plan, providerData };
}

app.get('/api/payments/mine', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAPI.payments.list();
    res.json(rows.filter(row => row.user_id === req.user.userId));
  } catch (error) { res.status(500).json({ error: 'No se pudieron cargar los pagos' }); }
});

app.get('/api/admin/finance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await dbAPI.payments.list();
    const paid = payments.filter(row => row.status === 'paid');
    const pending = payments.filter(row => row.status === 'pending');
    const totals = paid.reduce((acc, row) => { const key = String(row.currency || 'PYG').toUpperCase(); acc[key] = (acc[key] || 0) + Number(row.amount || 0); return acc; }, {});
    const providerFees = paid.reduce((acc, row) => acc + Number(row.provider_fee || 0), 0);
    res.json({ summary: { transactions: payments.length, paid: paid.length, pending: pending.length, totals, providerFees, providerFeeStatus: providerFees > 0 ? 'reported' : 'not_reported' }, payments: payments.slice(0, 200) });
  } catch (error) { logger.error('finance error', error); res.status(500).json({ error: 'No se pudo cargar la información financiera' }); }
});

app.post('/api/payments/checkout-session', authMiddleware, async (req, res) => {
  try {
    const { planId, provider = 'redticket', buyer } = req.body || {};
    if (provider !== 'redticket') return res.status(400).json({ error: 'Proveedor de pago no admitido' });
    if (!hasRedTicketConfig()) return res.status(503).json({ error: 'Red Ticket todavía no está configurado. Contacte a administración.' });
    const plan = resolvePlan(planId);
    if (!plan || plan.id === 'free') return res.status(400).json({ error: 'Plan no válido para compra' });
    const user = await dbAPI.users.findByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const paymentId = crypto.randomUUID();
    const external_ref = `SNC-${paymentId}`;
    const payment = {
      id: paymentId,
      user_id: user.id,
      plan_id: plan.id,
      provider: String(provider || 'redticket').trim().slice(0, 40),
      status: 'pending',
      amount: plan.price,
      currency: plan.currency,
      buyer: sanitizeBuyer(buyer),
      created_at: new Date().toISOString()
    };
    await dbAPI.payments.insert(payment);
    let checkout_url = `${req.protocol}://${req.get('host')}/api/payments/redticket/checkout/${payment.id}`;
    let provider_id = null;
    if (hasRedTicketConfig()) {
      try {
        const webhook_url = `${req.protocol}://${req.get('host')}/api/payments/redticket/webhook`;
        const charge = await createCharge({
          amount: Number(plan.price),
          currency: plan.currency || 'PYG',
          description: plan.name || 'Acceso SNC',
          external_ref,
          metadata: { payment_id: payment.id, user_id: user.id, plan_id: plan.id },
          webhook_url,
          success_url: `${req.protocol}://${req.get('host')}/api/payments/redticket/success/${payment.id}`,
          failure_url: `${req.protocol}://${req.get('host')}/members.html`,
          idempotencyKey: external_ref
        });
        provider_id = charge.charge_id || charge.id || null;
        checkout_url = charge.checkout_url || checkout_url;
      } catch (rtErr) {
        logger.error('[REDTICKET] charge create error', rtErr);
        await dbAPI.payments.updateStatus(payment.id, 'failed', null);
        return res.status(502).json({ error: 'Red Ticket rechazó la creación del cobro' });
      }
    }
    if (provider_id) await dbAPI.payments.updateProvider?.(payment.id, provider_id, 'created', JSON.stringify({ external_ref }));
    res.status(201).json({ payment, checkout_url, charge_id: provider_id, message: 'Compra iniciada. Completá el pago para activar el acceso.' });
  } catch (e) {
    logger.error('checkout error', e);
    res.status(500).json({ error: 'Error creando compra en Red Ticket' });
  }
});

app.post('/api/payments/confirm', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.body || {};
    const payment = await dbAPI.payments.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    await activatePayment(payment);
    res.json({ ok: true, plan: payment.plan_id });
  } catch (e) {
    logger.error('confirm payment', e);
    res.status(500).json({ error: 'Error confirmando pago' });
  }
});

app.get('/api/payments/redticket/checkout/:id', authMiddleware, async (req, res) => {
  try {
    const payment = await dbAPI.payments.findById(req.params.id);
    if (!payment) return res.status(404).send('<h1>Compra no encontrada</h1>');
    const buyer = (payment.buyer && typeof payment.buyer === 'string') ? (() => { try { return JSON.parse(payment.buyer); } catch { return {}; } })() : (payment.buyer || {});
    const buyerName = buyer.name || '';
    const buyerEmail = buyer.email || '';
    const plan = resolvePlan(payment.plan_id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const checkoutHref = (hasRedTicketConfig() && payment.provider_id) ? `/api/payments/redticket/success/${payment.id}` : '#';
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Red Ticket - Checkout</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Inter,system-ui,sans-serif;background:#050505;color:#fff;padding:24px}.wrap{max-width:640px;margin:0 auto}.card{border:1px solid #262626;border-radius:16px;padding:20px;background:#0a0a0a;margin-top:16px}.btn{display:inline-block;margin-top:16px;padding:12px 16px;border-radius:12px;background:#111;border:1px solid #333;color:#fff;text-decoration:none;font-weight:700}</style></head><body><div class="wrap"><h1>Red Ticket</h1><div class="card"><h2>${plan?.name || 'Acceso'}</h2><p>Monto: ${payment.amount} ${payment.currency}</p><p>Comprador: ${buyerName}</p><p>Email: ${buyerEmail}</p><a class="btn" href="${checkoutHref}">Pagar ahora</a></div></div></body></html>`);
  } catch (e) {
    logger.error('redticket checkout', e);
    res.status(500).json({ error: 'Error mostrando checkout Red Ticket' });
  }
});

app.get('/api/payments/redticket/success/:id', authMiddleware, async (req, res) => {
  try {
    const payment = await dbAPI.payments.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.provider_id && hasRedTicketConfig()) {
      try {
        const charge = await getCharge(payment.provider_id);
        if (charge && charge.status === 'paid') {
           await activatePayment(payment, charge.paid_at || new Date().toISOString(), charge);
        }
      } catch (rtErr) {
        logger.error('[REDTICKET] get charge error', rtErr);
      }
    }
    const updatedPayment = await dbAPI.payments.findById(req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (updatedPayment.status === 'paid') {
      res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Red Ticket - Confirmado</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Inter,system-ui,sans-serif;background:#050505;color:#fff;padding:24px}.wrap{max-width:640px;margin:0 auto}.card{border:1px solid #27272a;border-radius:16px;padding:20px;background:#0a0a0a;margin-top:16px}</style></head><body><div class="wrap"><h1>✅ Pago confirmado</h1><div class="card"><p>Tu acceso <b>${payment.plan_id}</b> está activo.</p><p>Podés cerrar esta ventana y volver a la app.</p></div></body></html>`);
    } else {
      res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Red Ticket - Pendiente</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Inter,system-ui,sans-serif;background:#050505;color:#fff;padding:24px}.wrap{max-width:640px;margin:0 auto}.card{border:1px solid #27272a;border-radius:16px;padding:20px;background:#0a0a0a;margin-top:16px}</style></head><body><div class="wrap"><h1>⏳ Pago pendiente</h1><div class="card"><p>Tu pago está siendo procesado.</p><p>Podés cerrar esta ventana y volver a la app.</p></div></body></html>`);
    }
  } catch (e) {
    logger.error('redticket success', e);
    res.status(500).json({ error: 'Error confirmando pago' });
  }
});

app.post('/api/payments/redticket/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = String(req.headers['x-redticket-signature'] || '');
    const timestamp = String(req.headers['x-redticket-timestamp'] || '');
    const eventType = String(req.headers['x-redticket-event'] || '');
    const body = req.body?.toString?.() || '';
    if (!verifyWebhook(body, signature, timestamp, process.env.RED_TICKET_WEBHOOK_SECRET || '')) {
      return res.status(401).send('Invalid signature');
    }
    let event;
    try { event = JSON.parse(body); } catch { return res.status(400).send('Invalid JSON'); }
    const chargeId = event?.data?.charge_id || event?.charge_id;
    const externalRef = event?.data?.external_ref || '';
    const status = event?.data?.status;
    const paymentId = externalRef.split('payment_id=')?.[1]?.split('&')?.[0] || null;
    const payment = paymentId ? await dbAPI.payments.findById(paymentId) : null;
    if (!payment && chargeId) {
      const allPayments = await dbAPI.payments.list?.() || [];
      const matched = allPayments.find(p => p.provider_id === chargeId);
      if (matched) {
        if (status === 'paid') {
          await dbAPI.payments.updateStatus(matched.id, 'paid', event?.data?.paid_at || new Date().toISOString());
          await dbAPI.users.updatePlan(matched.user_id, matched.plan_id, new Date().toISOString());
        }
      }
    } else if (payment) {
      if (status === 'paid') {
        await dbAPI.payments.updateStatus(payment.id, 'paid', event?.data?.paid_at || new Date().toISOString());
        await dbAPI.users.updatePlan(payment.user_id, payment.plan_id, new Date().toISOString());
      }
    }
    if (event?.event === 'charge.paid' || eventType === 'charge.paid') {
      try {
        const user = payment ? await dbAPI.users.findById(payment.user_id) : null;
        if (user) await sendAdminAlert({ to: user.email, subject: 'Pago confirmado', message: `Tu pago del plan ${payment?.plan_id || ''} fue confirmado.` });
      } catch (mailErr) {
        logger.error('[MAIL] payment webhook email error', mailErr);
      }
    }
    res.status(200).send('ok');
  } catch (e) {
    logger.error('redticket webhook error', e);
    res.status(200).send('ok');
  }
});

app.post('/api/payments/redticket/simulate-pay/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payment = await dbAPI.payments.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    await activatePayment(payment);
    res.redirect(`/api/payments/redticket/success/${payment.id}`);
  } catch (e) {
    logger.error('redticket simulate pay', e);
    res.status(500).json({ error: 'Error simulando pago' });
  }
});

app.get('/api/usage', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findByEmail(req.user.email);
    const projects = await dbAPI.projects.findByUser(req.user.userId);
    const plan = resolvePlan(user?.plan || 'free');
    const projectsCount = projects.length;
    const expedientesPromises = projects.map(p => dbAPI.expedientes.findByProject(p.id));
    const expedientesLists = await Promise.all(expedientesPromises);
    const expedientesCount = expedientesLists.reduce((acc, list) => acc + list.length, 0);
    res.json({
      plan: user?.plan || 'free',
      limits: plan.limits,
      usage: {
        projects: projectsCount,
        expedientes: expedientesCount,
        exportsToday: await countExportsToday(req.user.userId)
      }
    });
  } catch (err) {
    logger.error('usage error', err);
    res.status(500).json({ error: 'Error obteniendo usage' });
  }
});

app.post('/api/usage/increment', authMiddleware, async (req, res) => {
  try {
    const user = await dbAPI.users.findByEmail(req.user.email);
    const plan = resolvePlan(user?.plan || 'free');
    const today = getTodayKey();
    const key = `exports:${req.user.userId}:${today}`;
    const current = Number(await dbAPI.usage.get(key)) || 0;
    if (!canExport(user?.plan || 'free', current)) {
      return res.status(403).json({ error: 'Límite de exportaciones diarias alcanzado para tu plan', code: 'EXPORT_LIMIT' });
    }
    await dbAPI.usage.increment(key);
    res.json({ ok: true });
  } catch (err) {
    logger.error('usage increment error', err);
    res.status(500).json({ error: 'Error registrando exportación' });
  }
});

// ============================================================
// ENDPOINTS POSTGIS - Validación territorial avanzada
// Diseñados para ejecutarse contra PostGIS cuando está disponible
// ============================================================

/**
 * POST /api/validation/gaps-catastro
 * Verifica solapamientos y gaps (huecos) contra el catastro oficial
 * Body: { geojson: FeatureCollection, bufferMeters?: number }
 * Requiere: Capa 'parcelas_oficiales' en PostGIS con índice GiST
 */
app.post('/api/validation/gaps-catastro', authMiddleware, async (req, res) => {
  try {
    const { geojson, bufferMeters = 0.05 } = req.body || {};
    if (!geojson?.features?.length) {
      return res.status(400).json({ error: 'GeoJSON requerido con al menos una feature' });
    }

    // Verificar si PostGIS está disponible (via dbAPI extension)
    const hasPostGIS = typeof dbAPI.postgis?.query === 'function';
    
    if (!hasPostGIS) {
      // Fallback: delegar validación al cliente (turf.js worker)
      return res.json({
        delegated: true,
        message: 'PostGIS no disponible. Validación delegada al cliente (turf.js).',
        clientAction: 'RUN_TOPOLOGY_WORKER',
        bufferMeters
      });
    }

    // Ejecutar consulta PostGIS real
    const results = await dbAPI.postgis.query(`
      WITH lote_utm AS (
        SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom
      ),
      colindantes AS (
        SELECT p.id, p.padron, p.geom,
               ST_Intersection(p.geom, l.geom) AS inter,
               ST_Area(ST_Intersection(p.geom, l.geom)) AS area_inter_m2,
               ST_Touches(p.geom, l.geom) AS toca_lindero
        FROM parcelas_oficiales p, lote_utm l
        WHERE ST_DWithin(p.geom, l.geom, $2)
      ),
      gaps AS (
        SELECT ST_Difference(ST_Buffer(l.geom, $2), ST_Union(c.geom)) AS gap_geom
        FROM lote_utm l, colindantes c
        WHERE ST_Area(ST_Difference(ST_Buffer(l.geom, $2), ST_Union(c.geom))) > 0.01
      )
      SELECT 
        json_agg(json_build_object(
          'padron', c.padron,
          'tipo', CASE 
            WHEN ST_Area(c.inter) > 0.1 THEN 'SOLAPAMIENTO'
            WHEN c.toca_lindero THEN 'LINDERO_COINCIDENTE'
            ELSE 'HUECO_POTENCIAL'
          END,
          'area_m2', ROUND(ST_Area(c.inter)::numeric, 2),
          'distancia_m', ROUND(ST_Distance(c.geom, l.geom)::numeric, 2)
        )) AS conflictos,
        (SELECT json_agg(ST_AsGeoJSON(gap_geom)) FROM gaps) AS huecos
      FROM colindantes c, lote_utm l;
    `, [JSON.stringify(geojson), bufferMeters]);

    res.json({
      source: 'POSTGIS',
      timestamp: new Date().toISOString(),
      ...results.rows[0]
    });
  } catch (e) {
    logger.error('validación gaps-catastro error:', e);
    res.status(500).json({ error: 'Error en validación catastral', detail: e.message });
  }
});

/**
 * POST /api/validation/restriccion-hidrica
 * Verifica invasión de franja de servidumbre hídrica (Ley 3239/2007 - 30m)
 * Body: { geojson: FeatureCollection, franjaMetros?: number }
 * Requiere: Capa 'hidrografia_mades' en PostGIS con índice GiST
 */
app.post('/api/validation/restriccion-hidrica', authMiddleware, async (req, res) => {
  try {
    const { geojson, franjaMetros = 30.0 } = req.body || {};
    if (!geojson?.features?.length) {
      return res.status(400).json({ error: 'GeoJSON requerido' });
    }

    const hasPostGIS = typeof dbAPI.postgis?.query === 'function';
    
    if (!hasPostGIS) {
      return res.json({
        delegated: true,
        message: 'PostGIS no disponible. Validación delegada al cliente.',
        clientAction: 'CHECK_HIDROGRAFIA_CLIENT',
        franjaMetros
      });
    }

    const results = await dbAPI.postgis.query(`
      WITH lote_utm AS (
        SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom
      ),
      cruce AS (
        SELECT h.nombre, h.tipo, h.geom AS rio_geom,
               ST_Distance(h.geom, l.geom) AS distancia_m,
               ST_Intersection(ST_Buffer(h.geom, $2), l.geom) AS area_invasion
        FROM hidrografia_mades h, lote_utm l
        WHERE ST_DWithin(h.geom, l.geom, $2)
      )
      SELECT json_agg(json_build_object(
        'curso_agua', nombre,
        'tipo', tipo,
        'distancia_m', ROUND(distancia_m::numeric, 2),
        'area_invasion_m2', ROUND(ST_Area(area_invasion)::numeric, 2),
        'invade_franja', CASE WHEN ST_Area(area_invasion) > 0 THEN true ELSE false END,
        'violacion_ley_3239', CASE WHEN ST_Area(area_invasion) > 0 THEN true ELSE false END
      )) AS restricciones
      FROM cruce;
    `, [JSON.stringify(geojson), franjaMetros]);

    res.json({
      source: 'POSTGIS',
      ley: 'Ley 3239/2007 - Franja de servidumbre hídrica 30m',
      timestamp: new Date().toISOString(),
      franjaMetros,
      ...results.rows[0]
    });
  } catch (e) {
    logger.error('validación restricción hídrica error:', e);
    res.status(500).json({ error: 'Error en validación hídrica', detail: e.message });
  }
});

/**
 * POST /api/validation/municipal
 * Validación de parámetros urbanos municipales (Ley 3966/2010)
 * Body: { geojson: FeatureCollection, configMunicipal?: Object }
 */
app.post('/api/validation/municipal', authMiddleware, async (req, res) => {
  try {
    const { geojson, configMunicipal = {} } = req.body || {};
    if (!geojson?.features?.length) {
      return res.status(400).json({ error: 'GeoJSON requerido' });
    }

    // Esta validación puede hacerse en cliente (js/municipal.js)
    // El endpoint sirve para validación oficial con datos municipales actualizados
    
    const hasPostGIS = typeof dbAPI.postgis?.query === 'function';
    const config = {
      frenteMinimo: configMunicipal.frenteMinimo || 12.0,
      superficieMinima: configMunicipal.superficieMinima || 360.0,
      porcentajeCallesMin: configMunicipal.porcentajeCallesMin || 0.16,
      porcentajePlazasMin: configMunicipal.porcentajePlazasMin || 0.05,
      porcentajePlazasMax: configMunicipal.porcentajePlazasMax || 0.07,
      franjaHidricaMinima: configMunicipal.franjaHidricaMinima || 30.0,
      retiroFondoMinimo: configMunicipal.retiroFondoMinimo || 3.0,
      retiroLateralMinimo: configMunicipal.retiroLateralMinimo || 1.5
    };

    if (!hasPostGIS) {
      return res.json({
        delegated: true,
        message: 'Validación municipal delegada al cliente (js/municipal.js).',
        clientAction: 'RUN_MUNICIPAL_VALIDATOR',
        config
      });
    }

    // Con PostGIS: validar contra plano regulador, zonificación, afectaciones viales
    const results = await dbAPI.postgis.query(`
      WITH lote_utm AS (
        SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom
      ),
      zonificacion AS (
        SELECT z.nombre, z.tipo, z.normativa,
               ST_Intersection(z.geom, l.geom) AS area_afectada
        FROM plano_regulador z, lote_utm l
        WHERE ST_Intersects(z.geom, l.geom)
      ),
      afectaciones AS (
        SELECT a.tipo, a.nombre, a.ancho_m,
               ST_Distance(a.geom, l.geom) AS distancia_m
        FROM afectaciones_viales a, lote_utm l
        WHERE ST_DWithin(a.geom, l.geom, a.ancho_m)
      )
      SELECT 
        json_agg(DISTINCT jsonb_build_object(
          'tipo', 'ZONIFICACION',
          'zona', z.nombre,
          'clasificacion', z.tipo,
          'normativa', z.normativa
        )) as zonificacion,
        json_agg(DISTINCT jsonb_build_object(
          'tipo', 'AFECTACION_VIAL',
          'nombre', a.nombre,
          'ancho_requerido_m', a.ancho_m,
          'distancia_actual_m', ROUND(a.distancia_m::numeric, 2)
        )) as afectaciones
      FROM lote_utm l
      LEFT JOIN zonificacion z ON true
      LEFT JOIN afectaciones a ON true;
    `, [JSON.stringify(geojson)]);

    res.json({
      source: 'POSTGIS',
      normativa: 'Ley Orgánica Municipal Nº 3966/2010',
      timestamp: new Date().toISOString(),
      config,
      ...results.rows[0]
    });
  } catch (e) {
    logger.error('validación municipal error:', e);
    res.status(500).json({ error: 'Error en validación municipal', detail: e.message });
  }
});

/**
 * POST /api/validation/completa
 * Ejecuta validación SNC + Municipal + Hidric + Gaps en una sola llamada
 * Body: { geojson, metadatosGeodesicos?, configMunicipal? }
 */
app.post('/api/validation/completa', authMiddleware, async (req, res) => {
  try {
    const { geojson, metadatosGeodesicos, configMunicipal } = req.body || {};
    if (!geojson?.features?.length) {
      return res.status(400).json({ error: 'GeoJSON requerido' });
    }

    const resultados = {
      timestamp: new Date().toISOString(),
      metadatosGeodesicos,
      snc: { delegated: true, clientAction: 'RUN_SNC_VALIDATOR' },
      municipal: { delegated: true, clientAction: 'RUN_MUNICIPAL_VALIDATOR' },
      hidrica: { delegated: true, clientAction: 'CHECK_HIDROGRAFIA_CLIENT' },
      gapsCatastro: { delegated: true, clientAction: 'RUN_TOPOLOGY_WORKER' }
    };

    const hasPostGIS = typeof dbAPI.postgis?.query === 'function';
    
    if (hasPostGIS) {
      // Ejecutar validaciones en paralelo en PostGIS
      const [gaps, hidrica, municipal] = await Promise.allSettled([
        // Gaps catastro
        dbAPI.postgis.query(`
          WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom)
          SELECT json_agg(json_build_object('padron', p.padron, 'tipo', 'SOLAPAMIENTO', 'area_m2', ROUND(ST_Area(ST_Intersection(p.geom, l.geom))::numeric, 2)))
          FROM parcelas_oficiales p, l
          WHERE ST_DWithin(p.geom, l.geom, 0.05) AND ST_Area(ST_Intersection(p.geom, l.geom)) > 0.1
        `, [JSON.stringify(geojson)]),
        // Hidrica
        dbAPI.postgis.query(`
          WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom)
          SELECT json_agg(json_build_object('curso', h.nombre, 'dist_m', ROUND(ST_Distance(h.geom, l.geom)::numeric, 2), 'invade', ST_DWithin(h.geom, l.geom, 30)))
          FROM hidrografia_mades h, l
          WHERE ST_DWithin(h.geom, l.geom, 30)
        `, [JSON.stringify(geojson)]),
        // Municipal (zonificación)
        dbAPI.postgis.query(`
          WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 32721) AS geom)
          SELECT json_agg(json_build_object('zona', z.nombre, 'tipo', z.tipo)) 
          FROM plano_regulador z, l WHERE ST_Intersects(z.geom, l.geom)
        `, [JSON.stringify(geojson)])
      ]);

      resultados.gapsCatastro = gaps.status === 'fulfilled' ? { source: 'POSTGIS', data: gaps.value.rows[0] } : { error: gaps.reason?.message };
      resultados.hidrica = hidrica.status === 'fulfilled' ? { source: 'POSTGIS', data: hidrica.value.rows[0] } : { error: hidrica.reason?.message };
      resultados.municipal = municipal.status === 'fulfilled' ? { source: 'POSTGIS', data: municipal.value.rows[0] } : { error: municipal.reason?.message };
    }

    res.json(resultados);
  } catch (e) {
    logger.error('validación completa error:', e);
    res.status(500).json({ error: 'Error en validación completa', detail: e.message });
  }
});

if (ENV.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    logger.debug(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode}`);
    next();
  });
}

if (ENV.NODE_ENV === 'production' && ENV.RED_TICKET_BASE_URL) {
  app.use('/api/payments/redticket', express.static('public/redticket'));
}

app.get('/', (req, res) => {
  const qIdx = req.originalUrl.indexOf('?');
  const query = qIdx !== -1 ? req.originalUrl.slice(qIdx) : '';
  res.redirect(302, `/index.html${query}`);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API no encontrada' });
  }
  const blocked = ['/admin/members.html'];
  const protectedPrefixes = ['/data/', '/backup/', '/docs/', '/tests/', '/node_modules/', '/.git/', '/.agents/', '/.codex/'];
  if (blocked.includes(req.path.toLowerCase()) || protectedPrefixes.some(prefix => req.path.toLowerCase().startsWith(prefix)) || extname(req.path)) {
    return res.status(404).type('text/plain').send('Recurso no encontrado');
  }
  res.type('text/html');
  res.send(readFileSync(join(__dirname, 'index.html'), 'utf8'));
});

const startServer = () => {
  const server = app.listen(PORT, ENV.HOST, () => {
    logger.debug(`API SNC lista en http://${ENV.HOST}:${PORT}/`);
  });
  const shutdown = (code) => {
    try {
      logger.debug('[BOOT] Cerrando servidor...');
      server.close(() => process.exit(code || 0));
    } catch (e) {
      logger.error('[BOOT] Error en shutdown:', e);
      process.exit(code || 1);
    }
  };
  process.on('unhandledRejection', (reason) => {
    logger.error('[BOOT] Unhandled Rejection:', reason);
    shutdown(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error('[BOOT] Uncaught Exception:', err);
    shutdown(1);
  });
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
};

if (!process.env.FIREBASE_CONFIG) {
  startServer();
} else {
  logger.debug('[BOOT] Entorno Firebase detectado; app lista para ser exportada.');
}

export { app };


