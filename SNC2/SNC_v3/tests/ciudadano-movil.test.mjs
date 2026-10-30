import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';

import { aUtm21s, formatearUbicacion, mensajeErrorGeo, resumenIdentificacion } from '../js/ciudadanoMovil.js';

test('aUtm21s convierte un punto de Piribebuy a UTM 21S', () => {
  const utm = aUtm21s(-25.4643, -57.0446, proj4);
  assert.ok(utm.este > 490000 && utm.este < 500000, `este fuera de rango: ${utm.este}`);
  assert.ok(utm.norte > 7180000 && utm.norte < 7190000, `norte fuera de rango: ${utm.norte}`);
});

test('aUtm21s devuelve null sin proj4 o con coordenadas invalidas', () => {
  assert.equal(aUtm21s(-25.4, -57.0, null), null);
  assert.equal(aUtm21s(NaN, -57.0, proj4), null);
});

test('formatearUbicacion arma textos y califica la precisión', () => {
  const t = formatearUbicacion(-25.4643, -57.0446, 6.4, proj4);
  assert.equal(t.wgs84, '-25.464300, -57.044600');
  assert.match(t.utm, /^E \d+\.\d · N \d+\.\d$/);
  assert.equal(t.precision, '±6 m');
  assert.equal(t.calidad, 'buena');
  assert.equal(formatearUbicacion(-25.4, -57.0, 35, proj4).calidad, 'aceptable');
  assert.equal(formatearUbicacion(-25.4, -57.0, 120, proj4).calidad, 'baja');
  assert.equal(formatearUbicacion(-25.4, -57.0, undefined, proj4).precision, 'precisión desconocida');
});

test('mensajeErrorGeo explica cada caso', () => {
  assert.match(mensajeErrorGeo(null, false), /https:\/\//);
  assert.match(mensajeErrorGeo({ code: 1 }, true), /permiso/);
  assert.match(mensajeErrorGeo({ code: 2 }, true), /Active el GPS/);
  assert.match(mensajeErrorGeo({ code: 3 }, true), /tardó/);
  assert.match(mensajeErrorGeo({}, true), /no permite/);
});

test('resumenIdentificacion usa departamento, distrito y barrio', () => {
  assert.equal(resumenIdentificacion({ ok: true, departamento: 'CORDILLERA', distrito: 'PIRIBEBUY', barrio: 'SAN BLAS' }),
    'CORDILLERA · PIRIBEBUY · SAN BLAS');
  assert.match(resumenIdentificacion({ ok: false }), /fuera de la cobertura/);
  assert.match(resumenIdentificacion({ ok: true }), /Sin datos/);
});

test('estiloEdificacion distingue parcelas con y sin edificación', async () => {
  const { estiloEdificacion } = await import('../js/ciudadanoMovil.js');
  const si = estiloEdificacion({ edificada: true }), no = estiloEdificacion({ edificada: false }), nd = estiloEdificacion({});
  assert.notEqual(si.fillColor, no.fillColor);
  assert.ok(si.fillOpacity > no.fillOpacity);
  assert.equal(nd.dashArray, '4 3');
});
