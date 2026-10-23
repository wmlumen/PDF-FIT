import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Portal Notarial - Archivo notarial/index.html presente y con estructura oficial', () => {
  assert.ok(fs.existsSync('notarial/index.html'), 'notarial/index.html debe existir dentro de su carpeta notarial/');
  const html = fs.readFileSync('notarial/index.html', 'utf8');

  // Título y branding
  assert.match(html, /Notarial PY.*Pro/);
  assert.match(html, /Escribanías PY/);
  assert.match(html, /Ley 7\.424\/25 RUN/);

  // Módulos esenciales de la interfaz
  assert.ok(html.includes('id="notary-map"'), 'Debe contener el visor cartográfico #notary-map');
  assert.ok(html.includes('id="out-minuta-text"'), 'Debe contener el área de texto de minuta notarial');
  assert.ok(html.includes('id="inp-val-fiscal"'), 'Debe contener campo de valor fiscal para liquidación');
  assert.ok(html.includes('id="inp-val-venta"'), 'Debe contener campo de precio de venta');
  assert.ok(html.includes('id="out-total-gastos"'), 'Debe contener total de gastos de transferencia');
  assert.ok(html.includes('id="sel-dgrp-estado"'), 'Debe contener selector de condición DGRP');

  // Enlaces a geoportales oficiales
  assert.ok(html.includes('catastro.gov.py'), 'Debe enlazar al Catastro SNC');
  assert.ok(html.includes('run.gov.py'), 'Debe enlazar a la Mesa RUN/DGRP');

  // Navegación cruzada
  assert.ok(html.includes('href="/"') || html.includes('href="/index.html"'), 'Debe permitir volver al Portal Profesional');
  assert.ok(html.includes('href="/municipal/"') || html.includes('href="/index-municipal.html"'), 'Debe permitir ir al Portal Municipal');
  assert.ok(html.includes('href="/ciudadano/"') || html.includes('href="/index-ciudadano.html"'), 'Debe permitir ir al Portal Ciudadano');
});

test('Portal Notarial - Navegación cruzada desde los demás portales', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const muniFile = fs.existsSync('municipal/index.html') ? 'municipal/index.html' : 'index-municipal.html';
  const ciudadFile = fs.existsSync('ciudadano/index.html') ? 'ciudadano/index.html' : 'index-ciudadano.html';

  const muniHtml = fs.readFileSync(muniFile, 'utf8');
  const ciudadHtml = fs.readFileSync(ciudadFile, 'utf8');

  assert.ok(indexHtml.includes('/notarial') || indexHtml.includes('/index-notarial.html'), 'index.html debe enlazar al portal notarial');
  assert.ok(muniHtml.includes('/notarial') || muniHtml.includes('/index-notarial.html'), `${muniFile} debe enlazar al portal notarial`);
  assert.ok(ciudadHtml.includes('/notarial') || ciudadHtml.includes('/index-notarial.html'), `${ciudadFile} debe enlazar al portal notarial`);
});

test('Portal Notarial - Lógica cliente js/app-notarial.js', () => {
  assert.ok(fs.existsSync('js/app-notarial.js'), 'js/app-notarial.js debe existir');
  const js = fs.readFileSync('js/app-notarial.js', 'utf8');
  assert.ok(js.includes('AppNotarial'), 'Debe exportar el objeto AppNotarial');
  assert.ok(js.includes('calcularLiquidacion'), 'Debe contener función de cálculo de liquidación');
  assert.ok(js.includes('generarMinuta'), 'Debe contener función de generación de minuta');
  assert.ok(js.includes('ejecutarDueDiligence'), 'Debe contener función de Due Diligence');
});
