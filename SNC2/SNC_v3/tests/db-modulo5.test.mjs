import test from 'node:test';
import assert from 'node:assert/strict';
import { LoteamientosModule, LOTEAMIENTOS_CONFIG } from '../js/modulo5.js';

test('Módulo 5 - Loteamientos y Expansión Urbana - Configuración oficial', () => {
  assert.equal(LOTEAMIENTOS_CONFIG.PORCENTAJE_PLAZAS_MIN, 7.0);
  assert.equal(LOTEAMIENTOS_CONFIG.GEOPORTAL_URL, 'https://loteamientos.com/mapa-catastral');
});

test('Módulo 5 - Loteamientos - Balance de cesión conforme (7% alcanzado)', () => {
  // Parcela total: 10.000 m2
  // Lotes: 7.000 m2 (70%)
  // Calles: 2.200 m2 (22%)
  // Plazas: 800 m2 (8% > 7%)
  const resultado = LoteamientosModule.calcularCesionPublica({
    superficieTotalM2: 10000,
    superficieLotesM2: 7000,
    superficieCallesM2: 2200,
    superficiePlazasM2: 800
  });

  assert.equal(resultado.cumpleCesionPlazas, true);
  assert.equal(resultado.porcentajePlazas, 8.0);
  assert.equal(resultado.deficitPlazasM2, 0);
  assert.equal(resultado.balanceCerrado, true);
  assert.equal(resultado.dictamen, 'CONFORME_MUNICIPAL');
});

test('Módulo 5 - Loteamientos - Balance observado por déficit de cesión (< 7%)', () => {
  // Parcela total: 10.000 m2
  // Plazas: 500 m2 (5% < 7% -> requiere 700 m2, déficit 200 m2)
  const resultado = LoteamientosModule.calcularCesionPublica({
    superficieTotalM2: 10000,
    superficieLotesM2: 7300,
    superficieCallesM2: 2200,
    superficiePlazasM2: 500
  });

  assert.equal(resultado.cumpleCesionPlazas, false);
  assert.equal(resultado.porcentajePlazas, 5.0);
  assert.equal(resultado.plazasRequeridasM2, 700.0);
  assert.equal(resultado.deficitPlazasM2, 200.0);
  assert.equal(resultado.dictamen, 'OBSERVADO_DEFICIT_CESION');
});
