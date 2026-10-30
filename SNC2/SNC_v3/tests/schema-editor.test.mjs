/**
 * Tests del editor de esquema de atributos (js/schemaEditor.js).
 * Ejecutar: node tests/schema-editor.test.mjs
 */
import assert from 'node:assert/strict';
import {
    COLUMN_TYPES, TYPE_VALUES, SYSTEM_COLUMNS,
    normalizeColumnType, normalizeColumn, normalizeSchema, deriveName, makeColumn,
    computeCellValue, formatValue, coerceValue, mergeSchema, visibleColumns,
    sidecarPath, dataPath, serializeSchema, parseSchema
} from '../js/schemaEditor.js';

let pass = 0, fail = 0;
const t = (name, fn) => {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
};
const eq = (a, b, m) => assert.deepEqual(a, b, m);

console.log('='.repeat(60));
console.log('EDITOR DE ATRIBUTOS — ESQUEMA DE COLUMNAS');
console.log('='.repeat(60));

// ─── Tipos ───────────────────────────────────────────────────────────────────
console.log('\n1) Tipos de columna');
t('hay 7 tipos', () => eq(Object.keys(COLUMN_TYPES).length, 7));
t('los tipos son validos', () => {
    eq(TYPE_VALUES.includes('text'), true);
    eq(TYPE_VALUES.includes('coord_x'), true);
    eq(TYPE_VALUES.includes('coord_y'), true);
});
t('tipos desconocidos caen a texto', () => {
    eq(normalizeColumnType('loquesea'), 'text');
    eq(normalizeColumnType(null), 'text');
    eq(normalizeColumnType('NUMBER'), 'number');
});
t('cada tipo tiene etiqueta en español', () => {
    for (const t of Object.values(COLUMN_TYPES)) {
        assert.ok(t.label && t.label.length > 1, `sin etiqueta: ${t.value}`);
    }
});

// ─── Columna ─────────────────────────────────────────────────────────────────
console.log('\n2) Normalización de columna');
t('columna minima', () => {
    const c = normalizeColumn({ name: 'OBS', title: 'Observaciones' });
    eq(c.name, 'OBS');
    eq(c.title, 'Observaciones');
    eq(c.alias, 'Observaciones');
    eq(c.type, 'text');
    eq(c.visible, true);
    eq(c.editable, true);
});
t('el ancho queda acotado', () => {
    eq(normalizeColumn({ width: 5 }).width, 6);
    eq(normalizeColumn({ width: 9999 }).width, 400);
    eq(normalizeColumn({ width: 'x' }).width, 120);
});
t('columna readonly no se puede editar', () => {
    const c = normalizeColumn({ name: 'AREA_M2', readonly: true });
    eq(c.readonly, true);
});
t('Sistema: las columnas del sistema existen', () => {
    eq(SYSTEM_COLUMNS.includes('AREA_M2'), true);
    eq(SYSTEM_COLUMNS.includes('FID'), true);
});

// ─── deriveName ──────────────────────────────────────────────────────────────
console.log('\n3) Derivar nombre de campo');
t('título con espacios y acentos', () => {
    eq(deriveName('Nombre de la calle'), 'NOMBRE_DE_LA_CALLE');
    // El dígito se conserva; el carácter no alfanumérico se reemplaza.
    eq(deriveName('Área (m²)'), 'AREA_M2');
});
t('vacío no rompe', () => {
    assert.equal(typeof deriveName(null), 'string');
    assert.equal(typeof deriveName(''), 'string');
});
t('hace mayúsculas y guiones bajos', () => {
    eq(deriveName('padron catastral'), 'PADRON_CATASTRAL');
});

// ─── makeColumn ──────────────────────────────────────────────────────────────
console.log('\n4) Crear columna nueva');
t('crea con nombre derivado', () => {
    const c = makeColumn({ title: 'Observación', type: 'text' });
    assert.equal(c.name, 'OBSERVACION');
    eq(c.type, 'text');
    eq(c.readonly, false);
});
t('tipo de coordenada', () => {
    const c = makeColumn({ title: 'Coordenada X', type: 'coord_x' });
    eq(c.type, 'coord_x');
});
t('sin título no rompe', () => {
    assert.ok(makeColumn({}).name.length > 0);
});

// ─── computeCellValue ────────────────────────────────────────────────────────
console.log('\n5) Valor de celda según tipo');
const filaPunto = {
    properties: { NOMBRE: 'ARROYO YTU' },
    geometry: { type: 'Point', coordinates: [-57.0077, -25.4548] }
};
const filaLinea = {
    properties: {},
    geometry: { type: 'LineString', coordinates: [[-57.1, -25.4], [-57.05, -25.42], [-57.0, -25.45]] }
};
const filaPoligono = {
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[-57.1, -25.4], [-57.0, -25.4], [-57.0, -25.5], [-57.1, -25.4]]] }
};
t('texto sale del atributo', () => {
    eq(computeCellValue(filaPunto, { name: 'NOMBRE', type: 'text', source: 'file' }), 'ARROYO YTU');
});
t('coordenada X de un punto', () => {
    const v = computeCellValue(filaPunto, { name: 'X', type: 'coord_x' });
    assert.ok(Math.abs(Number(v) - (-57.0077)) < 1e-6, v);
});
t('coordenada Y de un punto', () => {
    const v = computeCellValue(filaPunto, { name: 'Y', type: 'coord_y' });
    assert.ok(Math.abs(Number(v) - (-25.4548)) < 1e-6, v);
});
t('coordenada X de una línea (punto medio)', () => {
    const v = Number(computeCellValue(filaLinea, { name: 'X', type: 'coord_x' }));
    assert.ok(Math.abs(v - (-57.05)) < 1e-6, String(v));
});
t('coordenada X de un polígono (baricentro)', () => {
    const v = Number(computeCellValue(filaPoligono, { name: 'X', type: 'coord_x' }));
    assert.ok(v < -57.0 && v > -57.1, String(v));
});
t('coordenada Y de un polígono', () => {
    const v = Number(computeCellValue(filaPoligono, { name: 'Y', type: 'coord_y' }));
    assert.ok(v < -25.4 && v > -25.5, String(v));
});
t('valor por defecto cuando no hay dato', () => {
    eq(computeCellValue(filaPunto, { name: 'Z', type: 'text', default: 'S/D' }), 'S/D');
});
t('fila nula no rompe', () => {
    eq(computeCellValue(null, { name: 'X', type: 'coord_x' }), '');
});
t('columna del usuario con valor guardado', () => {
    const f = { properties: { OBS: 'hola' }, geometry: null };
    eq(computeCellValue(f, { name: 'OBS', type: 'text' }), 'hola');
});

// ─── formatValue ─────────────────────────────────────────────────────────────
console.log('\n6) Formato de valores');
t('número', () => eq(formatValue('3.14', 'number'), '3.14'));
t('entero redondea', () => eq(formatValue('3.7', 'integer'), '4'));
t('no numérico se deja tal cual', () => eq(formatValue('abc', 'number'), 'abc'));
t('booleano sí', () => eq(formatValue('si', 'bool'), 'Sí'));
t('booleano no', () => eq(formatValue('0', 'bool'), 'No'));
t('nulo es vacío', () => eq(formatValue(null, 'text'), ''));

// ─── coerceValue ─────────────────────────────────────────────────────────────
console.log('\n7) Validación al editar');
t('texto acepta cualquier cosa', () => {
    assert.equal(coerceValue('hola', 'text').ok, true);
});
t('número válido', () => {
    const r = coerceValue('3.14', 'number');
    assert.equal(r.ok, true);
    assert.equal(r.value, 3.14);
});
t('número con coma decimal', () => {
    const r = coerceValue('3,14', 'number');
    assert.equal(r.ok, true);
    assert.equal(r.value, 3.14);
});
t('número inválido da error', () => {
    const r = coerceValue('abc', 'number');
    assert.equal(r.ok, false);
    assert.ok(r.error.length > 0);
});
t('entero rechaza decimal', () => {
    assert.equal(coerceValue('3.5', 'integer').ok, false);
    assert.equal(coerceValue('3', 'integer').ok, true);
});
t('booleano', () => {
    assert.equal(coerceValue('si', 'bool').value, true);
    assert.equal(coerceValue('no', 'bool').value, false);
    assert.equal(coerceValue('quizás', 'bool').ok, false);
});
t('fecha válida e inválida', () => {
    assert.equal(coerceValue('2026-10-20', 'date').ok, true);
    assert.equal(coerceValue('20/10/2026', 'date').ok, false);
});
t('vacío siempre vale', () => {
    assert.equal(coerceValue('', 'number').ok, true);
    assert.equal(coerceValue(null, 'text').value, '');
});

// ─── mergeSchema ─────────────────────────────────────────────────────────────
console.log('\n8) Unión esquema de archivo + columnas nuevas');
t('columnas del archivo primero', () => {
    const cols = mergeSchema(['NOMBRE', 'TIPO'], null);
    eq(cols.map(c => c.name), ['NOMBRE', 'TIPO']);
});
t('las del archivo son readonly', () => {
    const cols = mergeSchema(['NOMBRE'], null);
    eq(cols[0].readonly, true);
});
t('se agregan las columnas del usuario', () => {
    const cols = mergeSchema(['NOMBRE'], {
        columns: [{ name: 'OBS', title: 'Observación', type: 'text' }],
        order: ['OBS']
    });
    eq(cols.map(c => c.name), ['NOMBRE', 'OBS']);
    eq(cols[1].readonly, false);
});
t('se respeta el orden del usuario', () => {
    const cols = mergeSchema(['A', 'B'], {
        columns: [{ name: 'C' }, { name: 'D' }],
        order: ['D', 'C']
    });
    eq(cols.map(c => c.name), ['A', 'B', 'D', 'C']);
});
t('sin esquema de usuario no rompe', () => {
    assert.equal(mergeSchema(['A'], null).length, 1);
    assert.equal(mergeSchema(null, null).length, 0);
});
t('tipo adivinado para coordenadas', () => {
    const cols = mergeSchema(['X', 'Y', 'LAT', 'LON']);
    eq(cols.find(c => c.name === 'X').type, 'coord_x');
    eq(cols.find(c => c.name === 'Y').type, 'coord_y');
    eq(cols.find(c => c.name === 'LAT').type, 'coord_y');
    eq(cols.find(c => c.name === 'LON').type, 'coord_x');
});
t('tipo adivinado para área', () => {
    eq(mergeSchema(['AREA_M2'])[0].type, 'number');
});

// ─── visibleColumns ──────────────────────────────────────────────────────────
console.log('\n9) Columnas visibles');
t('respeta el orden pedido', () => {
    const cols = mergeSchema(['A', 'B', 'C']);
    eq(visibleColumns(cols, ['C', 'A']).map(c => c.name), ['C', 'A']);
});
t('sin orden devuelve todas', () => {
    const cols = mergeSchema(['A', 'B']);
    eq(visibleColumns(cols, []).length, 2);
});
t('ignora nombres inexistentes', () => {
    const cols = mergeSchema(['A']);
    eq(visibleColumns(cols, ['A', 'NO_EXISTE']).map(c => c.name), ['A']);
});

// ─── Persistencia ────────────────────────────────────────────────────────────
console.log('\n10) Persistencia (sidecar)');
t('rutas del sidecar', () => {
    eq(sidecarPath('hidro'), 'data/piribebuy/hidro.atributos.json');
    eq(dataPath('hidro'), 'data/piribebuy/hidro.datos.json');
});
t('sanitiza el id', () => {
    const p = sidecarPath('../../etc/passwd');
    // Nunca debe escapar del directorio de datos.
    assert.ok(p.startsWith('data/piribebuy/'), p);
    assert.ok(!p.includes('..'), p);
    assert.ok(!p.includes('/etc/'), p);
    assert.ok(p.endsWith('.atributos.json'), p);
});
t('serializa y parsea de vuelta', () => {
    const sc = normalizeSchema({
        columns: [{ name: 'OBS', title: 'Observación', type: 'text' }],
        order: ['OBS']
    });
    const raw = serializeSchema(sc);
    const back = parseSchema(raw);
    eq(back.order, ['OBS']);
    eq(back.columns.OBS.type, 'text');
});
t('parsea basura sin romper', () => {
    const back = parseSchema('{esto no es json');
    eq(back.columns.length, 0);
});
t('parsea null sin romper', () => {
    eq(parseSchema(null).order.length, 0);
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);
