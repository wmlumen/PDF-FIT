import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Super Admin - Archivo admin/index.html presente y con estructura de tres pilares', () => {
  assert.ok(fs.existsSync('admin/index.html'), 'admin/index.html debe existir');
  const html = fs.readFileSync('admin/index.html', 'utf8');

  // Identidad y branding Super Admin
  assert.match(html, /Panel de Super Administrador/);
  assert.match(html, /SUPER ADMIN V3/);

  // Selector rápido de entornos enlazados
  assert.ok(html.includes('href="/"'), 'Debe enlazar al Portal Profesional');
  assert.ok(html.includes('href="/municipal/"'), 'Debe enlazar al Portal Municipal');
  assert.ok(html.includes('href="/notarial/"') || html.includes('href="/index-notarial.html"'), 'Debe enlazar al Portal Notarial');
  assert.ok(html.includes('href="/ciudadano/"'), 'Debe enlazar al Portal Ciudadano');

  // Las 3 pestañas principales de gestión requeridas
  assert.ok(html.includes('data-tab="profesional"'), 'Debe contener la pestaña de Gestión Profesional');
  assert.ok(html.includes('data-tab="municipal"'), 'Debe contener la pestaña de Gestión Municipal');
  assert.ok(html.includes('data-tab="notarial"'), 'Debe contener la pestaña de Gestión Notarial');

  // Pestañas operativas complementarias
  assert.ok(html.includes('data-tab="expedientes"'), 'Debe contener la pestaña de Expedientes B2B2G');
  assert.ok(html.includes('data-tab="members"'), 'Debe contener la pestaña de Usuarios Globales');
  assert.ok(html.includes('data-tab="plans"'), 'Debe contener la pestaña de Planes & Finanzas');
  assert.ok(html.includes('data-tab="audit"'), 'Debe contener la pestaña de Auditoría y Seguridad');

  // Referencias normativas de los tres pilares
  assert.ok(html.includes('551/2023'), 'Debe referenciar la Res. SNC 551/2023 en Profesional');
  assert.ok(html.includes('3966/2010'), 'Debe referenciar la Ley 3966/2010 en Municipal');
  assert.ok(html.includes('7.424/25') || html.includes('7424/2025'), 'Debe referenciar la Ley RUN 7424/2025 en Notarial');
  assert.ok(html.includes('6822/2021'), 'Debe referenciar la Ley 6822/2021 de Firmas Cualificadas');
});

test('Super Admin - Lógica de cliente en js/app-admin.js', () => {
  assert.ok(fs.existsSync('js/app-admin.js'), 'js/app-admin.js debe existir');
  const js = fs.readFileSync('js/app-admin.js', 'utf8');

  assert.ok(js.includes('initAdmin'), 'Debe exportar función initAdmin');
  assert.ok(js.includes('switchTab'), 'Debe exportar o definir switchTab');
  assert.ok(js.includes('loadPiribebuyMap'), 'Debe cargar el mapa territorial GIS');
  assert.ok(js.includes('publicarParcelasCiudadano'), 'Debe permitir sincronizar con Portal Ciudadano');
});

test('Super Admin - Soporte de ruta y roles en server-api.js', () => {
  const serverJs = fs.readFileSync('server-api.js', 'utf8');

  // Ruta /superadmin registrada
  assert.ok(serverJs.includes('/superadmin'), 'server-api.js debe servir la ruta /superadmin');

  // Roles superadmin, admin_municipal y admin_notarial habilitados
  assert.ok(serverJs.includes("'superadmin'"), 'server-api.js debe permitir el rol superadmin');
  assert.ok(serverJs.includes("'admin_municipal'"), 'server-api.js debe permitir el rol admin_municipal');
  assert.ok(serverJs.includes("'admin_notarial'"), 'server-api.js debe permitir el rol admin_notarial');
});

test('Super Admin - Usuario Christhian Keim y contraseña configurada', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database('data/snc.sqlite');
  const bcrypt = await import('bcrypt');

  const user = db.prepare("SELECT * FROM users WHERE (email = 'christhiankeim@gmail.com' OR email = 'wmlumen@gmail.com') AND role = 'superadmin' LIMIT 1").get();
  assert.ok(user, 'El usuario superadministrador Christhian Keim debe existir con rol superadmin');
  assert.equal(user.name, 'Christhian Keim');
  assert.equal(user.status, 'active');

  const passOk = bcrypt.default.compareSync('Ck1340130*', user.password_hash_v2);
  assert.ok(passOk, 'La contraseña Ck1340130* debe validar correctamente contra el hash bcrypt');
});
