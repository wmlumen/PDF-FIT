import test from 'node:test';
import assert from 'node:assert/strict';

import { getFeaturesByBbox } from '../cacheDb.js';
import { SovereignVectorTiles } from '../js/sovereignVectorTiles.js';

test('Motor Propio - Consulta Bounding Box directa sobre SQLite local', async () => {
  // Coordenadas aproximadas de Asunción/Central (-57.65 a -57.55, -25.35 a -25.25)
  const features = await getFeaturesByBbox(-57.65, -25.35, -57.55, -25.25);
  assert.ok(Array.isArray(features));
  assert.ok(features.length > 0, 'Debe encontrar parcelas almacenadas localmente');
  
  const f = features[0];
  assert.equal(f.type, 'Feature');
  assert.ok(f.geometry);
  assert.ok(f.properties);
});

test('Motor Propio - Instancia de SovereignVectorTiles cliente', () => {
  const engine = new SovereignVectorTiles({ minZoom: 15, maxLimit: 500 });
  assert.equal(engine.minZoom, 15);
  assert.equal(engine.maxLimit, 500);
  assert.equal(engine.isQuerying, false);
});
