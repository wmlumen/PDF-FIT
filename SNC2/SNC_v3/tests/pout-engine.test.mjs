// Test de regresion: motor de compatibilidad de uso de suelo POUT (Fase 11, M-2).
// Ver docs/PLAN_FASE11_BACKLOG.md §2 (M-2) y js/poutEngine.js.
import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import { evaluarCompatibilidadUso, encontrarZonasAfectadas, RESULTADOS_POUT } from '../js/poutEngine.js';

const usosSuelo = [
  {
    codigo: 'ZRB1', nombre: 'Zona Residencial Baja 1',
    uso_permitido: JSON.stringify(['Vivienda unifamiliar y vivienda adosada', 'Comercios y servicios de pequeña escala']),
    uso_condicionado: JSON.stringify(['Edificio multifamiliar y conjunto habitacional']),
    usos_no_permitidos: JSON.stringify(['Industrias molestas y riesgosas de pequeña, mediana y gran escala'])
  },
  {
    codigo: 'ZIT', nombre: 'Zona Industrial Tecnológica',
    uso_permitido: JSON.stringify(['Actividades industriales y tecnológicas de bajo impacto ambiental']),
    uso_condicionado: JSON.stringify(['Depósitos inocuos de pequeña y mediana escala']),
    usos_no_permitidos: JSON.stringify(['Viviendas unifamiliares, viviendas adosadas, edificios multifamiliares y conjuntos habitacionales'])
  }
];

const zonaResidencial = {
  municipio: 'test_muni', codigo_zona: 'ZRB1', nombre_zona_fuente: 'Residencial baja 1',
  geojson: JSON.stringify(turf.polygon([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]))
};
const zonaIndustrial = {
  municipio: 'test_muni', codigo_zona: 'ZIT', nombre_zona_fuente: 'Industrial',
  geojson: JSON.stringify(turf.polygon([[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]]))
};
const zonaSinCatalogo = {
  municipio: 'test_muni', codigo_zona: null, nombre_zona_fuente: 'Casco histórico',
  geojson: JSON.stringify(turf.polygon([[[20, 20], [22, 20], [22, 22], [20, 22], [20, 20]]]))
};

const zonasPout = [zonaResidencial, zonaIndustrial, zonaSinCatalogo];

// --- Uso permitido explicitamente en la zona => apto ---
const parcelaResidencial = turf.polygon([[[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5]]]);
const resultadoApto = evaluarCompatibilidadUso(parcelaResidencial, zonasPout, usosSuelo, 'Vivienda unifamiliar', turf);
assert.equal(resultadoApto.resultado, RESULTADOS_POUT.APTO);
assert.equal(resultadoApto.zonas[0].codigo_zona, 'ZRB1');
assert.equal(resultadoApto.zonas[0].clasificacion, 'apto');

// --- Uso condicionado => condicionado ---
const resultadoCondicionado = evaluarCompatibilidadUso(parcelaResidencial, zonasPout, usosSuelo, 'Edificio multifamiliar', turf);
assert.equal(resultadoCondicionado.resultado, RESULTADOS_POUT.CONDICIONADO);
assert.equal(resultadoCondicionado.zonas[0].clasificacion, 'condicionado');

// --- Uso explicitamente no permitido => no_apto ---
const resultadoNoApto = evaluarCompatibilidadUso(parcelaResidencial, zonasPout, usosSuelo, 'Industrias molestas y riesgosas', turf);
assert.equal(resultadoNoApto.resultado, RESULTADOS_POUT.NO_APTO);

// --- Uso que no figura en ninguna lista de la zona => no_especificado (conservador: cuenta como "condicionado" a nivel global) ---
const resultadoNoEspecificado = evaluarCompatibilidadUso(parcelaResidencial, zonasPout, usosSuelo, 'Actividad totalmente ajena al catálogo', turf);
assert.equal(resultadoNoEspecificado.zonas[0].clasificacion, 'no_especificado');
assert.equal(resultadoNoEspecificado.resultado, RESULTADOS_POUT.CONDICIONADO);

// --- Zona del shapefile sin codigo_zona mapeado => sin_catalogo, nunca "apto" por defecto ---
const parcelaCasco = turf.polygon([[[20.5, 20.5], [21, 20.5], [21, 21], [20.5, 21], [20.5, 20.5]]]);
const resultadoSinCatalogo = evaluarCompatibilidadUso(parcelaCasco, zonasPout, usosSuelo, 'Vivienda unifamiliar', turf);
assert.equal(resultadoSinCatalogo.zonas[0].clasificacion, 'sin_catalogo');
assert.equal(resultadoSinCatalogo.resultado, RESULTADOS_POUT.CONDICIONADO);

// --- Fuera de toda zona cargada => sin_zonificacion (nunca "apto" por ausencia de datos) ---
const parcelaLibre = turf.polygon([[[50, 50], [51, 50], [51, 51], [50, 51], [50, 50]]]);
const resultadoLibre = evaluarCompatibilidadUso(parcelaLibre, zonasPout, usosSuelo, 'Vivienda unifamiliar', turf);
assert.equal(resultadoLibre.resultado, RESULTADOS_POUT.SIN_ZONIFICACION);
assert.equal(resultadoLibre.zonas.length, 0);

// --- Industrial permite actividad industrial, no vivienda ---
const parcelaIndustrial = turf.polygon([[[10.5, 10.5], [11, 10.5], [11, 11], [10.5, 11], [10.5, 10.5]]]);
const resultadoIndustrialApto = evaluarCompatibilidadUso(parcelaIndustrial, zonasPout, usosSuelo, 'Actividades industriales y tecnológicas de bajo impacto ambiental', turf);
assert.equal(resultadoIndustrialApto.resultado, RESULTADOS_POUT.APTO);
const resultadoIndustrialNoApto = evaluarCompatibilidadUso(parcelaIndustrial, zonasPout, usosSuelo, 'Viviendas unifamiliares', turf);
assert.equal(resultadoIndustrialNoApto.resultado, RESULTADOS_POUT.NO_APTO);

// --- un Point (la consulta mas tipica: "en que zona cae este predio") tambien funciona ---
const puntoDentroZonaResidencial = turf.point([1, 1]);
const resultadoPorPunto = evaluarCompatibilidadUso(puntoDentroZonaResidencial, zonasPout, usosSuelo, 'Vivienda unifamiliar', turf);
assert.equal(resultadoPorPunto.resultado, RESULTADOS_POUT.APTO);
const puntoFuera = turf.point([50, 50]);
const resultadoPuntoFuera = evaluarCompatibilidadUso(puntoFuera, zonasPout, usosSuelo, 'Vivienda unifamiliar', turf);
assert.equal(resultadoPuntoFuera.resultado, RESULTADOS_POUT.SIN_ZONIFICACION);

// --- encontrarZonasAfectadas por separado (sin evaluar uso) ---
const zonas = encontrarZonasAfectadas(parcelaResidencial, zonasPout, turf);
assert.equal(zonas.length, 1);
assert.equal(zonas[0].codigo_zona, 'ZRB1');

console.log('✅ POUT ENGINE TESTS: todas las aserciones pasaron');
