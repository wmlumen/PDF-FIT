/**
 * tests/map-layout-manager.test.mjs
 * Pruebas unitarias para el Panel de Control de Widgets y Disposición de Mapas (Super Admin)
 * y la persistencia/aplicación reactiva en todos los geoportales.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('MapLayoutManager - Catálogo oficial de componentes y configuración predeterminada', () => {
  assert.ok(fs.existsSync('js/mapLayoutManager.js'), 'mapLayoutManager.js debe existir');
  const code = fs.readFileSync('js/mapLayoutManager.js', 'utf8');

  // 1. Catálogo completo de widgets
  const requiredWidgets = [
    'minimap', 'legend', 'basemap_burger', 'measure_tools',
    'zoom_controls', 'flight_asuncion', 'focus_parcel', 'scale_control'
  ];
  requiredWidgets.forEach(w => {
    assert.ok(code.includes(w), `Catálogo debe incluir widget ${w}`);
  });

  // 2. Disposición por defecto requerida por el usuario:
  // - Mini mapa: bottom-left (encima de leyenda, independiente)
  // - Leyenda: bottom-left (independiente)
  // - Hamburguesa: top-right (independiente)
  // - Herramientas de medición: right-center (agrupadas)
  assert.ok(code.includes("defaultPosition: 'bottom-left'"), 'Mini-mapa y Leyenda deben estar en bottom-left');
  assert.ok(code.includes("defaultPosition: 'top-right'"), 'Hamburguesa debe estar en top-right');
  assert.ok(code.includes("defaultPosition: 'right-center'"), 'Herramientas de medición deben estar en right-center');
});

test('Super Admin - Pestaña y panel de control de disposición de mapas integrados', () => {
  const adminHtml = fs.readFileSync('admin/index.html', 'utf8');

  // Pestaña en barra de navegación
  assert.ok(adminHtml.includes('data-tab="map-layout"'), 'Debe existir tab map-layout en admin/index.html');
  assert.ok(adminHtml.includes('id="panel-map-layout"'), 'Debe existir sección panel-map-layout');

  // Maqueta visual del simulador con los 6 cuadrantes
  assert.ok(adminHtml.includes('id="sim-top-left"'), 'Debe incluir cuadrante sim-top-left');
  assert.ok(adminHtml.includes('id="sim-top-right"'), 'Debe incluir cuadrante sim-top-right');
  assert.ok(adminHtml.includes('id="sim-left-center"'), 'Debe incluir cuadrante sim-left-center');
  assert.ok(adminHtml.includes('id="sim-right-center"'), 'Debe incluir cuadrante sim-right-center');
  assert.ok(adminHtml.includes('id="sim-bottom-left"'), 'Debe incluir cuadrante sim-bottom-left');
  assert.ok(adminHtml.includes('id="sim-bottom-right"'), 'Debe incluir cuadrante sim-bottom-right');

  // Botones de acción
  assert.ok(adminHtml.includes('id="btnSaveMapLayout"'), 'Debe tener botón de guardar disposición');
  assert.ok(adminHtml.includes('id="btnSaveGlobalLayout"'), 'Debe tener botón de aplicar a todos los portales');
  assert.ok(adminHtml.includes('id="btnResetMapLayout"'), 'Debe tener botón de restablecer');
});

test('Super Admin - Lógica de control en js/app-admin.js', () => {
  const adminJs = fs.readFileSync('js/app-admin.js', 'utf8');
  assert.ok(adminJs.includes('initMapLayoutAdminTab'), 'app-admin.js debe definir initMapLayoutAdminTab');
  assert.ok(adminJs.includes('renderLayoutAdminView'), 'app-admin.js debe renderizar la vista de configuración');
  assert.ok(adminJs.includes('updateSimulatorVisual'), 'app-admin.js debe actualizar el simulador visual');
});

test('Ecosistema - mapLayoutManager.js cargado en los 5 portales con visor cartográfico', () => {
  const portals = ['index.html', 'municipal/index.html', 'ciudadano/index.html', 'notarial/index.html', 'admin/index.html'];
  portals.forEach(p => {
    const html = fs.readFileSync(p, 'utf8');
    assert.ok(html.includes('mapLayoutManager.js'), `${p} debe enlazar mapLayoutManager.js`);
  });
});
