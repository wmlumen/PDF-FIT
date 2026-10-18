#!/usr/bin/env bash
set -euo pipefail

# Gate pre-promoción: verifica tests, secrets, debug pages, CSP/HSTS y deploy config.
cd "$(dirname "$0")/.."

echo "[PROMO] Ejecutando gate pre-promoción..."
npm test >/tmp/snc_promo_test.log 2>&1 || {
  echo "[PROMO] npm test falló";
  cat /tmp/snc_promo_test.log;
  exit 1;
}

node - <<'NODE'
const fs = require('fs');
const path = require('path');

const base = process.cwd();
let failed = false;

function fail(msg) {
  console.error('[PROMO] FAIL:', msg);
  failed = true;
}

if (!fs.existsSync(path.join(base, 'firebase.json'))) fail('firebase.json ausente');
if (!fs.existsSync(path.join(base, '.firebaserc'))) fail('.firebaserc ausente');
if (!fs.existsSync(path.join(base, 'DEPLOY.md'))) fail('DEPLOY.md ausente');
if (!fs.existsSync(path.join(base, '.env.example'))) fail('.env.example ausente');

const server = fs.readFileSync(path.join(base, 'server-api.js'), 'utf8');
if (!/app\.get\('\/api\/health'/.test(server)) fail('/api/health ausente');
if (!/Strict-Transport-Security/.test(server)) fail('HSTS ausente');
if (!/Content-Security-Policy/.test(server)) fail('CSP ausente');
if (!/admin\.html/.test(server)) fail('admin.html ausente');
const publicHtml = server.match(/const PUBLIC_HTML_FILES = new Map\(\[[\s\S]*?\]\);/)?.[0] || '';
if (publicHtml.includes('test-login.html') || publicHtml.includes('snc-diag.html')) fail('debug pages expuestas en PUBLIC_HTML_FILES');
if (!/adminMiddleware/.test(server)) fail('adminMiddleware ausente');
if (!/authMiddleware/.test(server)) fail('authMiddleware ausente');

const firebase = JSON.parse(fs.readFileSync(path.join(base, 'firebase.json'), 'utf8'));
if (!firebase.hosting) fail('hosting ausente en firebase.json');
const rewrites = firebase.hosting.rewrites || [];
if (!rewrites.some(r => r.source === '/api/**' && r.function === 'api')) fail('rewrite /api/** ausente');

const ignore = Array.isArray(firebase.hosting.ignore) ? firebase.hosting.ignore : [];
if (ignore.some(item => String(item).includes('test-login.html'))) fail('test-login.html debe eliminarse del repo y no requiere entrada en ignore');
if (ignore.some(item => String(item).includes('snc-diag.html'))) fail('snc-diag.html debe eliminarse del repo y no requiere entrada en ignore');

const debugFiles = ['test-login.html', 'snc-diag.html', 'test_mapa.html', 'test_validator.html'];
for (const file of debugFiles) {
  if (fs.existsSync(path.join(base, file))) fail(`${file} presente en el repo; debe eliminarse`);
}

const envExample = fs.readFileSync(path.join(base, '.env.example'), 'utf8');
if (!/JWT_SECRET=/.test(envExample)) fail('JWT_SECRET no documentado en .env.example');
if (!/RED_TICKET_WEBHOOK_SECRET=/.test(envExample)) fail('RED_TICKET_WEBHOOK_SECRET no documentado en .env.example');
if (!/SMTP_HOST=/.test(envExample)) fail('SMTP_HOST no documentado en .env.example');

if (failed) {
  console.error('[PROMO] Gate fallido');
  process.exit(1);
}
console.log('[PROMO] Gate OK');
NODE

echo "[PROMO] Gate pre-promoción aprobado"
