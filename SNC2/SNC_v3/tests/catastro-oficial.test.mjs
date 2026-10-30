import test from 'node:test';
import assert from 'node:assert/strict';

import * as o from '../oficialCatastro.js';
import { esConsultaCatastral, resumenParcela, filasFicha } from '../js/catastroOficialUI.js';

// Muestra real del WFS de catastro.gov.py (objectid 1109243, Asuncion), en UTM 21S y recortada.
const MUESTRA = {
  type: 'FeatureCollection', numberMatched: 1,
  features: [{
    type: 'Feature', id: 'parcelas_activas.1',
    geometry: { type: 'MultiPolygon', coordinates: [[[[437000, 7194000], [437020, 7194000], [437020, 7194018.3], [437000, 7194018.3], [437000, 7194000]]]] },
    properties: { id: 2328262, objectid: 1109243, dpto: 'A', dist: 5, zona: 14, mz: 885, lote: 20, finca: 15783,
      ccatastral: null, padron: null, mz_agr: '0000', lote_agr: '  0', tipo_cuenta: 1, referencia: 1,
      clave_comparacion: 'A|5|#|14|885|20|#|#', valor_tierra: 0, shape: { type: 'MultiPolygon', coordinates: [] } }
  }]
};

test('interpretarConsultaCatastral reconoce finca, clave, dpto-dist-zona-mz-lote y Cta. Cte.', () => {
  assert.deepEqual(o.interpretarConsultaCatastral('finca 15783'), { finca: '15783' });
  assert.deepEqual(o.interpretarConsultaCatastral('Finca N° 1334 dist 12'), { finca: '1334', dist: '12' });
  assert.deepEqual(o.interpretarConsultaCatastral('A|5|#|14|885|20|#|#'), { clave: 'A|5|#|14|885|20|#|#' });
  assert.deepEqual(o.interpretarConsultaCatastral('D-12-19-58-5'), { dpto: 'D', dist: '12', zona: '19', mz: '58', lote: '5' });
  assert.deepEqual(o.interpretarConsultaCatastral('Cta. Cte. 12-345-67'), { ccatastral: '12-345-67' });
  assert.equal(o.interpretarConsultaCatastral('Yegros Piribebuy'), null);
  for (const t of ['27-2815-18', '27/2815/18', '27 2815 18', '27.2815.18', '272815-18', '272815-18/00-000']) {
    assert.deepEqual(o.interpretarConsultaCatastral(t), { zona: '27', mz: '2815', lote: '18' }, t);
  }
  assert.equal(o.filtroBusqueda(o.interpretarConsultaCatastral('27-2815-18')), 'zona=27 AND mz=2815 AND lote=18');
});

test('filtroBusqueda arma CQL seguro y rechaza inyecciones', () => {
  assert.equal(o.filtroBusqueda({ finca: '15783', dpto: 'a' }), "dpto='A' AND finca=15783");
  assert.equal(o.filtroBusqueda({ clave: 'a|5|#|14|885|20|#|#' }), "clave_comparacion='A|5|#|14|885|20|#|#'");
  assert.throws(() => o.filtroBusqueda({ ccatastral: "x' OR 1=1" }), /no permitidos/);
  assert.throws(() => o.filtroBusqueda({ finca: '1 OR 1=1' }), /entero/);
  assert.throws(() => o.filtroBusqueda({ dpto: '1', dist: 1, zona: 1 }), /letra/);
  assert.throws(() => o.filtroBusqueda({ zona: 1 }), /al menos/);
  assert.throws(() => o.filtroBusqueda({}), /Indique/);
});

test('validarBbox exige Paraguay y un recuadro chico', () => {
  assert.deepEqual(o.validarBbox({ minX: -57.046, minY: -25.466, maxX: -57.043, maxY: -25.463 }), [-57.046, -25.466, -57.043, -25.463]);
  assert.throws(() => o.validarBbox({ minX: -58, minY: -26, maxX: -57, maxY: -25 }), /demasiado grande/);
  assert.throws(() => o.validarBbox({ minX: 10, minY: 10, maxX: 10.001, maxY: 10.001 }), /Paraguay/);
  assert.throws(() => o.validarBbox({ minX: 'a' }), /inválidos/);
});

test('urlWfs usa solo capas de la lista cerrada y el sistema nativo UTM 21S', () => {
  const u = new URL(o.urlWfs({ capa: 'parcelas', bboxUtm: [494900, 7183500, 495100, 7183700] }));
  assert.equal(u.searchParams.get('typeNames'), 'snc:parcelas_activas');
  assert.match(u.searchParams.get('bbox'), /EPSG:32721$/);
  assert.equal(u.searchParams.get('srsName'), null);
  assert.throws(() => o.urlWfs({ capa: 'snc:usuarios' }), /desconocida/);
});

test('normalizar reproyecta a WGS84 con 8 decimales, calcula superficie y descarta campos internos', () => {
  const fc = o.normalizar(MUESTRA);
  const p = fc.features[0].properties;
  assert.equal(p.superficie_m2, 366);
  assert.equal(p.finca, 15783);
  assert.equal(p.lote_agr, '0');
  assert.ok(!('shape' in p) && !('valor_tierra' in p));
  const [lng, lat] = fc.features[0].geometry.coordinates[0][0][0];
  assert.ok(lng < -57.5 && lng > -57.8 && lat < -25.2 && lat > -25.4, `${lng},${lat}`);
  assert.ok(String(lng).split('.')[1].length >= 7, 'debe conservar precisión (no 4 decimales)');
  assert.match(fc.fuente, /catastro\.gov\.py/);
});

test('parcelaEnPunto consulta con INTERSECTS en UTM y usa la cache', async () => {
  let llamadas = 0, url = '';
  const falso = async (u) => { llamadas++; url = u; return { ok: true, text: async () => JSON.stringify(MUESTRA) }; };
  const r = await o.parcelaEnPunto({ lat: -25.4643, lng: -57.0446 }, falso);
  assert.equal(r.count, 1);
  assert.match(new URL(url).searchParams.get('cql_filter'), /^INTERSECTS\(shape,POINT\(495516\.\d+ 7183638\.\d+\)\)$/);
  await o.parcelaEnPunto({ lat: -25.4643, lng: -57.0446 }, falso);
  assert.equal(llamadas, 1, 'la segunda consulta igual debe salir de la cache');
  await assert.rejects(() => o.parcelaEnPunto({ lat: 40, lng: -3 }, falso), /fuera de Paraguay/);
});

test('geocodificador: valida texto y respeta 1 consulta por segundo', async () => {
  assert.throws(() => o.textoDireccion('ab'), /3 caracteres/);
  const tiempos = [];
  let reloj = 0;
  const ahora = () => reloj;
  const dormir = async (ms) => { reloj += ms; };
  await Promise.all([1, 2, 3].map(() => o.conIntervalo(async () => tiempos.push(reloj), 1100, ahora, dormir)));
  assert.equal(tiempos.length, 3);
  assert.ok(tiempos[1] - tiempos[0] >= 1100 && tiempos[2] - tiempos[1] >= 1100, JSON.stringify(tiempos));
  const r = o.parseNominatim([{ display_name: 'Yegros, Piribebuy', lat: '-25.4615', lon: '-57.0449', type: 'residential', boundingbox: ['-25.47', '-25.45', '-57.05', '-57.04'] }]);
  assert.deepEqual(r[0], { nombre: 'Yegros, Piribebuy', lat: -25.4615, lng: -57.0449, tipo: 'residential', bbox: [-57.05, -25.47, -57.04, -25.45] });
});

test('UI: detecta consultas catastrales y resume la parcela', () => {
  assert.ok(esConsultaCatastral('finca 15783'));
  assert.ok(esConsultaCatastral('D-12-19-58-5'));
  for (const t of ['27-2815-18', '27/2815/18', '27 2815 18', '27.2815.18', '272815-18']) assert.ok(esConsultaCatastral(t), t);
  assert.ok(!esConsultaCatastral('Yegros Piribebuy'));
  assert.equal(resumenParcela({ finca: 1334, zona: 19, mz: 58, lote: 5, superficie_m2: 687.5 }), 'Finca 1334 · Zona 19 · Mz 58 · Lote 5 (687,5 m²)');
  assert.equal(filasFicha({ ccatastral: null })[0][1], 'no informada');
});

test('consultaDnit arma la consulta de la liquidación: urbana por zona/manzana/lote, rural por padrón', async () => {
  const { consultaDnit, filasDnit } = await import('../js/catastroOficialUI.js');
  assert.equal(consultaDnit({ dpto: 'd', dist: 12, zona: 19, mz: 58, lote: 5 }), 'dpto=D&cod_distrito=12&zona=19&manzana=58&lote=5');
  assert.equal(consultaDnit({ dpto: 'D', dist: 12, padron: 25 }), 'dpto=D&cod_distrito=12&padron=25');
  assert.equal(consultaDnit({ dpto: 'D', dist: 12 }), null);
  assert.equal(consultaDnit({ dpto: '1', dist: 12, padron: 25 }), null);
  assert.equal(filasDnit({ cuentas: [] }), null);
  const f = filasDnit({ cuentas: [{ tipo: 'urbano', ctacte: '190001-01/00-000', superf_tierra_total: 450, superf_edif_total: 90, valor_oficial: 1000, impuesto_total: 15 }] });
  assert.equal(f[0][1], '190001-01/00-000');
});

test('radioGps limita el radio entre 15 y 300 m', () => {
  assert.equal(o.radioGps(5), 15);
  assert.equal(o.radioGps(42.4), 42);
  assert.equal(o.radioGps(2500), 300);
  assert.throws(() => o.radioGps('x'), /radio/);
});

test('parcelasEnRadio pide al WFS las parcelas a menos de r metros del punto', async () => {
  let url = '';
  const fc = await o.parcelasEnRadio({ lat: -25.4636, lng: -57.0428, radio: 50 }, async u => { url = String(u); return { ok: true, text: async () => '{"features":[]}' }; });
  assert.match(decodeURIComponent(url.replace(/\+/g, " ")), /DWITHIN\(shape,POINT\([\d.]+ [\d.]+\),50,meters\)/);
  assert.equal(fc.radio, 50);
});

test('etiquetaCtaCte arma la Cta. Cte. urbana ZZMMMM-LL o el padrón rural', async () => {
  const { etiquetaCtaCte } = await import('../js/catastroOficialUI.js');
  assert.equal(etiquetaCtaCte({ zona: 27, mz: 2815, lote: 18 }), '272815-18');
  assert.equal(etiquetaCtaCte({ zona: 19, mz: 73, lote: 8 }), '190073-08');
  assert.equal(etiquetaCtaCte({ padron: 3479 }), 'Padrón 3479');
  assert.equal(etiquetaCtaCte({}), '');
});

test('ubicacionRotulo: centro del terreno y giro según su lado largo; dentro aunque la parcela sea en L', async () => {
  const { ubicacionRotulo, dentroDe } = await import('../js/catastroOficialUI.js');
  const rect = [[0, 0], [100, 0], [100, 20], [0, 20], [0, 0]];        // terreno alargado horizontal
  const r = ubicacionRotulo(rect);
  assert.deepEqual(r.centro.map(Math.round), [50, 10]);
  assert.ok(Math.abs(r.grados) < 1);
  assert.ok(r.largo > r.ancho);
  const vertical = ubicacionRotulo([[0, 0], [20, 0], [20, 100], [0, 100]]);
  assert.ok(Math.abs(Math.abs(vertical.grados) - 90) < 1);
  const enL = [[0, 0], [100, 0], [100, 15], [15, 15], [15, 100], [0, 100]];
  const l = ubicacionRotulo(enL);
  assert.ok(dentroDe(l.centro, enL), `centro ${l.centro} fuera de la parcela en L`);
});
