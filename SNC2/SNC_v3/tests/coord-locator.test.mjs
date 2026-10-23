import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';
globalThis.proj4 = proj4;

import { parseCoordinateInput, toDMS } from '../js/coordLocator.js';

test('toDMS convierte correctamente decimal a DMS', () => {
  const dmsLat = toDMS(-25.302609, true);
  assert.match(dmsLat, /25°\s*18'\s*09\.\d+"\s*S/);

  const dmsLng = toDMS(-57.513558, false);
  assert.match(dmsLng, /57°\s*30'\s*48\.\d+"\s*[WO]/);
});

test('parseCoordinateInput - Decimal con coma y espacio', async () => {
  const res = await parseCoordinateInput('-25.302609, -57.513558');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'decimal');
  assert.ok(Math.abs(res.lat - (-25.302609)) < 0.00001);
  assert.ok(Math.abs(res.lng - (-57.513558)) < 0.00001);
});

test('parseCoordinateInput - Decimal invertido (Lng, Lat)', async () => {
  const res = await parseCoordinateInput('-57.513558, -25.302609');
  assert.equal(res.ok, true);
  assert.ok(Math.abs(res.lat - (-25.302609)) < 0.00001, 'Debe invertir latitud');
  assert.ok(Math.abs(res.lng - (-57.513558)) < 0.00001, 'Debe invertir longitud');
});

test('parseCoordinateInput - DMS estándar con S y W', async () => {
  const res = await parseCoordinateInput('25°18\'10.2"S 57°30\'48.1"W');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'dms');
  assert.ok(Math.abs(res.lat - (-25.302833)) < 0.0001);
  assert.ok(Math.abs(res.lng - (-57.513361)) < 0.0001);
});

test('parseCoordinateInput - DMS en español con O (Oeste) y coma', async () => {
  const res = await parseCoordinateInput('25°18\'10.2"S, 57°30\'48.1"O');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'dms');
  assert.ok(Math.abs(res.lat - (-25.302833)) < 0.0001);
  assert.ok(Math.abs(res.lng - (-57.513361)) < 0.0001);
});

test('parseCoordinateInput - Google Maps URL completo con @lat,lng', async () => {
  const url = 'https://www.google.com/maps/@-25.302609,-57.513558,17z';
  const res = await parseCoordinateInput(url);
  assert.equal(res.ok, true);
  assert.equal(res.type, 'google_maps');
  assert.ok(Math.abs(res.lat - (-25.302609)) < 0.00001);
  assert.ok(Math.abs(res.lng - (-57.513558)) < 0.00001);
});

test('parseCoordinateInput - Google Maps URL con data=!3d!4d', async () => {
  const url = 'https://www.google.com/maps/place/Asuncion/@-25.28, -57.63,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-25.302609!4d-57.513558';
  const res = await parseCoordinateInput(url);
  assert.equal(res.ok, true);
  assert.ok(Math.abs(res.lat - (-25.302609)) < 0.00001);
  assert.ok(Math.abs(res.lng - (-57.513558)) < 0.00001);
});

test('parseCoordinateInput - UTM 21S', async () => {
  // Coordenadas aproximadas UTM 21S para -25.302609, -57.513558
  const res = await parseCoordinateInput('448332 7200780');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'utm');
  assert.ok(res.lat < -20 && res.lat > -30, 'Latitud debe caer en Paraguay');
  assert.ok(res.lng < -50 && res.lng > -65, 'Longitud debe caer en Paraguay');
});

test('parseCoordinateInput - Google Maps short link via backend resolver', async (t) => {
  try {
    const check = await fetch('http://localhost:5556/api/resolve-maps-url?url=test', { signal: AbortSignal.timeout(1000) });
  } catch {
    t.skip('Backend server not running on port 5556');
    return;
  }
  const shortUrl = 'https://maps.app.goo.gl/bWXxCDQcJ5nvGY3h9';
  const res = await parseCoordinateInput(shortUrl);
  assert.equal(res.ok, true);
  assert.equal(res.type, 'google_maps');
  assert.ok(res.lat < -20 && res.lat > -30, 'Latitud debe caer en Asunción/Paraguay');
  assert.ok(res.lng < -50 && res.lng > -65, 'Longitud debe caer en Asunción/Paraguay');
});
