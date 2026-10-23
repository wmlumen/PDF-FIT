import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PLANS, resolvePlan, canCreateProject, canCreateExpediente, canExport } from './js/plans.js';
import { ENV } from './config.env.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { POST as poutPOST, GET as poutGET, PUT as poutPUT, DELETE as poutDELETE } from './js/poutApi.js';

// Backend de base de datos determinista (A1-3): DB_BACKEND=sqlite|firestore (default: sqlite)
const DB_BACKEND = process.env.DB_BACKEND || 'sqlite';

import { logger } from './js/logger.js';
const { hasRedTicketConfig, createCharge, getCharge, getCheckoutByToken } = require('./js/redticket-api.cjs');
import { verifyWebhook } from './js/redticket-payments.js';

const PORT = ENV.PORT;
const __dirname = join(process.cwd());
const JWT_SECRET = ENV.JWT_SECRET;
const JWT_EXPIRES = ENV.JWT_EXPIRES;

const app = express();

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
// Datos municipales (capas por municipio, ej: piribebuy) — única carpeta de datos municipales.
app.use('/data/municipal', express.static(join(__dirname, 'data', 'municipal'), STATIC_OPTIONS));
// Alias retrocompatible: /data/piribebuy → /data/municipal/piribebuy (códigos antiguos).
app.use('/data/piribebuy', express.static(join(__dirname, 'data', 'municipal', 'piribebuy'), STATIC_OPTIONS));

// Dependencias del frontend servidas localmente (sin depender de CDNs).
// Whitelist explícita: nunca se sirve node_modules/ completo.
// ---- Módulo POUT (punto de integración) ----
app.use('/Pout', express.static(join(__dirname, 'Pout'), STATIC_OPTIONS));
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
  ['/vendor/dom-to-image.min.js', 'node_modules/dom-image/dist/dom-image.min.js'],
  ['/vendor/docx.mjs', 'node_modules/docx/dist/index.mjs']
]);
for (const [route, rel] of VENDOR_FILES) {
  app.get(route, (req, res) => res.sendFile(join(__dirname, rel)));
}

// Font Awesome (CSS + webfonts): se sirve el paquete completo (solo CSS/fuentes).
app.use('/vendor/fontawesome', express.static(join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API REST para POUT interior
app.post('/api/pout', authMiddleware, async (req, res) => poutPOST(req, res));
app.get('/api/pout', authMiddleware, (req, res) => poutGET(req, res));
app.get('/api/pout/:codigo', authMiddleware, (req, res) => poutGET(req, res));
app.put('/api/pout/:codigo', authMiddleware, async (req, res) => poutPUT(req, res));
app.delete('/api/pout/:codigo', authMiddleware, async (req, res) => poutDELETE(req, res));