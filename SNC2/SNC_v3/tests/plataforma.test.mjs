import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
process.env.PLATAFORMA_DB = join(mkdtempSync(join(tmpdir(), 'plat-')), 'p.sqlite');
const P = await import('../plataformaServicio.js');

test('estadoPago: al día, gracia, prueba, vencido y suspendido', () => {
  const hoy = new Date('2026-11-05T12:00:00Z');
  assert.equal(P.estadoPago({ estado: 'activo' }, [{ periodo: '2026-11', estado: 'verificado' }], hoy).estado, 'al_dia');
  assert.equal(P.estadoPago({ estado: 'activo' }, [{ periodo: '2026-10', estado: 'verificado' }], hoy).estado, 'gracia');
  assert.equal(P.estadoPago({ estado: 'activo' }, [{ periodo: '2026-10', estado: 'verificado' }], new Date('2026-11-20T12:00:00Z')).estado, 'vencido');
  assert.equal(P.estadoPago({ estado: 'prueba', prueba_hasta: '2026-11-30' }, [], hoy).estado, 'prueba');
  assert.equal(P.estadoPago({ estado: 'suspendido' }, [{ periodo: '2026-11', estado: 'verificado' }], hoy).estado, 'suspendido');
  assert.equal(P.estadoPago({ estado: 'activo' }, [{ periodo: '2026-11', estado: 'pendiente' }], hoy).estado, 'vencido');
});

test('alta de cliente, módulos del plan con ajustes, usuarios y pago verificado', async () => {
  const c = await P.guardarCliente({ id: 'villa_hayes', tipo: 'municipalidad', nombre: 'Municipalidad de Villa Hayes', muni_id: 'villa_hayes', cod_dpto: 'p', cod_distrito: 1, plan_id: 'municipal', estado: 'activo' });
  assert.equal(c.cod_dpto, 'P');
  assert.equal(c.pago.estado, 'vencido');
  assert.deepEqual(c.modulos.sort(), ['gps_campo', 'visor_premium']);              // sin pago: solo lo básico
  await P.informarPago('villa_hayes', { periodo: new Date().toISOString().slice(0, 7), monto: 1500000, medio: 'transferencia', comprobante: 'TRX-1' }, 'tesoreria@vh.gov.py');
  const [pend] = await P.pagosPendientes();
  const v = await P.verificarPago(pend.id, 'verificado', 'admin@snc', 'ok');
  assert.equal(v.pago.estado, 'al_dia');
  assert.ok(v.modulos.includes('tablero_municipal'));
  const aj = await P.ajustarModulo('villa_hayes', 'edificios', true);
  assert.ok(aj.modulos.includes('edificios'));
  await P.guardarUsuario('villa_hayes', { email: 'jefe@vh.gov.py', rol: 'admin_cliente' }, 'admin@snc', true);
  await assert.rejects(P.guardarUsuario('villa_hayes', { email: 'otro@vh.gov.py', rol: 'admin_cliente' }, 'jefe@vh.gov.py', false), /administración general/);
  await P.guardarUsuario('villa_hayes', { email: 'tecnico@vh.gov.py', rol: 'tecnico' }, 'jefe@vh.gov.py', false);
  const acc = await P.accesoDe('TECNICO@vh.gov.py');
  assert.equal(acc.cliente.id, 'villa_hayes'); assert.equal(acc.rol, 'tecnico');
  assert.equal((await P.accesoDe('nadie@x.py')).cliente, null);
});
