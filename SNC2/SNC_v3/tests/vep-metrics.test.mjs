// Test de regresion: motor de indicadores municipales VEP (Fase 11, paso 5).
// Ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md y
// docs/INDICADORES_MUNICIPALES_VEP.md.
import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import {
  INDICADORES_NO_DISPONIBLES, calcularReportingBasico, calcularIndCat01TasaTitularidad,
  calcularInterseccionEspacial, calcularAfectacionPorBuffer, calcularCatalogoCompleto
} from '../js/vepMetrics.js';

const parcelasDetalle = [
  { id: 'p1', distrito: '5', sup_sig_m: 600, matricula: { estado: 'VERIFICADA' }, propietarios: [{ cedula: '111' }] },
  { id: 'p2', distrito: '5', sup_sig_m: 400, matricula: { estado: 'SIN_VERIFICAR' }, propietarios: [] },
  { id: 'p3', distrito: '7', sup_sig_m: null, sup_legal: 1000, matricula: null, propietarios: [{ cedula: '222' }, { cedula: '111' }] }
];

// --- Reporting básico (Nivel 1): no depende de ninguna fuente externa ---
const reporting = calcularReportingBasico(parcelasDetalle);
assert.equal(reporting.totalParcelas, 3);
assert.equal(reporting.superficieTotalM2, 2000); // 600 + 400 + 1000 (sup_legal cuando falta sup_sig_m)
assert.equal(reporting.distritosRepresentados, 2);
assert.equal(reporting.matriculas.verificadas, 1);
assert.equal(reporting.matriculas.sinVerificar, 1);
assert.equal(reporting.matriculas.sinRegistrar, 1);
assert.equal(reporting.propietarios.parcelasConPropietario, 2);
assert.equal(reporting.propietarios.parcelasSinPropietario, 1);
assert.equal(reporting.propietarios.personasUnicas, 2); // cedula 111 se repite en p1 y p3

// --- IND-CAT-01: aproximacion via matricula.estado = VERIFICADA ---
const cat01 = calcularIndCat01TasaTitularidad(parcelasDetalle);
assert.equal(cat01.codigo, 'IND-CAT-01');
assert.equal(cat01.valor, 30); // 600 de 2000 m2 con matricula verificada = 30%
assert.ok(cat01.aproximacion.includes('matricula.estado'));

const sinSuperficie = calcularIndCat01TasaTitularidad([{ sup_sig_m: 0, matricula: null, propietarios: [] }]);
assert.equal(sinSuperficie.disponible, false);

// --- Interseccion espacial generica (IND-AMB-02 / IND-RSG-01 en potencia) ---
const parcelasFC = turf.featureCollection([
  turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], { CODIGO: 'DENTRO' }),
  turf.polygon([[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]], { CODIGO: 'FUERA' })
]);
const capaRiesgo = turf.featureCollection([turf.polygon([[[0.5, 0.5], [2, 0.5], [2, 2], [0.5, 2], [0.5, 0.5]]])]);
const interseccion = calcularInterseccionEspacial(parcelasFC, capaRiesgo, turf);
assert.deepEqual(interseccion.afectadas, ['DENTRO']);
assert.equal(interseccion.totalEvaluadas, 2);

const sinCapa = calcularInterseccionEspacial(parcelasFC, turf.featureCollection([]), turf);
assert.equal(sinCapa.afectadas.length, 0);

// --- IND-AMB-04: buffer de radio fijo alrededor de un punto (vertedero) ---
const puntoCerca = turf.point([0, 0]);
const puntoLejos = turf.point([10, 10]);
const parcelasBuffer = turf.featureCollection([
  turf.polygon([[[0.001, 0.001], [0.003, 0.001], [0.003, 0.003], [0.001, 0.003], [0.001, 0.001]]], { CODIGO: 'CERCA-VERTEDERO' }),
  turf.polygon([[[10.001, 10.001], [10.003, 10.001], [10.003, 10.003], [10.001, 10.003], [10.001, 10.001]]], { CODIGO: 'LEJOS-VERTEDERO' })
]);
const afectacion = calcularAfectacionPorBuffer(parcelasBuffer, puntoCerca, turf, 1000);
assert.equal(afectacion.codigo, 'IND-AMB-04');
assert.deepEqual(afectacion.parcelasAfectadas, ['CERCA-VERTEDERO']);
assert.equal(afectacion.valor, 1);

const sinFuente = calcularAfectacionPorBuffer(parcelasBuffer, null, turf);
assert.equal(sinFuente.valor, 0);

// --- Catalogo completo: honestidad sobre lo que SI y NO se calcula ---
const catalogo = calcularCatalogoCompleto({ parcelasDetalle });
assert.equal(catalogo.indicadores['IND-CAT-01'].valor, 30); // se calcula de verdad, no es un "no disponible"
assert.equal(catalogo.indicadores['IND-REC-01'].disponible, false);
assert.ok(catalogo.indicadores['IND-REC-01'].motivo.length > 10);
// 19 indicadores en docs/INDICADORES_MUNICIPALES_VEP.md (CAT:5 AMB:4 RSG:3 VIA:4 REC:3);
// IND-CAT-01 se calcula aparte (de verdad), los otros 18 quedan en este catalogo.
assert.equal(Object.keys(INDICADORES_NO_DISPONIBLES).length, 18);

const catalogoConVertedero = calcularCatalogoCompleto({
  parcelasDetalle, parcelasFC: parcelasBuffer, capasReferencia: { vertedero: puntoCerca }, turfApi: turf
});
assert.equal(catalogoConVertedero.indicadores['IND-AMB-04'].valor, 1);
assert.notEqual(catalogoConVertedero.indicadores['IND-AMB-04'].disponible, false);

console.log('✅ VEP METRICS TESTS: todas las aserciones pasaron');
