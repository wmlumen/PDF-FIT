/**
 * tests/municipal-patentes-ciudadano.test.mjs
 * Pruebas unitarias e integración para:
 * 1. Gestión Municipal / Catastro Distrital / Inspectores / Patentes comerciales (Ley 3966)
 * 2. Ciudadano / Propietario / Vinculación Cta. Cte. / Notificaciones
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as patentesServicio from '../municipalPatentesServicio.js';
import * as notifServicio from '../ciudadanoNotificacionesServicio.js';

test('Municipal - Catálogo y estados de patente comercial', () => {
  const estados = Object.values(patentesServicio.ESTADOS_PATENTE);
  assert.ok(estados.includes('con_patente'), 'Estado con_patente debe existir');
  assert.ok(estados.includes('sin_patente'), 'Estado sin_patente debe existir');
  assert.ok(estados.includes('patente_vencida'), 'Estado patente_vencida debe existir');
  assert.ok(estados.includes('inhabilitada'), 'Estado inhabilitada debe existir');
  assert.ok(estados.includes('no_declarada'), 'Estado no_declarada debe existir');
});

test('Municipal - Listado y filtrado de locales comerciales', () => {
  const todos = patentesServicio.listarLocales({ dpto: 'D', dist: '12' });
  assert.ok(todos.length >= 5, 'Debe haber al menos 5 locales de prueba');

  const sinPatente = patentesServicio.listarLocales({ dpto: 'D', dist: '12', estado: 'sin_patente' });
  assert.ok(sinPatente.length >= 1, 'Debe encontrar locales sin patente');
  assert.strictEqual(sinPatente[0].estado, 'sin_patente');

  const busqueda = patentesServicio.listarLocales({ dpto: 'D', dist: '12', q: 'Ferretería' });
  assert.ok(busqueda.length >= 1, 'Debe encontrar locales por búsqueda de texto');
});

test('Municipal - Registro de inspección de terreno por inspector', () => {
  const inspeccion = patentesServicio.registrarInspeccion({
    cta_cte: '190099-01/00-000',
    dpto: 'D',
    dist: '12',
    nombre_fantasia: 'Bazar y Librería Central',
    rubro: 'Librería y Papelería',
    estado: 'patente_vencida',
    m2_comercial: 65,
    canon_anual_gs: 450000,
    inspector: 'Juan Coronel (Insp. 01)',
    nro_acta: 'ACT-TEST-001',
    observaciones: 'Patente vencida en inspección anual.',
    lat: -25.465,
    lng: -57.040
  });

  assert.ok(inspeccion.id, 'Debe generar un ID');
  assert.strictEqual(inspeccion.estado, 'patente_vencida');
  assert.strictEqual(inspeccion.m2_comercial, 65);
  assert.ok(inspeccion.actas.length >= 1, 'Debe registrar el acta en el historial');
});

test('Municipal - Resumen estadístico y financiero distrital', () => {
  const resumen = patentesServicio.obtenerResumenDistrito('D', '12');
  assert.strictEqual(resumen.dpto, 'D');
  assert.strictEqual(resumen.dist, '12');
  assert.ok(resumen.total_locales >= 5, 'Total locales mayor o igual a 5');
  assert.ok(resumen.recaudacion_actual_gs > 0, 'Debe sumar recaudación actual');
  assert.ok(resumen.recaudacion_potencial_pendiente_gs > 0, 'Debe calcular evasión o mora potencial');
});

test('Ciudadano - Normalización de teléfono móvil paraguayo', () => {
  assert.strictEqual(notifServicio.normalizarTelefono('0981 123 456'), '+595981123456');
  assert.strictEqual(notifServicio.normalizarTelefono('0971-555-888'), '+595971555888');
  assert.strictEqual(notifServicio.normalizarTelefono('+595982111222'), '+595982111222');
});

test('Ciudadano - Vinculación de Cta. Cte. Catastral y notificaciones', () => {
  const vinc = notifServicio.vincularCtaCte({
    user_id: 'user_test_999',
    cta_cte: '190073-08/00-000',
    dpto: 'D',
    dist: '12',
    alias: 'Mi Casa Piribebuy',
    telefono: '0981 999 888',
    recibir_whatsapp: 1,
    alerta_vencimientos: 1
  });

  assert.strictEqual(vinc.user_id, 'user_test_999');
  assert.strictEqual(vinc.cta_cte, '190073-08/00-000');
  assert.strictEqual(vinc.telefono, '+595981999888');

  const lista = notifServicio.listarVinculaciones('user_test_999');
  assert.ok(lista.length >= 1, 'Debe listar la cuenta vinculada');

  const notifs = notifServicio.listarNotificaciones('user_test_999');
  assert.ok(notifs.length >= 1, 'Debe haberse generado la notificación de vinculación');
});

test('Ciudadano - Consulta de situación integral de Cta. Cte.', () => {
  const sit = notifServicio.obtenerSituacionCtaCte('190073-08/00-000', 'D', '12');
  assert.strictEqual(sit.cta_cte, '190073-08/00-000');
  assert.ok(sit.liquidacion_fiscal.total_a_pagar_gs > 0, 'Total a pagar mayor a cero');
  assert.ok(sit.situacion_tributaria.semaforo === 'verde' || sit.situacion_tributaria.semaforo === 'rojo');
  assert.ok(sit.desglose_catastral.distrito_nombre, 'Debe incluir nombre distrital');
});
