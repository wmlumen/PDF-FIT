import test from 'node:test';
import assert from 'node:assert/strict';
import { medidasLote, puntoEnGeom, verificaciones } from '../js/informeLote.js';

test('medidasLote: área, perímetro y lados de un lote de 12 × 30 m', () => {
  const m = medidasLote([[0, 0], [12, 0], [12, 30], [0, 30], [0, 0]]);
  assert.equal(m.area, 360); assert.equal(m.perimetro, 84);
  assert.deepEqual(m.lados.map(l => l.largo), [12, 30, 12, 30]);
});

test('puntoEnGeom ubica el lote dentro o fuera del área urbana', () => {
  const g = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
  assert.ok(puntoEnGeom([5, 5], g)); assert.ok(!puntoEnGeom([15, 5], g));
});

test('verificaciones según la actividad: observa lo que los datos contradicen y deja lo demás para verificar', () => {
  const base = { urbano: true, area: 300, ladoMax: 10, edifDnit: 80, construido: 120, faltante: 40, tieneCuenta: true, esRural: false };
  const frac = verificaciones('fraccionamiento', base);
  assert.equal(frac.find(c => /Superficie mínima/.test(c.item)).resultado, 'Observado');
  assert.equal(frac.find(c => /Frente mínimo/.test(c.item)).resultado, 'Observado');
  const res = verificaciones('residencial', base);
  assert.equal(res.find(c => /Edificación declarada/.test(c.item)).resultado, 'Observado');
  const agro = verificaciones('agropecuaria', { ...base, urbano: false, esRural: true });
  assert.equal(agro.find(c => /fuera del área urbana/i.test(c.item)).resultado, 'Conforme');
  assert.ok(verificaciones('industrial', base).some(c => /Licencia ambiental/.test(c.item) && c.resultado === 'Verificar'));
});
