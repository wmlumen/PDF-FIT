import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = mkdtempSync(join(tmpdir(), 'gc-'));
process.env.GESTION_DB = join(dir, 'g.sqlite'); process.env.CIUDADANO_DB = join(dir, 'c.sqlite'); process.env.NOTIF_DEV_MOSTRAR_CODIGO = '1';
const G = await import('../gestionMunicipalServicio.js');
const C = await import('../ciudadanoServicio.js');

test('estado del local: vigente, vencida, sin patente, inhabilitada', () => {
  const hoy = new Date('2026-10-29T12:00:00Z');
  assert.equal(G.estadoLocal({ patente_nro: '123', patente_vence: '2026-12-31' }, hoy), 'vigente');
  assert.equal(G.estadoLocal({ patente_nro: '123', patente_vence: '2026-01-31' }, hoy), 'vencida');
  assert.equal(G.estadoLocal({ patente_nro: null }, hoy), 'sin_patente');
  assert.equal(G.estadoLocal({ patente_nro: '1', patente_vence: '2027-01-01', inhabilitado: 1 }, hoy), 'inhabilitada');
  assert.equal(G.rubroOsm('"amenity"=>"pharmacy","name"=>"x"'), 'amenity: pharmacy');
});

test('locales e inspecciones: alta, resumen e inspección registrada', async () => {
  const { id } = await G.guardarLocal({ dpto: 'D', dist: 12, nombre: 'Despensa Central', rubro: 'almacén', patente_nro: 'P-55', patente_vence: '2020-01-01', lat: -25.4636, lng: -57.0428 }, 'ana@muni');
  const r = await G.locales({ dpto: 'D', dist: 12 });
  assert.equal(r.locales.find(l => l.id === id).estado, 'vencida');
  const ins = await G.asignarInspeccion({ dpto: 'D', dist: 12, local_id: id, motivo: 'Patente vencida', inspector: 'insp@muni.py' }, 'ana@muni');
  await G.registrarInspeccion(ins.id, { resultado: 'intimado', observacion: 'Plazo 10 días' }, 'insp@muni.py');
  const r2 = await G.locales({ dpto: 'D', dist: 12 });
  assert.equal(r2.inspecciones[0].resultado, 'intimado');
  await assert.rejects(G.guardarLocal({ dpto: 'D', dist: 12, nombre: 'x', lat: 10, lng: 10 }, 'a'), /fuera de Paraguay/);
});

test('ciudadano: teléfono y cuenta normalizados; vincular con consentimiento y código', async () => {
  assert.equal(C.normalizarTelefono('0981 123 456'), '+595981123456');
  assert.equal(C.normalizarTelefono('+595 981-123-456'), '+595981123456');
  assert.throws(() => C.normalizarTelefono('021 555 555'), /celular/);
  assert.equal(C.normalizarCuenta('190073-08'), '190073-08/00-000');
  assert.equal(C.normalizarCuenta('padrón 3479'), 'P3479');
  await assert.rejects(C.vincular({ dpto: 'D', dist: 12, cuenta: '190073-08', telefono: '0981123456' }), /aceptar/);
  const v = await C.vincular({ dpto: 'D', dist: 12, cuenta: '190073-08', telefono: '0981123456', canal: 'whatsapp', acepto: true });
  assert.match(v.telefono, /\*\*\*/);
  await assert.rejects(C.verificar(v.id, '000000'.replace(/./g, (c, i) => (v.codigo_dev[i] === '0' ? '1' : '0'))), /incorrecto/);
  assert.equal((await C.verificar(v.id, v.codigo_dev)).verificado, true);
  assert.equal(await C.avisar({ dpto: 'D', dist: 12, cuenta: '190073-08/00-000', tipo: 'prueba', mensaje: 'hola', clave: 'x1' }), 1);
  assert.equal(await C.avisar({ dpto: 'D', dist: 12, cuenta: '190073-08/00-000', tipo: 'prueba', mensaje: 'hola', clave: 'x1' }), 0);   // sin duplicados
  const b = await C.bandeja('D', 12);
  assert.equal(b.verificados, 1);
});
