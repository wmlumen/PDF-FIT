import test from 'node:test';
import assert from 'node:assert/strict';
import { validarBbox, parcelasDeDistrito } from '../parcelarioLocal.js';

test('validarBbox rechaza recuadros inválidos o demasiado grandes', () => {
  assert.throws(() => validarBbox({ minX: 1, minY: 1, maxX: 0, maxY: 2 }), /inválido/);
  assert.throws(() => validarBbox({ minX: -58, minY: -26, maxX: -57, maxY: -25 }), /demasiado grande/);
  assert.deepEqual(validarBbox({ minX: -57.05, minY: -25.47, maxX: -57.04, maxY: -25.46 }), { minX: -57.05, minY: -25.47, maxX: -57.04, maxY: -25.46 });
});

test('parcelasDeDistrito valida el distrito pedido', () => {
  assert.throws(() => parcelasDeDistrito({ dpto: '1', dist: 'x' }), /dpto y dist/);
});
