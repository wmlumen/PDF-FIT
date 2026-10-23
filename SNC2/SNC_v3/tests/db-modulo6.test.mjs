import test from 'node:test';
import assert from 'node:assert/strict';
import { BowditchCompensator } from '../js/modulo6.js';

test('Módulo 6 - Bowditch - Compensación de poligonal con error admisible', () => {
  // Cuadrado de 100m x 100m con un pequeño error de cierre de 0.04m en X y 0.03m en Y (error lineal 0.05m)
  const poligonal = [
    [500000.0, 7200000.0],
    [500100.0, 7200000.0],
    [500100.0, 7200100.0],
    [500000.0, 7200100.0],
    [500000.04, 7200000.03] // Vértice final no compensado
  ];

  const resultado = BowditchCompensator.compensate(poligonal, 0.10);

  assert.equal(resultado.withinTolerance, true);
  assert.equal(resultado.linearError, 0.05);
  assert.equal(resultado.dictamen, 'CONFORME_BOWDITCH');
  // El último vértice debe quedar exactamente igual al primero
  const n = resultado.compensatedCoords.length;
  assert.deepEqual(resultado.compensatedCoords[n - 1], resultado.compensatedCoords[0]);
});

test('Módulo 6 - Bowditch - Detección de error que excede la tolerancia', () => {
  // Poligonal con error lineal grosero de 1.50m (supera tolerancia de 0.10m)
  const poligonal = [
    [500000.0, 7200000.0],
    [500100.0, 7200000.0],
    [500100.0, 7200100.0],
    [500000.0, 7200100.0],
    [500001.2, 7200000.9]
  ];

  const resultado = BowditchCompensator.compensate(poligonal, 0.10);

  assert.equal(resultado.withinTolerance, false);
  assert.equal(resultado.dictamen, 'EXCEDE_TOLERANCIA_CIERRE');
  assert.ok(resultado.linearError > 0.10);
});
