/**
 * Tests del motor CRS (js/crs.js) — Res. SNC 551/2023
 * Ejecutar: node tests/crs.test.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
    detectCRS, analyzeCRS, reprojectFeatureCollection, reprojectPoint,
    initCrs, bboxOf, normalizeEpsg, isGeographic, zoneOf, PY_BBOX, isInsideParaguay
} from '../js/crs.js';

const require = createRequire(import.meta.url);
// proj4 en Node es CommonJS: se inyecta como global para que crs.js lo use.
globalThis.proj4 = require('proj4');

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
}

console.log('\n=== Motor CRS — detección, reproyección y exportación ===\n');

console.log('1) initCrs / acceso a proj4');
t('initCrs registra las definiciones', () => assert.equal(initCrs(), true));
t('normalizeEpsg acepta 32721', () => assert.equal(normalizeEpsg('32721'), 'EPSG:32721'));
t('normalizeEpsg acepta EPSG:32721', () => assert.equal(normalizeEpsg('EPSG:32721'), 'EPSG:32721'));
t('normalizeEpsg acepta urn', () => assert.equal(normalizeEpsg('urn:ogc:def:crs:EPSG::32721'), 'EPSG:32721'));
t('normalizeEpsg rechaza basura', () => assert.equal(normalizeEpsg('hola'), null));
t('normalizeEpsg rechaza código no soportado', () => assert.equal(normalizeEpsg('99999'), null));
t('isGeographic / zoneOf', () => {
    assert.equal(isGeographic('EPSG:4326'), true);
    assert.equal(isGeographic('EPSG:32721'), false);
    assert.equal(zoneOf('EPSG:32721'), 21);
    assert.equal(zoneOf('EPSG:4326'), null);
});

console.log('\n2) Detección por rango de coordenadas (grados)');
const fcGeo = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-57.0078, -25.4541] } }
]};
t('grados en Paraguay → EPSG:4326', () => {
    const d = detectCRS(fcGeo);
    assert.equal(d.code, 'EPSG:4326');
    assert.equal(d.source, 'range');
    assert.ok(d.confidence >= 0.9);
});
t('analyzeCRS no pide reproyección', () => {
    const a = analyzeCRS(fcGeo);
    assert.equal(a.needsReprojection, false);
    assert.equal(a.ok, true);
});
t('grados fuera de Paraguay también → 4326', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[2.35, 48.85] } }] };
    assert.equal(detectCRS(fc).code, 'EPSG:4326');
});

console.log('\n3) Detección por metadatos');
t('bloque crs declarado gana sobre el rango', () => {
    const fc = { type:'FeatureCollection',
        crs: { type:'name', properties:{ name:'urn:ogc:def:crs:EPSG::32721' } },
        features:[{ type:'Feature', properties:{}, geometry:{ type:'Point', coordinates:[499209, 7184763] } }] };
    const d = detectCRS(fc);
    assert.equal(d.code, 'EPSG:32721');
    assert.equal(d.source, 'metadata');
    assert.equal(d.confidence, 1);
});
t('atributo ZONA=21 resuelve la zona', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{ ZONA: '21' },
        geometry:{ type:'Point', coordinates:[499209, 7184763] } }] };
    assert.equal(detectCRS(fc).code, 'EPSG:32721');
});
t('atributo EPSG explícito', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{ EPSG: 32720 },
        geometry:{ type:'Point', coordinates:[300000, 7200000] } }] };
    assert.equal(detectCRS(fc).code, 'EPSG:32720');
});

console.log('\n4) Detección por prueba de hipótesis de zona (metros, sin metadatos)');
t('UTM 21S real (vertedero Piribebuy) → EPSG:32721', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Polygon', coordinates:[[
            [499209, 7184763], [499400, 7184700], [499500, 7184900], [499209, 7184763]
        ]] } }] };
    const d = detectCRS(fc);
    assert.equal(d.code, 'EPSG:32721', `obtenido ${d.code} (${d.reason})`);
    assert.equal(d.source, 'zone-probe');
    assert.equal(d.zone, 21);
    assert.ok(d.candidates.length >= 2);
    // La zona 21 debe ganar a la 20
    assert.ok(d.candidates[0].zone === 21);
    assert.ok(d.candidates[0].hits > d.candidates[1].hits);
});
t('UTM 20S (Chaco) → EPSG:32720', () => {
    // Punto en el Chaco paraguayo (~-60.5 lon) → zona 20
    const [e, n] = reprojectPoint(-60.5, -22.5, 'EPSG:4326', 'EPSG:32720');
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[e, n] } }] };
    const d = detectCRS(fc);
    assert.equal(d.code, 'EPSG:32720', `obtenido ${d.code} (${d.reason})`);
});
t('metros con zona ambigua no se fuerza (devuelve null)', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[12345, 9999999] } }] };
    const d = detectCRS(fc);
    assert.equal(d.code, null);
    assert.equal(d.source, 'none');
});

console.log('\n5) Reproyección y precisión');
t('reprojectPoint round-trip 4326→32721→4326 < 1 mm', () => {
    const lon = -57.00786345, lat = -25.45415224;
    const [e, n] = reprojectPoint(lon, lat, 'EPSG:4326', 'EPSG:32721');
    const [lon2, lat2] = reprojectPoint(e, n, 'EPSG:32721', 'EPSG:4326');
    const dLon = Math.abs(lon2 - lon), dLat = Math.abs(lat2 - lat);
    assert.ok(dLon < 1e-8 && dLat < 1e-8, `delta lon=${dLon} lat=${dLat}`);
});
t('reprojectPoint round-trip 4326→32720→4326 < 1 mm', () => {
    const lon = -60.5, lat = -22.5;
    const [e, n] = reprojectPoint(lon, lat, 'EPSG:4326', 'EPSG:32720');
    const [lon2, lat2] = reprojectPoint(e, n, 'EPSG:32720', 'EPSG:4326');
    assert.ok(Math.abs(lon2-lon) < 1e-8 && Math.abs(lat2-lat) < 1e-8);
});
t('coincidencia con atributos X/Y reales del proyecto (< 1 m)', () => {
    // centro.geojson declara X=499209 Y=7184763 y geometría [-57.00786345, -25.45415224]
    const [lon, lat] = reprojectPoint(499209, 7184763, 'EPSG:32721', 'EPSG:4326');
    const dLon = Math.abs(lon - (-57.00786345289872));
    const dLat = Math.abs(lat - (-25.45415224776208));
    const m = Math.hypot(dLon * 111320 * Math.cos(lat * Math.PI/180), dLat * 110540);
    assert.ok(m < 1.0, `error ${m.toFixed(3)} m`);
});
t('reprojectFeatureCollection no muta el original', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{a:1},
        geometry:{ type:'Point', coordinates:[499209, 7184763] } }] };
    const before = JSON.stringify(fc);
    reprojectFeatureCollection(fc, 'EPSG:32721', 'EPSG:4326');
    assert.equal(JSON.stringify(fc), before);
});
t('reprojectFeatureCollection etiqueta SRC_ORIGEN / SRC_DESTINO', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[499209, 7184763] } }] };
    const out = reprojectFeatureCollection(fc, 'EPSG:32721', 'EPSG:4326');
    assert.equal(out.features[0].properties.SRC_ORIGEN, 'EPSG:32721');
    assert.equal(out.features[0].properties.SRC_DESTINO, 'EPSG:4326');
    assert.equal(out.__crs, 'EPSG:4326');
    assert.equal(out.crs, undefined);
});
t('reprojectFeatureCollection redondea según destino (grados 8 dec.)', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[499209, 7184763] } }] };
    const out = reprojectFeatureCollection(fc, 'EPSG:32721', 'EPSG:4326');
    const [lon, lat] = out.features[0].geometry.coordinates;
    const dec = (v) => (String(v).split('.')[1] || '').length;
    assert.ok(dec(lon) <= 8 && dec(lat) <= 8, `lon=${lon} lat=${lat}`);
});
t('geometría anidada (Polygon con anillo) se reproyecta completa', () => {
    const ring = [[499209,7184763],[499400,7184700],[499500,7184900],[499209,7184763]];
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Polygon', coordinates:[ring] } }] };
    const out = reprojectFeatureCollection(fc, 'EPSG:32721', 'EPSG:4326');
    const r = out.features[0].geometry.coordinates[0];
    assert.equal(r.length, 4);
    r.forEach(([lon, lat]) => {
        assert.ok(lon > -63 && lon < -54, `lon fuera de rango: ${lon}`);
        assert.ok(lat > -28 && lat < -19, `lat fuera de rango: ${lat}`);
    });
});
t('anillo se mantiene cerrado tras reproyectar', () => {
    const ring = [[499209,7184763],[499400,7184700],[499500,7184900],[499209,7184763]];
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Polygon', coordinates:[ring] } }] };
    const out = reprojectFeatureCollection(fc, 'EPSG:32721', 'EPSG:4326');
    const r = out.features[0].geometry.coordinates[0];
    assert.deepEqual(r[0], r[r.length - 1]);
});
t('mismo CRS origen/destino devuelve el mismo objeto (no-op)', () => {
    const fc = { type:'FeatureCollection', features:[] };
    assert.equal(reprojectFeatureCollection(fc, 'EPSG:4326', 'EPSG:4326'), fc);
});

console.log('\n6) bboxOf y utilidades');
t('bboxOf calcula la envolvente', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'MultiPoint', coordinates:[[1,2],[5,8]] } }] };
    assert.deepEqual(bboxOf(fc), [1, 2, 5, 8]);
});
t('bboxOf devuelve null sin coordenadas', () => {
    assert.equal(bboxOf({ type:'FeatureCollection', features:[] }), null);
});
t('bboxOf ignora valores no finitos', () => {
    const fc = { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
        geometry:{ type:'Point', coordinates:[NaN, 3] } }] };
    assert.equal(bboxOf(fc), null);
});
t('PY_BBOX cubre el territorio', () => {
    assert.ok(PY_BBOX.minLon < -62 && PY_BBOX.maxLon > -54.1);
    assert.ok(PY_BBOX.minLat < -27.5 && PY_BBOX.maxLat > -19.1);
});
t('isInsideParaguay acepta ciudades paraguayas', () => {
    const cities = [
        ['Piribebuy', -57.0078, -25.4541], ['Asunción', -57.5759, -25.2637],
        ['Encarnación', -55.87, -27.33], ['Ciudad del Este', -54.61, -25.51],
        ['Salto del Guairá', -54.31, -24.06], ['Filadelfia', -60.03, -22.35],
        ['Bahía Negra', -57.85, -20.22], ['Cnel. Oviedo', -56.25, -25.09],
        ['Pilar', -58.29, -26.86], ['Chaco medio', -60.5, -22.5]
    ];
    for (const [name, lon, lat] of cities) {
        assert.equal(isInsideParaguay(lon, lat), true, `${name} (${lon},${lat}) debería estar dentro`);
    }
});
t('isInsideParaguay rechaza países vecinos (falso positivo del bbox)', () => {
    // CRÍTICO: -54.5/-22.5 es Brasil, y cae dentro del bbox rectangular.
    // Es exactamente donde aparece un punto del Chaco leído como zona 21.
    const outside = [
        ['Brasil Mato Grosso do Sul', -54.5, -22.5], ['Brasil', -54.3, -25.5],
        ['Brasil lejano', -50.0, -20.0], ['Argentina', -58.5, -28.0],
        ['Bolivia', -63.5, -21.0], ['Océano Atlántico', -56.0, -29.0]
    ];
    for (const [name, lon, lat] of outside) {
        assert.equal(isInsideParaguay(lon, lat), false, `${name} (${lon},${lat}) NO debería estar dentro`);
    }
});

console.log('\n7) Datos reales del proyecto (data/piribebuy)');
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const name of ['barrios','vias','hidro','vertedero','centro','vertedero_500',
                    'vertedero_1000','vuelo_casco','casco_historico','casco_hist']) {
    t(`${name}.geojson → EPSG:4326 sin reproyección`, () => {
        const fc = JSON.parse(readFileSync(join(ROOT, 'data', 'piribebuy', `${name}.geojson`), 'utf8'));
        const a = analyzeCRS(fc);
        assert.equal(a.source, 'EPSG:4326', `${name}: source=${a.source} (${a.detected.reason})`);
        assert.equal(a.needsReprojection, false);
        assert.equal(a.ok, true);
    });
}

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60) + '\n');
process.exit(fail ? 1 : 0);
