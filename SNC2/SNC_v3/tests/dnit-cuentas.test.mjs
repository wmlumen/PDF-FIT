import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizarEncabezado, normalizarFilas, planificarCambios, diferencias, partesCtaCte, seleccionarPlanillas, COLUMNAS,
  claveGrupo, compararPublicacion
} from '../dnitCuentas.js';
import { validarConsulta } from '../dnitServicio.js';

// Estructura real de las planillas de la DNIT (Piribebuy 2026), recortada.
const URBANA = [
  ['Dirección Nacional de Ingresos Tributarios ... Ejercicio Fiscal 2026', null],
  ['COD_DPTO', 'DESCRIPCION', 'COD_DISTRITO', 'DESCRIPCION2', 'ZONA', 'MANZANA', 'LOTE', "'PISO", "'SALON", 'CTACTE',
    'SUPERF_TIERRA', 'SUPERFICIE_TIERRA_COMUN', 'SUPERF_TIERRA_TOTAL', 'VALOR_TIERRA', 'SUPERF_EDIF_PROP', 'SUPERF_EDIF_COMUN',
    'SUPERF_EDIF_TOTAL', 'VALOR_EDIFICADO', 'VALOR_OFICIAL', 'IMPUESTO', 'IMPUESTO_ADICIONAL', 'IMPUESTO_TOTAL', '70% DEL IMPUESTO INMOBILIARIO'],
  ['D', 'CORDILLERA', 12, 'PIRIBEBUY', 19, 1, 1, 0, 0, '190001-01/00-000', 20050, 0, 20050, 284850350, null, null, 0, 0, 284850350, 2848503.5, 1424251.75, 4272755, 2990929],
  ['D', 'CORDILLERA', 12, 'PIRIBEBUY', 19, 1, 2, 0, 0, '190001-02/00-000', 0, 0, 0, 14207, null, null, 0, 0, 14207, 142.07, 71.035, 213, 149],
  [null, null, null],
  ['D', 'CORDILLERA', 12, 'PIRIBEBUY', 19, 1, 3, 0, 0, null, 1, 0, 1, 1, null, null, 0, 0, 1, 1, 1, 1, 1]
];
const RURAL = [
  ['Encabezado'],
  ['DEPARTAMENTO', 'DIST_ID_CIUDAD', 'DISTRITO', 'PADRON', 'CRUR_TIPO_PROPIEDAD', 'HAS', 'MTS2', 'VAL_OFICIAL',
    'IMPUESTO_INMOBILIARIO_1%', 'ADICIONAL_A_INMUEBLE_RURAL', 'IMP_TOTAL_1%VALOF+ADICRURAL', '70PORC_IMP_MUNICIPAL'],
  ['D', 12, 'PIRIBEBUY', 1, 'R', 4568, 3097, 10132561166, 101325612, 10132561, 111458173, 78020721]
];

test('normalizarEncabezado quita apostrofos, acentos y simbolos', () => {
  assert.equal(normalizarEncabezado("'PISO"), 'PISO');
  assert.equal(normalizarEncabezado('70% DEL IMPUESTO INMOBILIARIO'), '70PCT_DEL_IMPUESTO_INMOBILIARIO');
  assert.equal(normalizarEncabezado('IMP_TOTAL_1%VALOF+ADICRURAL'), 'IMP_TOTAL_1PCTVALOF_ADICRURAL');
});

test('normalizarFilas lee la planilla urbana real: clave, huella y descarte de filas sin Cta. Cte.', () => {
  const { registros, descartadas } = normalizarFilas(URBANA, 'urbano');
  assert.equal(registros.length, 2);
  assert.equal(descartadas, 1);
  const r = registros[0];
  assert.equal(r.clave, 'D|12|190001-01/00-000');
  assert.equal(r.impuesto_total, 4272755);
  assert.equal(r.impuesto_municipal_70, 2990929);
  assert.equal(r.piso, 0);
  assert.match(r.hash, /^[0-9a-f]{40}$/);
});

test('normalizarFilas lee la planilla rural real con todos sus campos', () => {
  const { registros } = normalizarFilas(RURAL, 'rural');
  assert.equal(registros[0].clave, 'D|12|1');
  assert.equal(registros[0].hectareas, 4568);
  assert.equal(registros[0].impuesto_total, 111458173);
  assert.equal(registros[0].impuesto_municipal_70, 78020721);
});

test('normalizarFilas falla con claridad si la planilla no tiene la columna clave', () => {
  assert.throws(() => normalizarFilas([['A', 'B'], [1, 2]], 'urbano'), /encabezados/);
});

test('planificarCambios: solo altas, modificaciones, reactivaciones y bajas; las iguales no se tocan', () => {
  const { registros } = normalizarFilas(URBANA, 'urbano');
  const [a, b] = registros;
  const campos = Object.keys(COLUMNAS.urbano);
  const existentes = new Map([
    [a.clave, { ...a, vigente: 1 }],                                   // igual
    [b.clave, { ...b, impuesto_total: 999, hash: 'viejo', vigente: 1 }], // cambió
    ['D|12|888888-88/00-000', { hash: 'z', vigente: 1 }]              // ya no se pública
  ]);
  const plan = planificarCambios(existentes, registros, campos);
  assert.equal(plan.iguales, 1);
  assert.equal(plan.altas.length, 0);
  assert.equal(plan.modificaciones.length, 1);
  assert.deepEqual(plan.modificaciones[0].cambios, { impuesto_total: [999, 213] });
  assert.deepEqual(plan.bajas, ['D|12|888888-88/00-000']);

  const reactivar = planificarCambios(new Map([[a.clave, { ...a, vigente: 0 }]]), [a], campos);
  assert.equal(reactivar.reactivadas.length, 1);
  assert.equal(reactivar.bajas.length, 0);
});

test('diferencias ignora variaciones de redondeo menores a medio centavo', () => {
  assert.deepEqual(diferencias({ x: 1.001 }, { x: 1.004 }, ['x']), {});
  assert.deepEqual(diferencias({ x: 1 }, { x: 2 }, ['x']), { x: [1, 2] });
});

test('partesCtaCte desarma la cuenta urbana en zona, manzana y lote (para unir con el catastro)', () => {
  assert.deepEqual(partesCtaCte('190001-01/00-000'), { zona: 19, manzana: 1, lote: 1, piso: 0, salon: 0 });
  assert.equal(partesCtaCte('no-es-una-cuenta'), null);
});

test('seleccionarPlanillas filtra por departamento y distrito sin importar acentos', () => {
  const items = [
    { id: 1, departamento: { name: 'Cordillera' }, ciudad: 'PIRIBEBUY', dateModified: 'x',
      archivoUrbano: { name: 'u.xlsx', link: { href: '/documents/u' } }, archivoRural: { name: 'r.xlsx', link: { href: '/documents/r' } } },
    { id: 2, departamento: { name: 'Guaira' }, ciudad: 'VILLARRICA', archivoUrbano: { link: { href: '/documents/v' } } }
  ];
  const sel = seleccionarPlanillas(items, 'cordillera', 'Piribebuy');
  assert.deepEqual(sel.map(s => [s.tipo, s.href]), [['urbano', '/documents/u'], ['rural', '/documents/r']]);
  assert.equal(seleccionarPlanillas(items, 'Guairá').length, 1);
});

test('claveGrupo separa las 6 planillas de Asunción aunque compartan código de distrito', () => {
  assert.equal(claveGrupo('Asunción', 'La Catedral', 'urbano'), 'ASUNCION|LA CATEDRAL|urbano');
  assert.notEqual(claveGrupo('Asunción', 'LA CATEDRAL', 'urbano'), claveGrupo('Asunción', 'RECOLETA', 'urbano'));
});

test('compararPublicacion detecta grupos nuevos, actualizados, al dia y retirados', () => {
  const publicadas = [
    { departamento: 'Cordillera', distrito: 'PIRIBEBUY', tipo: 'urbano', href: '/d/u1', nombre: 'u1.xlsx' },
    { departamento: 'Cordillera', distrito: 'PIRIBEBUY', tipo: 'rural', href: '/d/r2', nombre: 'r2.xlsx' },
    { departamento: 'Central', distrito: 'LUQUE', tipo: 'urbano', href: '/d/l1', nombre: 'l1.xlsx' }
  ];
  const importadas = [
    { departamento: 'Cordillera', distrito: 'PIRIBEBUY', tipo: 'urbano', href: '/d/u1' },
    { departamento: 'Cordillera', distrito: 'PIRIBEBUY', tipo: 'rural', href: '/d/r1' },
    { departamento: 'Guaira', distrito: 'VIEJO', tipo: 'urbano', href: '/d/v' }
  ];
  const r = compararPublicacion(publicadas, importadas);
  const est = Object.fromEntries(r.grupos.map(g => [g.grupo, g.estado]));
  assert.equal(est['CORDILLERA|PIRIBEBUY|urbano'], 'al_dia');
  assert.equal(est['CORDILLERA|PIRIBEBUY|rural'], 'actualizacion');
  assert.equal(est['CENTRAL|LUQUE|urbano'], 'nuevo');
  assert.equal(est['GUAIRA|VIEJO|urbano'], 'retirado');
  assert.equal(r.requiereActualizacion, true);
  assert.deepEqual(r.resumen, { al_dia: 1, actualizacion: 1, nuevo: 1, retirado: 1 });
  assert.equal(compararPublicacion(publicadas.slice(0, 1), importadas.slice(0, 1)).requiereActualizacion, false);
});

test('validarConsulta acepta solo formatos validos', () => {
  assert.deepEqual(validarConsulta({ ctacte: '190001-01/00-000' }), { ctacte: '190001-01/00-000' });
  assert.deepEqual(validarConsulta({ padron: '1', distrito: 'Piribebuy' }), { padron: 1, distrito: 'PIRIBEBUY' });
  assert.deepEqual(validarConsulta({ zona: '19', manzana: '1', lote: '1' }), { zona: 19, manzana: 1, lote: 1 });
  assert.throws(() => validarConsulta({ ctacte: "1' OR 1=1" }), /formato/);
  assert.throws(() => validarConsulta({ padron: '5' }), /cod_distrito o distrito/);
  assert.throws(() => validarConsulta({}), /Indique/);
});

test('normalizarFilas lee números como texto con punto decimal y con formato es-PY', () => {
  const filas = [URBANA[0], URBANA[1],
    ['M', 'ÑEEMBUCU', '4', 'DESMOCHADOS', '28', '1', '2', '0', '0', '280001-02/00-000', '5471.42', '0', '5471.42', '43196861', null, null, '0', '0', '43196861', '1.234.567,5', '0', '0', '0']];
  const r = normalizarFilas(filas, 'urbano').registros[0];
  assert.equal(r.superf_tierra, 5471.42);
  assert.equal(r.impuesto, 1234567.5);
  assert.equal(r.cod_distrito, 4);
});

test('detectarTipo reconoce planillas cargadas en la casilla equivocada', async () => {
  const { detectarTipo } = await import('../dnitCuentas.js');
  assert.equal(detectarTipo(URBANA), 'urbano');
  assert.equal(detectarTipo(RURAL), 'rural');
  assert.equal(detectarTipo([['x'], ['y']]), null);
});

test('normalizarFilas descarta filas con departamento invalido (totales o basura)', () => {
  const filas = [URBANA[0], URBANA[1], ['360', 'X', 360, 'X', 1, 1, 1, 0, 0, '010001-01/00-000', 1, 0, 1, 1, null, null, 0, 0, 1, 1, 1, 1, 1], URBANA[2]];
  const { registros, descartadas } = normalizarFilas(filas, 'urbano');
  assert.equal(registros.length, 1);
  assert.equal(descartadas, 1);
});

test('detectarEjercicio lee el año del título de la planilla y no adivina si falta', async () => {
  const { detectarEjercicio } = await import('../dnitCuentas.js');
  assert.equal(detectarEjercicio(URBANA), 2026);
  assert.equal(detectarEjercicio([['Liquidación ... para el Ejercicio   Fiscal 2027   '], ['COD_DPTO']]), 2027);
  assert.equal(detectarEjercicio(RURAL), null);          // "Encabezado" sin año
  assert.equal(detectarEjercicio([]), null);
});

test('modoEjercicio: año nuevo o corrección actualiza; año anterior solo se guarda como histórico', async () => {
  const { modoEjercicio } = await import('../dnitCuentas.js');
  assert.equal(modoEjercicio(2027, 2026), 'vigente');
  assert.equal(modoEjercicio(2026, 2026), 'vigente');
  assert.equal(modoEjercicio(2023, 2026), 'historico');
  assert.equal(modoEjercicio(2026, null), 'vigente');
  assert.equal(modoEjercicio(null, 2026), 'rechazar');
});
