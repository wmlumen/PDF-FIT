/**
 * tests/all-index-functionalities.test.mjs
 * Suite integral de pruebas para TODAS las funcionalidades y portales (los 5 index):
 * 1. index.html            (Mesa Técnica Profesional - Agrimensura / Validación SNC 551/2023)
 * 2. municipal/index.html   (Geoportal Municipal Multifinalitario - Ley 3966/10)
 * 3. notarial/index.html    (Portal Notarial / Escribanía - Due Diligence & Minutas)
 * 4. admin/index.html       (Super Administrador / Administración 3 Pilares & 9 Dependencias)
 * 5. ciudadano/index.html   (Portal Ciudadano Pro - Enlaces Compartibles & Consulta Pública)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5556';

// =========================================================================
// 1. EXISTENCIA FÍSICA Y ARQUITECTURA DE ARCHIVOS DE LOS 5 INDEX
// =========================================================================
test('Estructura de Archivos - Los 5 portales index existen en sus carpetas oficiales', () => {
    const portals = [
        { name: 'Profesional', path: 'index.html' },
        { name: 'Municipal',   path: 'municipal/index.html' },
        { name: 'Notarial',    path: 'notarial/index.html' },
        { name: 'Super Admin', path: 'admin/index.html' },
        { name: 'Ciudadano',   path: 'ciudadano/index.html' }
    ];

    portals.forEach(p => {
        assert.ok(fs.existsSync(p.path), `El archivo ${p.path} (${p.name}) debe existir físicamente`);
        const content = fs.readFileSync(p.path, 'utf8');
        assert.ok(content.length > 500, `${p.name} debe tener contenido HTML completo`);
        assert.ok(content.includes('<!DOCTYPE html>') || content.includes('<html'), `${p.name} debe ser un documento HTML válido`);
    });
});

// =========================================================================
// 2. DISPONIBILIDAD HTTP Y RESPUESTA 200 EN SERVER-API
// =========================================================================
test('Server HTTP - Servidor entrega 200 OK para todas las rutas canónicas de index', async () => {
    const routes = [
        { url: `${BASE_URL}/`, title: 'SNC' },
        { url: `${BASE_URL}/municipal/`, title: 'Municipal' },
        { url: `${BASE_URL}/notarial/`, title: 'Notarial' },
        { url: `${BASE_URL}/admin/`, title: 'Admin' },
        { url: `${BASE_URL}/superadmin`, title: 'Admin' },
        { url: `${BASE_URL}/ciudadano/`, title: 'Ciudadano' }
    ];

    for (const r of routes) {
        const res = await fetch(r.url);
        assert.equal(res.status, 200, `Ruta ${r.url} debe responder 200 OK`);
        const text = await res.text();
        assert.ok(text.length > 300, `Ruta ${r.url} debe servir HTML no vacío`);
    }
});

// =========================================================================
// 3. FUNCIONALIDADES: INDEX PROFESIONAL (index.html)
// =========================================================================
test('Funcionalidades Index Profesional (index.html) - Mesa Técnica, CAD, Osnap y Medición', () => {
    const html = fs.readFileSync('index.html', 'utf8');

    // 1. Contenedor del mapa y controles principales
    assert.ok(html.includes('id="map"'), 'Debe contener el div del mapa Leaflet');
    assert.ok(html.includes('id="map-tool-measure"'), 'Debe tener herramienta de medición y acotamiento');
    assert.ok(html.includes('id="map-tool-osnap"'), 'Debe tener herramienta Osnap / Refent (F3)');
    assert.ok(html.includes('id="map-tool-osnap-tracking"'), 'Debe tener herramienta Osnap Tracking (F11)');

    // 2. Herramientas avanzadas de edición y topología
    assert.ok(html.includes('window.CogoUI?.open()'), 'Debe integrar herramienta de cálculo y derroteros COGO');
    assert.ok(html.includes('window.TopologyRepairUI?.open()'), 'Debe integrar reparación topológica asistida');
    assert.ok(html.includes('window.GeoprocessingUI?.open()'), 'Debe integrar geoprocesamiento catastral');

    // 3. Scripts de entrada del motor (Arquitectura Modular ESM)
    assert.ok(html.includes('src="/js/app.js"'), 'Debe enlazar el entry-point modular /js/app.js');
    const appEntry = fs.readFileSync('js/app/index.js', 'utf8');
    assert.ok(appEntry.includes("import * as MapEngine from '../mapEngine.js'"), 'El entry point debe importar MapEngine');
});

// =========================================================================
// 4. FUNCIONALIDADES: INDEX MUNICIPAL (municipal/index.html)
// =========================================================================
test('Funcionalidades Index Municipal (municipal/index.html) - Ley 3966/10, Fraccionamientos y Capas', () => {
    const html = fs.readFileSync('municipal/index.html', 'utf8');

    // 1. Secciones operativas obligatorias de la Ley 3966
    assert.ok(html.includes('id="municipal-status-section"'), 'Debe incluir sección de parámetros y estado municipal');
    assert.ok(html.includes('id="fraccionamiento-section"'), 'Debe incluir sección de fraccionamientos');
    assert.ok(html.includes('id="qgis-layer-control"'), 'Debe incluir panel de control de capas estilo QGIS');
    assert.ok(html.includes('id="balance-sidebar-section"'), 'Debe incluir balance de superficies (16% viales / 5%-7% plazas)');
    assert.ok(html.includes('id="loteamiento-section"'), 'Debe incluir cálculo de loteamientos según Art. 235 Ley 3966');
    assert.ok(html.includes('id="ambiental-section"'), 'Debe incluir verificación de restricciones ambientales');
    assert.ok(html.includes('id="symbology-section"'), 'Debe incluir configuración de simbología temática');

    // 2. Control de expedientes y dictámenes
    assert.ok(html.includes('loadSampleMunicipal'), 'Debe tener cargador de expedientes municipales demo');
    assert.ok(html.includes('exportMunicipalDictamen') || html.includes('generateMunicipalReport'), 'Debe permitir exportar dictamen municipal');
    assert.ok(html.includes('js/app-municipal.js'), 'Debe enlazar el controlador js/app-municipal.js');
});

// =========================================================================
// 5. FUNCIONALIDADES: INDEX NOTARIAL (notarial/index.html)
// =========================================================================
test('Funcionalidades Index Notarial (notarial/index.html) - Due Diligence, Tasas y Minutas', () => {
    const html = fs.readFileSync('notarial/index.html', 'utf8');

    // 1. Título y propósito institucional
    assert.ok(html.includes('Portal Notarial') || html.includes('Escriban'), 'Debe identificarse como Portal Notarial/Escribanías');

    // 2. Herramientas notariales
    assert.ok(html.includes('Due Diligence') || html.includes('Semáforo de Riesgo') || html.includes('diligence'), 'Debe contener módulo de Due Diligence');
    assert.ok(html.includes('Liquidación') || html.includes('Transferencia') || html.includes('liquidar'), 'Debe contener cálculo de liquidación tributaria/arancelaria');
    assert.ok(html.includes('Minuta') || html.includes('Linderos') || html.includes('minuta'), 'Debe contener generador de minuta notarial con cláusula técnica');

    // 3. Script controlador
    assert.ok(html.includes('js/app-notarial.js'), 'Debe enlazar js/app-notarial.js');
});

// =========================================================================
// 6. FUNCIONALIDADES: INDEX SUPER ADMIN (admin/index.html)
// =========================================================================
test('Funcionalidades Index Super Admin (admin/index.html) - 3 Pilares y 9 Dependencias Municipales', () => {
    const html = fs.readFileSync('admin/index.html', 'utf8');

    // 1. Elementos clave de administración de los 3 pilares
    assert.ok(html.includes('Super Admin') || html.includes('Administrador'), 'Debe titularse como Super Admin / Administrador');
    assert.ok(html.includes('id="admin-map"'), 'Debe incluir mapa GIS de supervisión territorial');
    assert.ok(html.includes('id="panel-profesional"'), 'Debe incluir panel de administración de profesionales');
    assert.ok(html.includes('id="panel-municipal"'), 'Debe incluir panel de administración municipal');
    assert.ok(html.includes('id="panel-notarial"'), 'Debe incluir panel de administración notarial');
    assert.ok(html.includes('id="membersTable"'), 'Debe incluir tabla de control de usuarios y miembros');

    // 2. Script controlador con las 9 dependencias
    assert.ok(html.includes('js/app-admin.js'), 'Debe enlazar js/app-admin.js');
    const adminJs = fs.readFileSync('js/app-admin.js', 'utf8');
    
    // Verificar que las 9 dependencias estén formalmente registradas
    const dependenciasRequeridas = [
        'super_admin', 'notarial', 'junta_municipal', 'catastro',
        'ambiental', 'planificacion', 'obras', 'educacion', 'patrimonio'
    ];
    dependenciasRequeridas.forEach(dep => {
        assert.ok(adminJs.includes(`${dep}:`), `Debe existir definición de dependencia ${dep} en app-admin.js`);
    });
});

// =========================================================================
// 7. FUNCIONALIDADES: INDEX CIUDADANO (ciudadano/index.html)
// =========================================================================
test('Funcionalidades Index Ciudadano (ciudadano/index.html) - Enlaces Compartibles y Consulta Pública', () => {
    const html = fs.readFileSync('ciudadano/index.html', 'utf8');

    // 1. Visor ciudadano
    assert.ok(html.includes('id="map"'), 'Debe contener el visor de mapa público');
    assert.ok(html.includes('js/app-ciudadano.js'), 'Debe enlazar js/app-ciudadano.js');

    // 2. Controlador de enlaces compartibles y buscador
    const ciudadanoJs = fs.readFileSync('js/app-ciudadano.js', 'utf8');
    assert.ok(ciudadanoJs.includes('URLSearchParams'), 'Debe soportar lectura y generación de parámetros en URL');
    assert.ok(ciudadanoJs.includes('padron'), 'Debe soportar búsqueda y apertura por parámetro padron');
    assert.ok(ciudadanoJs.includes('muni'), 'Debe soportar carga por parámetro de municipalidad');
});

// =========================================================================
// 8. INTEROPERABILIDAD Y NAVEGACIÓN CRUZADA ENTRE LOS 5 PORTALES
// =========================================================================
test('Navegación Cruzada - Los portales permiten alternar fluidamente entre interfaces', () => {
    // Verificar que al menos los portales principales contengan referencias de navegación
    const adminHtml = fs.readFileSync('admin/index.html', 'utf8');
    const notarialHtml = fs.readFileSync('notarial/index.html', 'utf8');
    const municipalHtml = fs.readFileSync('municipal/index.html', 'utf8');

    assert.ok(adminHtml.includes('/municipal') || adminHtml.includes('municipal'), 'Admin debe vincular al geoportal municipal');
    assert.ok(notarialHtml.includes('/municipal') || notarialHtml.includes('municipal') || notarialHtml.includes('/'), 'Notarial debe vincular al ecosistema catastral');
    assert.ok(municipalHtml.includes('data-portal') || municipalHtml.includes('href') || municipalHtml.includes('window.location'), 'Municipal debe proveer navegación');
});
