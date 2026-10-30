import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificar, etiquetas, tipoCorto, SECTORES } from '../usosOsm.js';

test('etiquetas lee other_tags de ogr2ogr', () => {
  assert.deepEqual(etiquetas('"shop"=>"bakery","name:es"=>"Pan"'), { shop: 'bakery', 'name:es': 'Pan' });
});
test('clasifica por sector municipal', () => {
  assert.equal(clasificar({ other_tags: '"shop"=>"supermarket"' }).sector, 'comercio');
  assert.equal(clasificar({ other_tags: '"amenity"=>"school"' }).sector, 'educacion');
  assert.equal(clasificar({ amenity: 'hospital' }).sector, 'salud');
  assert.equal(clasificar({ other_tags: '"healthcare"=>"laboratory"' }).sector, 'salud');
  assert.equal(clasificar({ other_tags: '"amenity"=>"fuel"' }).sector, 'combustible');
  assert.equal(clasificar({ other_tags: '"office"=>"government"' }).sector, 'gobierno');
  assert.equal(clasificar({ building: 'church' }).sector, 'culto');
  assert.equal(clasificar({ other_tags: '"craft"=>"carpenter"' }).sector, 'industria');
  assert.equal(clasificar({ tourism: 'hotel' }).sector, 'alojamiento');
});
test('ignora mobiliario urbano y objetos sin uso', () => {
  assert.equal(clasificar({ other_tags: '"amenity"=>"bench"' }), null);
  assert.equal(clasificar({ building: 'yes' }), null);
});
test('habilitación: comercio sí, escuela pública no', () => {
  assert.equal(SECTORES.comercio.habilitacion, true);
  assert.equal(SECTORES.gobierno.habilitacion, false);
  assert.equal(tipoCorto('shop=hardware_store'), 'hardware store');
});
