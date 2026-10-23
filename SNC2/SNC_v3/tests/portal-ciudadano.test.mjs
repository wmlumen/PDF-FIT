import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { ENV } from '../config.env.js';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5556';
const JWT_SECRET = ENV.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

test('Portal Ciudadano - Lectura pública de metadatos municipales (/api/municipal/:muni/info)', async () => {
  const res = await fetch(`${BASE_URL}/api/municipal/piribebuy/info`);
  assert.equal(res.status, 200, 'Debe responder 200 OK');
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.data, 'Debe incluir data');
  assert.equal(body.data.id, 'piribebuy');
  assert.equal(body.data.nombre, 'Municipalidad de Piribebuy');
  assert.ok(body.data.actualizado, 'Debe incluir fecha de actualización');
});

test('Portal Ciudadano - Lectura pública de parcelas GeoJSON (/api/municipal/:muni/parcelas)', async () => {
  const res = await fetch(`${BASE_URL}/api/municipal/piribebuy/parcelas`);
  assert.equal(res.status, 200, 'Debe responder 200 OK');
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('application/json'), 'Content-Type debe ser application/json');
  const geojson = await res.json();
  assert.equal(geojson.type, 'FeatureCollection');
  assert.ok(Array.isArray(geojson.features), 'features debe ser un array');
  assert.ok(geojson.features.length > 0, 'Debe contener al menos una parcela');
});

test('Portal Ciudadano - Protección contra Path Traversal en muniId', async () => {
  const res1 = await fetch(`${BASE_URL}/api/municipal/..%2F..%2Fetc/info`);
  assert.ok(res1.status === 400 || res1.status === 404, 'Debe rechazar path traversal');

  const res2 = await fetch(`${BASE_URL}/api/municipal/piribebuy%20injection/info`);
  assert.equal(res2.status, 400, 'Debe rechazar caracteres fuera de whitelist');
});

test('Portal Ciudadano - Publicación municipal requiere autenticación (POST /api/municipal/:muni/publicar)', async () => {
  const fakeGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { PADRON: 'TEST-01', AREA_M2: 360 },
        geometry: { type: 'Polygon', coordinates: [[[ -57.04, -25.46 ], [ -57.04, -25.47 ], [ -57.03, -25.47 ], [ -57.04, -25.46 ]]] }
      }
    ]
  };

  // Sin token
  const resNoAuth = await fetch(`${BASE_URL}/api/municipal/test_muni/publicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fakeGeoJSON)
  });
  assert.equal(resNoAuth.status, 401, 'Debe exigir autenticación (401)');

  // Con token válido
  const validToken = jwt.sign({ id: 'admin-test', role: 'admin', email: 'admin@snc.gov.py' }, JWT_SECRET, { expiresIn: '1h' });
  const resAuth = await fetch(`${BASE_URL}/api/municipal/test_muni/publicar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validToken}`
    },
    body: JSON.stringify(fakeGeoJSON)
  });
  assert.equal(resAuth.status, 200, 'Debe publicar exitosamente con token');
  const bodyAuth = await resAuth.json();
  assert.equal(bodyAuth.ok, true);
  assert.equal(bodyAuth.featuresCount, 1);
});

test('Portal Ciudadano - Estructura de Enlaces Compartibles (URLSearchParams)', () => {
  const params = new URLSearchParams();
  params.set('muni', 'piribebuy');
  params.set('padron', 'LOTE-14');
  params.set('lat', '-25.467882');
  params.set('lng', '-57.041781');
  params.set('z', '17');

  const query = params.toString();
  assert.ok(query.includes('muni=piribebuy'));
  assert.ok(query.includes('padron=LOTE-14'));
  assert.ok(query.includes('lat=-25.467882'));
  assert.ok(query.includes('lng=-57.041781'));
  assert.ok(query.includes('z=17'));

  // Test parseo
  const parsed = new URLSearchParams(query);
  assert.equal(parsed.get('muni'), 'piribebuy');
  assert.equal(parsed.get('padron'), 'LOTE-14');
  assert.equal(parseFloat(parsed.get('lat')), -25.467882);
  assert.equal(parseFloat(parsed.get('lng')), -57.041781);
  assert.equal(parseInt(parsed.get('z'), 10), 17);
});
