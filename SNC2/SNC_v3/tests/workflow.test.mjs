import assert from 'node:assert/strict';
import { explodePolygonFeatures } from '../js/geoFeatures.js';
import { buildGeoJSON, buildKML, selectOfficialProperties } from '../js/exportFormats.js';

globalThis.localStorage = {
    data: new Map(),
    getItem(key) { return this.data.get(key) ?? null; },
    setItem(key, value) { this.data.set(key, String(value)); },
    removeItem(key) { this.data.delete(key); }
};
globalThis.window = globalThis;

const { State } = await import('../js/state.js');
const square = (x, y, size) => [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]];
const input = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: { CODIGO: 'EXP-01' },
        geometry: { type: 'MultiPolygon', coordinates: [square(500000, 7200000, 10), square(500020, 7200000, 20)] }
    }]
};

const exploded = explodePolygonFeatures(input, 'PRUEBA');
assert.equal(exploded.features.length, 2, 'MultiPolygon genera una feature por parcela');
assert.deepEqual(exploded.features.map(feature => feature.properties.CODIGO), ['EXP-01_1', 'EXP-01_2']);

State.clear();
State.set('projection', 'EPSG:32721');
State.set('currentDisplayProjection', 'EPSG:32721');
State.set('geojson', exploded);
State.set('excelData', []);
const sync = State.syncGeometryToParcelRows({ createMissing: true });
const rows = State.get('excelData');
assert.equal(sync.polygons, 2, 'Sincroniza dos polígonos');
assert.equal(rows.length, 2, 'Crea exactamente una fila por polígono');
assert.deepEqual(rows.map(row => row.PARCELA_NUMERO), [1, 2], 'Asigna numeración determinista');
assert.deepEqual(rows.map(row => row.SUP_SIG_M), [100, 400], 'Traslada SUP_SIG_M calculada a cada fila');
assert.deepEqual(rows.map(row => row.SUP_SIG_M2), [100, 400], 'Mantiene alias técnico SUP_SIG_M2');

const geojsonText = buildGeoJSON(exploded);
assert.equal(JSON.parse(geojsonText).features.length, 2, 'GeoJSON exportado es válido');
const kml = buildKML(exploded);
assert.match(kml, /<kml xmlns="http:\/\/www\.opengis\.net\/kml\/2\.2">/);
assert.equal((kml.match(/<Placemark>/g) || []).length, 2, 'KML contiene una parcela por Placemark');

const officialFields = ['CODIGO','PROPIETARIO','USO_TIERRA','SUP_TITULO','DEPARTAMEN','DISTRITO','PADRON','ZONA','MANZANA','LOTE','SUP_SIG_M','SUP_LEGAL','REG_PROF','FINCA','MATRICULA','COLONIA'];
const official = selectOfficialProperties({ CODIGO: 'A', SUP_SIG_M: 100, SUP_SIG_M2: 100, PARCELA_NUMERO: 1, __featureId: 'interno' }, officialFields);
assert.deepEqual(Object.keys(official), officialFields, 'El entregable conserva exactamente los 16 campos oficiales y su orden');
assert.equal('SUP_SIG_M2' in official, false, 'SUP_SIG_M2 no se exporta');
assert.equal('PARCELA_NUMERO' in official, false, 'La numeración interna no se exporta');

console.log('✅ WORKFLOW TESTS: 14/14 pasaron');
