import test from 'node:test';
import assert from 'node:assert/strict';

const area = q => { let A = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) A += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]); return Math.abs(A / 2); };
const lado = (q, k) => Math.hypot(q[(k + 1) % q.length][0] - q[k][0], q[(k + 1) % q.length][1] - q[k][1]);

test('ajustarPoligono: se carga el área y un lado, el resto se acomoda para cuadrar', async () => {
  globalThis.window ??= undefined;
  const { ajustarPoligono } = await import('../js/visorPremium.js');
  const rect = [[0, 0], [8, 0], [8, 10], [0, 10]];                       // 80 m²
  const r = ajustarPoligono(rect, 0, { largo: 10, area: 120 });           // frente 10 m, 120 m² → fondo 12 m
  assert.ok(Math.abs(lado(r, 0) - 10) < 1e-9);
  assert.ok(Math.abs(area(r) - 120) < 1e-9);
  assert.ok(Math.abs(lado(r, 1) - 12) < 1e-9);
  const irregular = [[0, 0], [10, 2], [9, 9], [1, 7]];
  const s = ajustarPoligono(irregular, 1, { area: 50 });                   // solo el área: el lado 2 no cambia
  assert.ok(Math.abs(area(s) - 50) < 1e-9);
  assert.ok(Math.abs(lado(s, 1) - lado(irregular, 1)) < 1e-9);
});
