// Test de regresion: motor de evaluacion ambiental (Fase 11, M-1).
// Ver docs/PLAN_FASE11_BACKLOG.md §2 (M-1) y js/ambientalEngine.js.
import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import { evaluarRestriccionesAmbientales, RESULTADOS, NIVELES_RESTRICCION } from '../js/ambientalEngine.js';

const humedal = {
  id: 'r1', tipo: 'HUMEDAL', nombre: 'Humedal Test', fuente: 'MADES SINASIP',
  nivel_restriccion: NIVELES_RESTRICCION.BLOQUEA,
  geojson: JSON.stringify(turf.polygon([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]))
};

const fajaRiberenia = {
  id: 'r2', tipo: 'FAJA_RIBERENIA', nombre: 'Faja Test', fuente: 'VEP-MEF',
  nivel_restriccion: NIVELES_RESTRICCION.CONDICIONA,
  geojson: JSON.stringify(turf.polygon([[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]]))
};

const vertedero = {
  id: 'r3', tipo: 'VERTEDERO', nombre: 'Vertedero municipal', fuente: 'Carga manual',
  nivel_restriccion: NIVELES_RESTRICCION.BLOQUEA,
  buffer_metros: 1000,
  geojson: JSON.stringify(turf.point([20, 20]))
};

// --- Sin restricciones activas: todo apto (ausencia real de datos, no error) ---
const parcelaCualquiera = turf.polygon([[[50, 50], [51, 50], [51, 51], [50, 51], [50, 50]]]);
const sinRestricciones = evaluarRestriccionesAmbientales(parcelaCualquiera, [], turf);
assert.equal(sinRestricciones.resultado, RESULTADOS.APTO);
assert.equal(sinRestricciones.afectaciones.length, 0);

// --- Parcela dentro de un humedal (BLOQUEA) => no_apto ---
const parcelaEnHumedal = turf.polygon([[[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5]]]);
const resultadoHumedal = evaluarRestriccionesAmbientales(parcelaEnHumedal, [humedal, fajaRiberenia], turf);
assert.equal(resultadoHumedal.resultado, RESULTADOS.NO_APTO);
assert.equal(resultadoHumedal.afectaciones.length, 1);
assert.equal(resultadoHumedal.afectaciones[0].tipo, 'HUMEDAL');

// --- Parcela dentro de la faja ribereña (CONDICIONA, sin nada que bloquee) => condicionado ---
const parcelaEnFaja = turf.polygon([[[10.5, 10.5], [11, 10.5], [11, 11], [10.5, 11], [10.5, 10.5]]]);
const resultadoFaja = evaluarRestriccionesAmbientales(parcelaEnFaja, [humedal, fajaRiberenia], turf);
assert.equal(resultadoFaja.resultado, RESULTADOS.CONDICIONADO);
assert.equal(resultadoFaja.afectaciones[0].tipo, 'FAJA_RIBERENIA');

// --- Parcela fuera de toda restriccion => apto ---
const parcelaLibre = turf.polygon([[[50, 50], [51, 50], [51, 51], [50, 51], [50, 50]]]);
const resultadoLibre = evaluarRestriccionesAmbientales(parcelaLibre, [humedal, fajaRiberenia], turf);
assert.equal(resultadoLibre.resultado, RESULTADOS.APTO);
assert.equal(resultadoLibre.afectaciones.length, 0);

// --- Buffer de un punto (vertedero + 1000m): parcela cercana => no_apto; lejana => apto ---
const parcelaCercaVertedero = turf.polygon([[[20.001, 20.001], [20.003, 20.001], [20.003, 20.003], [20.001, 20.003], [20.001, 20.001]]]);
const resultadoVertedero = evaluarRestriccionesAmbientales(parcelaCercaVertedero, [vertedero], turf);
assert.equal(resultadoVertedero.resultado, RESULTADOS.NO_APTO);
assert.equal(resultadoVertedero.afectaciones[0].buffer_metros, 1000);

const parcelaLejosVertedero = turf.polygon([[[25, 25], [25.1, 25], [25.1, 25.1], [25, 25.1], [25, 25]]]);
const resultadoLejos = evaluarRestriccionesAmbientales(parcelaLejosVertedero, [vertedero], turf);
assert.equal(resultadoLejos.resultado, RESULTADOS.APTO);

// --- Varias restricciones a la vez: una CONDICIONA y otra BLOQUEA => gana no_apto (el nivel mas severo) ---
const parcelaCombinada = turf.polygon([[[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5]]]);
const resultadoCombinado = evaluarRestriccionesAmbientales(parcelaCombinada, [humedal, { ...fajaRiberenia, id: 'r2b', geojson: humedal.geojson }], turf);
assert.equal(resultadoCombinado.resultado, RESULTADOS.NO_APTO);
assert.equal(resultadoCombinado.afectaciones.length, 2);

// --- Geometría invalida en una restriccion no rompe la evaluacion de las demas ---
const restriccionRota = { id: 'r4', tipo: 'OTRO', nivel_restriccion: NIVELES_RESTRICCION.BLOQUEA, geojson: '{esto no es json' };
const resultadoConRota = evaluarRestriccionesAmbientales(parcelaEnHumedal, [restriccionRota, humedal], turf);
assert.equal(resultadoConRota.resultado, RESULTADOS.NO_APTO);
assert.equal(resultadoConRota.afectaciones.length, 1);
assert.equal(resultadoConRota.afectaciones[0].id, 'r1');

console.log('✅ AMBIENTAL ENGINE TESTS: todas las aserciones pasaron');
