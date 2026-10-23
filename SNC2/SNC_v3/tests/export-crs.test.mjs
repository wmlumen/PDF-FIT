/**
 * Tests del exportador con CRS seleccionable.
 * Ejecutar: node tests/export-crs.test.mjs
 *
 * No depende del DOM ni de shpwrite: verifica la lógica de reproyección y
 * los .prj que se emiten para cada CRS destino.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CRS_WKT, reprojectFeatureCollection, initCrs, isGeographic, labelOf } from '../js/crs.js';

const require = createRequire(import.meta.url);
globalThis.proj4 = require('proj4');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
}

console.log('\n=== Exportación con CRS seleccionable ===\n');
initCrs();

console.log('1) .prj por CRS destino');
t('WKT de 4326 es GEOGCS (no PROJCS)', () => {
    assert.ok(CRS_WKT['EPSG:4326'].startsWith('GEOGCS['));
    assert.ok(!CRS_WKT['EPSG:4326'].includes('Transverse_Mercator'));
});
t('WKT de 32721 es UTM 21S con meridiano -57', () => {
    const w = CRS_WKT['EPSG:32721'];
    assert.ok(w.startsWith('PROJCS['));
    assert.ok(w.includes('Zone_21S'));
    assert.ok(w.includes('Central_Meridian",-57.0'));
    assert.ok(w.includes('False_Northing",10000000.0'));
});
t('WKT de 32720 es UTM 20S con meridiano -63', () => {
    const w = CRS_WKT['EPSG:32720'];
    assert.ok(w.includes('Zone_20S'));
    assert.ok(w.includes('Central_Meridian",-63.0'));
});
t('los tres .prj son distintos entre sí', () => {
    const vals = [CRS_WKT['EPSG:4326'], CRS_WKT['EPSG:32721'], CRS_WKT['EPSG:32720']];
    assert.equal(new Set(vals).size, 3);
});

console.log('\n2) Exportar en UTM 21S (por defecto)');
const fc4326 = { type:'FeatureCollection', features:[{ type:'Feature',
    properties:{ CODIGO:'L-001', PROPIETARIO:'Test' },
    geometry:{ type:'Polygon', coordinates:[[
        [-57.0078,-25.4541], [-57.0068,-25.4541], [-57.0068,-25.4531], [-57.0078,-25.4541]
    ]] } }] };

t('coordenadas quedan en rango UTM (100k-900k / 0-10M)', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    out.features[0].geometry.coordinates[0].forEach(([x, y]) => {
        assert.ok(x >= 100000 && x <= 900000, `x=${x}`);
        assert.ok(y >= 0 && y <= 10000000, `y=${y}`);
    });
});
t('el este UTM 21S cae cerca de 499000 (Piribebuy real)', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    const [x] = out.features[0].geometry.coordinates[0][0];
    assert.ok(Math.abs(x - 499209) < 2000, `x=${x} (esperado ~499209)`);
});
t('etiqueta SRC_DESTINO en cada feature', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    assert.equal(out.features[0].properties.SRC_DESTINO, 'EPSG:32721');
});
t('conserva los atributos originales', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    assert.equal(out.features[0].properties.CODIGO, 'L-001');
    assert.equal(out.features[0].properties.PROPIETARIO, 'Test');
});

console.log('\n3) Exportar en UTM 20S');
t('UTM 20S: un punto de Piribebuy queda FUERA del rango válido', () => {
    // -57.0078 está a 5.99° al oeste del meridiano central -63 de la zona 20.
    // Eso produce un este > 1.100.000 m, fuera del dominio UTM útil
    // (100.000–900.000). Es la prueba de que Piribebuy pertenece a la zona 21,
    // no a la 20: forzar la zona equivocada da coordenadas inválidas.
    const o20 = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32720');
    const [x20] = o20.features[0].geometry.coordinates[0][0];
    assert.ok(x20 > 900000, `x20=${x20} debería exceder 900000`);
});
t('UTM 21S: el mismo punto SÍ cae en el rango válido', () => {
    const o21 = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    const [x21] = o21.features[0].geometry.coordinates[0][0];
    assert.ok(x21 > 100000 && x21 < 900000, `x21=${x21} debería estar en rango`);
    assert.ok(Math.abs(x21 - 499216) < 500, `x21=${x21} (esperado ~499216)`);
});
t('zona 20 y 21 dan coordenadas distintas (no es no-op)', () => {
    const o21 = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    const o20 = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32720');
    assert.notDeepEqual(o21.features[0].geometry.coordinates, o20.features[0].geometry.coordinates);
});

console.log('\n4) Exportar en EPSG:4326 (sin reproyección)');
t('coordenadas se mantienen en grados', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:4326');
    assert.deepEqual(out, fc4326);   // no-op devuelve el mismo objeto
});
t('isGeographic reconoce 4326', () => assert.equal(isGeographic('EPSG:4326'), true));

console.log('\n5) Round-trip de exportación (no pierde precisión)');
t('4326 → 32721 → 4326 conserva los vértices (< 1 cm)', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    const back = reprojectFeatureCollection(out, 'EPSG:32721', 'EPSG:4326');
    const a = fc4326.features[0].geometry.coordinates[0];
    const b = back.features[0].geometry.coordinates[0];
    for (let i = 0; i < a.length; i++) {
        const dLon = Math.abs(a[i][0] - b[i][0]);
        const dLat = Math.abs(a[i][1] - b[i][1]);
        const m = Math.hypot(dLon * 111320 * Math.cos(a[i][1] * Math.PI/180), dLat * 110540);
        assert.ok(m < 0.01, `vértice ${i}: error ${m.toFixed(4)} m`);
    }
});
t('área en UTM 21S es razonable (triángulo ~100m x 110m)', () => {
    const out = reprojectFeatureCollection(fc4326, 'EPSG:4326', 'EPSG:32721');
    const ring = out.features[0].geometry.coordinates[0];
    // Área por la fórmula del cordón (shoelace)
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        area += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
    }
    area = Math.abs(area / 2);
    // El anillo de prueba es un TRIÁNGULO (3 vértices + cierre):
    // 0.001° lon ≈ 100.5 m, 0.001° lat ≈ 110.5 m → área = ½·base·altura ≈ 5555 m².
    assert.ok(area > 5000 && area < 6200, `área=${area.toFixed(0)} m² (esperado ~5555)`);
});

console.log('\n6) Etiquetas legibles para el manifiesto');
t('labelOf describe los CRS de exportación', () => {
    assert.ok(labelOf('EPSG:4326').includes('WGS84'));
    assert.ok(labelOf('EPSG:32721').includes('21S'));
    assert.ok(labelOf('EPSG:32720').includes('20S'));
});

console.log('\n7) Datos reales: exportar Piribebuy a UTM 21S');
t('vertedero.geojson exportado a 21S cae en rango UTM de Paraguay', () => {
    const fc = JSON.parse(readFileSync(join(ROOT, 'data', 'piribebuy', 'vertedero.geojson'), 'utf8'));
    const out = reprojectFeatureCollection(fc, 'EPSG:4326', 'EPSG:32721');
    const ring = out.features[0].geometry.coordinates[0];
    ring.forEach(([x, y]) => {
        assert.ok(x > 400000 && x < 600000, `este=${x}`);
        assert.ok(y > 7000000 && y < 7300000, `norte=${y}`);
    });
});
t('centro.geojson exportado a 21S coincide con sus atributos X/Y', () => {
    const fc = JSON.parse(readFileSync(join(ROOT, 'data', 'piribebuy', 'centro.geojson'), 'utf8'));
    const declared = { x: fc.features[0].properties.X, y: fc.features[0].properties.Y };
    const out = reprojectFeatureCollection(fc, 'EPSG:4326', 'EPSG:32721');
    const [x, y] = out.features[0].geometry.coordinates;
    assert.ok(Math.abs(x - declared.x) < 1, `x=${x} vs declarado ${declared.x}`);
    assert.ok(Math.abs(y - declared.y) < 1, `y=${y} vs declarado ${declared.y}`);
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60) + '\n');
process.exit(fail ? 1 : 0);
