import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';
globalThis.proj4 = proj4;

const { detectCRS, analyzeCRS, reprojectFeatureCollection, geojsonPlausibleEnParaguay } = await import('../js/crs.js');

// Parcela de Piribebuy en UTM 21S con atributo catastral ZONA = 21 (colisiona con la zona UTM 21).
const UTM = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { ZONA: 21, PADRON: 'LOTE-A1' },
  geometry: { type: 'Polygon', coordinates: [[[495000, 7183000], [495030, 7183000], [495030, 7183040], [495000, 7183040], [495000, 7183000]]] } }] };

test('un GeoJSON en UTM con ZONA 21 se sigue detectando como UTM 21S', () => {
  assert.equal(detectCRS(UTM).code, 'EPSG:32721');
});

test('regresion: ya reproyectado a WGS84, el atributo ZONA no provoca una segunda reproyeccion', () => {
  const wgs = reprojectFeatureCollection(UTM, 'EPSG:32721', 'EPSG:4326');
  const d = detectCRS(wgs);
  assert.equal(d.code, 'EPSG:4326', d.reason);
  assert.equal(analyzeCRS(wgs, 'EPSG:4326').needsReprojection, false);
  const [lng, lat] = wgs.features[0].geometry.coordinates[0][0];
  assert.ok(lng < -56 && lng > -58 && lat < -25 && lat > -26, `${lng},${lat}`);
});

test('un bloque crs explicito del archivo sigue mandando', () => {
  const conCrs = { ...UTM, crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::32721' } } };
  assert.equal(detectCRS(conCrs).code, 'EPSG:32721');
});

test('geojsonPlausibleEnParaguay descarta expedientes colapsados cerca del polo', () => {
  const dañado = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-153.24, -85.52], [-153.24, -85.52], [-153.24, -85.52]]] } }] };
  assert.equal(geojsonPlausibleEnParaguay(dañado), false);
  assert.equal(geojsonPlausibleEnParaguay(UTM), true);
  assert.equal(geojsonPlausibleEnParaguay(reprojectFeatureCollection(UTM, 'EPSG:32721', 'EPSG:4326')), true);
  assert.equal(geojsonPlausibleEnParaguay({ type: 'FeatureCollection', features: [] }), true);
});
