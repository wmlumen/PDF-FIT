/**
 * tests/basemap-menu-overlap.test.mjs
 * Validación técnica del selector hamburguesa de mapas base y reglas anti-solapamiento
 * en todos los mapas del ecosistema (index.html, municipal, admin, ciudadano, notarial).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Hamburguesa de Mapas - Todos los portales poseen el componente selector unificado', () => {
  const portals = [
    { name: 'Profesional', file: 'index.html' },
    { name: 'Municipal',   file: 'municipal/index.html' },
    { name: 'Ciudadano',   file: 'ciudadano/index.html' },
    { name: 'Notarial',    file: 'notarial/index.html' }
  ];

  portals.forEach(p => {
    const html = fs.readFileSync(p.file, 'utf8');
    assert.ok(html.includes('id="map-base-selector"') || html.includes('map-selector-box'), `${p.name} debe incluir id="map-base-selector"`);
    assert.ok(html.includes('map-base-menu-toggle'), `${p.name} debe tener el botón hamburguesa map-base-menu-toggle`);
    assert.ok(html.includes('fa-bars'), `${p.name} debe mostrar el icono fa-bars en la hamburguesa`);
    assert.ok(html.includes('id="map-base-menu"') || html.includes('map-base-menu'), `${p.name} debe incluir el menú desplegable de mapas`);
    assert.ok(html.includes('basemapMenu.js'), `${p.name} debe cargar el script basemapMenu.js`);
  });

  // Admin inyecta el componente dinámicamente en initAdminMap
  const adminJs = fs.readFileSync('js/app-admin.js', 'utf8');
  assert.ok(adminJs.includes('map-base-selector'), 'app-admin.js debe inyectar map-base-selector');
  assert.ok(adminJs.includes('map-base-menu-toggle'), 'app-admin.js debe inyectar map-base-menu-toggle');
  assert.ok(adminJs.includes('BasemapMenu?.init'), 'app-admin.js debe invocar BasemapMenu.init');
});

test('Hamburguesa de Mapas - Reglas CSS Anti-Solapamiento implementadas en styles.css', () => {
  const css = fs.readFileSync('css/styles.css', 'utf8');

  // 1. Z-index elevado al expandirse para evitar que las herramientas o Leaflet tapen el menú
  assert.ok(css.includes('z-index: 1350'), 'Debe elevar z-index a 1350 al expandirse');
  assert.ok(css.includes('.is-expanded'), 'Debe definir estilos para la clase is-expanded');

  // 2. Regla anti-solapamiento con map-tools (desactiva interferencia de clics y atenúa opacidad)
  assert.ok(css.includes('#map-base-selector.is-expanded ~ #map-tools') || css.includes('.map-selector-box.is-expanded ~ #map-tools'), 
    'Debe existir regla anti-solapamiento con map-tools');
  assert.ok(css.includes('pointer-events: none'), 'Debe desactivar pointer-events en elementos solapables mientras el menú esté abierto');

  // 3. Altura máxima y scroll para no desbordar en pantallas pequeñas
  assert.ok(css.includes('overflow-y: auto'), 'El menú debe tener scroll vertical en pantallas con poca altura');
});

test('Hamburguesa de Mapas - Controlador js/basemapMenu.js gestiona apertura, cierre y capas', () => {
  const js = fs.readFileSync('js/basemapMenu.js', 'utf8');

  assert.ok(js.includes('is-expanded'), 'Debe añadir y quitar la clase is-expanded');
  assert.ok(js.includes('Escape'), 'Debe cerrar con la tecla Escape');
  assert.ok(js.includes('contains(e.target)'), 'Debe cerrar al hacer clic fuera del menú');
  assert.ok(js.includes('window.BasemapMenu'), 'Debe exponer la API window.BasemapMenu');
  assert.ok(js.includes('setBaseLayer'), 'Debe invocar setBaseLayer al seleccionar una capa');
});

test('Hamburguesa de Mapas - Ubicación exclusiva arriba a la derecha y configuración por defecto OSM Pilar (zoom 16 / -26.85790 / -58.30369)', () => {
  // 1. Ubicación flotante arriba a la derecha en todos los selectores
  const files = ['index.html', 'municipal/index.html', 'ciudadano/index.html', 'notarial/index.html'];
  files.forEach(f => {
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(html.includes('right-3 top-3'), `${f} debe posicionar el selector flotando exclusivamente en right-3 top-3`);
  });

  const adminJs = fs.readFileSync('js/app-admin.js', 'utf8');
  assert.ok(adminJs.includes('right-3 top-3'), 'admin debe posicionar el selector en right-3 top-3');

  // 2. Coordenadas y vista por defecto oficial: OSM zoom 16, -26.85790, -58.30369
  const configJs = fs.readFileSync('js/config.js', 'utf8');
  assert.ok(configJs.includes('-26.85790'), 'config.js debe tener latitud -26.85790');
  assert.ok(configJs.includes('-58.30369'), 'config.js debe tener longitud -58.30369');
  assert.ok(configJs.includes('zoom: 16'), 'config.js debe tener zoom 16');

  // 3. Verificación en app-admin y app-notarial
  assert.ok(adminJs.includes('-26.85790') && adminJs.includes('-58.30369') && adminJs.includes('16'),
    'app-admin.js debe iniciar en [-26.85790, -58.30369] zoom 16');

  const notarialJs = fs.readFileSync('js/app-notarial.js', 'utf8');
  assert.ok(notarialJs.includes('-26.85790') && notarialJs.includes('-58.30369') && notarialJs.includes('16'),
    'app-notarial.js debe iniciar en [-26.85790, -58.30369] zoom 16');
});


test('Hamburguesa de Mapas - 6 Capas base unificadas en todos los portales', () => {
  const expectedLayers = ['osm', 'satellite', 'humanitarian', 'catastro', 'carto_dark', 'topo'];
  const sources = [
    { name: 'Profesional', content: fs.readFileSync('index.html', 'utf8') },
    { name: 'Municipal',   content: fs.readFileSync('municipal/index.html', 'utf8') },
    { name: 'Ciudadano',   content: fs.readFileSync('ciudadano/index.html', 'utf8') },
    { name: 'Notarial',    content: fs.readFileSync('notarial/index.html', 'utf8') },
    { name: 'Super Admin', content: fs.readFileSync('js/app-admin.js', 'utf8') }
  ];

  sources.forEach(s => {
    expectedLayers.forEach(layer => {
      assert.ok(s.content.includes(`data-layer="${layer}"`), `${s.name} debe contener la capa base data-layer="${layer}"`);
    });
  });
});
