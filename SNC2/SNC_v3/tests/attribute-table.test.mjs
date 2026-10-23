/**
 * Tests del modelo de Tabla de Atributos (js/attributeTable.js).
 * Ejecutar: node tests/attribute-table.test.mjs
 */
import assert from 'node:assert/strict';
import {
    AttributeTableClass, nextSortOrder, compareValues, evaluateCondition,
    parseFilterExpression, formatCondition, deriveColumns, boundsOfFeatures,
    formatCellValue, FILTER_OPERATORS
} from '../js/attributeTable.js';

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
}

// ─── Fixture: 5 parcelas con atributos variados ───────────────────────────────
function makeFeatures() {
    return [
        { type: 'Feature', properties: { PADRON: '30', NOMBRE: 'Río Negro', AREA: 1500.5, TIPO: 'RURAL', ZONA: '04' },
          geometry: { type: 'Polygon', coordinates: [[[-57.01,-25.45],[-57.00,-25.45],[-57.00,-25.44],[-57.01,-25.45]]] } },
        { type: 'Feature', properties: { PADRON: '9', NOMBRE: 'Álamo', AREA: 800, TIPO: 'URBANO', ZONA: '01' },
          geometry: { type: 'Polygon', coordinates: [[[-57.02,-25.46],[-57.015,-25.46],[-57.015,-25.455],[-57.02,-25.46]]] } },
        { type: 'Feature', properties: { PADRON: '100', NOMBRE: 'Centro', AREA: 2400.75, TIPO: 'URBANO', ZONA: '02' },
          geometry: { type: 'Polygon', coordinates: [[[-57.03,-25.47],[-57.02,-25.47],[-57.02,-25.46],[-57.03,-25.47]]] } },
        { type: 'Feature', properties: { PADRON: '4', NOMBRE: 'Estancia', AREA: null, TIPO: 'RURAL', ZONA: '04' },
          geometry: { type: 'Point', coordinates: [-57.04, -25.48] } },
        { type: 'Feature', properties: { PADRON: '55', NOMBRE: '', AREA: 120, TIPO: 'URBANO', ZONA: '03' },
          geometry: { type: 'Point', coordinates: [-57.05, -25.49] } }
    ];
}
function tbl(features = makeFeatures(), cfg = {}) {
    const T = new AttributeTableClass();
    T.load('parcelas', features, cfg);
    return T;
}

console.log('\n=== Tabla de Atributos — orden, filtros, selección ===\n');

console.log('1) Ordenamiento de 3 estados (spec §3.2)');
t('el ciclo es original → ASC → DESC → original', () => {
    assert.equal(nextSortOrder(null), 'ASC');
    assert.equal(nextSortOrder('ASC'), 'DESC');
    assert.equal(nextSortOrder('DESC'), null);
});
t('clic 1 en cabecera ordena ASC', () => {
    const T = tbl();
    assert.equal(T.toggleSort('PADRON'), 'ASC');
    assert.equal(T.sortField, 'PADRON');
    assert.equal(T.sortStateOf('PADRON'), 'asc');
});
t('clic 2 ordena DESC', () => {
    const T = tbl();
    T.toggleSort('PADRON'); T.toggleSort('PADRON');
    assert.equal(T.sortOrder, 'DESC');
    assert.equal(T.sortStateOf('PADRON'), 'desc');
});
t('clic 3 vuelve al orden original', () => {
    const T = tbl();
    T.toggleSort('PADRON'); T.toggleSort('PADRON'); T.toggleSort('PADRON');
    assert.equal(T.sortOrder, null);
    assert.equal(T.sortField, null, 'vuelve a sin orden');
    assert.equal(T.sortStateOf('PADRON'), null);
});
t('ASC ordena numéricamente, no como texto ("9" antes que "30")', () => {
    const T = tbl();
    T.toggleSort('PADRON');
    const orden = T.visibleRows().map(r => r.feature.properties.PADRON);
    assert.deepEqual(orden, ['4','9','30','55','100'], 'orden numérico correcto');
});
t('DESC invierte', () => {
    const T = tbl();
    T.toggleSort('PADRON'); T.toggleSort('PADRON');
    const orden = T.visibleRows().map(r => r.feature.properties.PADRON);
    assert.deepEqual(orden, ['100','55','30','9','4']);
});
t('cambiar de columna reinicia a ASC', () => {
    const T = tbl();
    T.toggleSort('PADRON'); T.toggleSort('PADRON');  // PADRON DESC
    assert.equal(T.toggleSort('NOMBRE'), 'ASC');
    assert.equal(T.sortField, 'NOMBRE');
});
t('los valores vacíos van al final en ASC', () => {
    const T = tbl();
    T.toggleSort('AREA');
    const areas = T.visibleRows().map(r => r.feature.properties.AREA);
    assert.equal(areas[areas.length - 1], null, 'el null queda último');
});
t('el orden es estable (mismo valor conserva el orden original)', () => {
    const T = tbl();
    T.toggleSort('TIPO');
    const idx = T.visibleRows().map(r => r.index);
    // Los 3 URBANO deben conservar su orden relativo original: 1, 2, 4
    const urbanos = T.visibleRows().filter(r => r.feature.properties.TIPO === 'URBANO').map(r => r.index);
    assert.deepEqual(urbanos, [1, 2, 4]);
});
t('el ordenamiento no muta las features', () => {
    const T = tbl();
    const before = T.features.map(f => f.properties.PADRON);
    T.toggleSort('PADRON'); T.toggleSort('PADRON');
    assert.deepEqual(T.features.map(f => f.properties.PADRON), before);
});

console.log('\n2) compareValues');
t('números', () => { assert.ok(compareValues(2, 10) < 0); });
t('strings numéricos se comparan como número', () => { assert.ok(compareValues('9', '10') < 0); });
t('texto con acentos', () => { assert.ok(compareValues('Álamo', 'Zona') < 0); });
t('texto usa orden natural', () => { assert.ok(compareValues('item2', 'item10') < 0); });
t('fechas ISO', () => { assert.ok(compareValues('2024-01-01', '2024-06-01') < 0); });
t('vacíos al final', () => { assert.ok(compareValues(null, 5) > 0); assert.ok(compareValues(5, null) < 0); });
t('ambos vacíos son iguales', () => { assert.equal(compareValues(null, ''), 0); });

console.log('\n3) Columnas');
t('deriva las columnas de las propiedades', () => {
    const T = tbl();
    assert.deepEqual(T.allColumns().map(c => c.field), ['PADRON','NOMBRE','AREA','TIPO','ZONA']);
});
t('todas visibles por defecto', () => {
    assert.equal(tbl().visibleColumns().length, 5);
});
t('toggleColumn oculta una', () => {
    const T = tbl();
    T.toggleColumn('AREA');
    assert.deepEqual(T.visibleColumns().map(c => c.field), ['PADRON','NOMBRE','TIPO','ZONA']);
    assert.deepEqual(T.hiddenColumnNames(), ['AREA']);
});
t('ocultar y volver a mostrar', () => {
    const T = tbl();
    T.toggleColumn('AREA'); T.toggleColumn('AREA');
    assert.equal(T.visibleColumns().length, 5);
    assert.deepEqual(T.hiddenColumnNames(), []);
});
t('setColumnVisible con campo inexistente devuelve false', () => {
    assert.equal(tbl().setColumnVisible('NO_EXISTE', false), false);
});
t('setColumnLabel cambia el alias', () => {
    const T = tbl();
    T.setColumnLabel('AREA', 'Superficie (m²)');
    assert.equal(T.allColumns().find(c => c.field === 'AREA').label, 'Superficie (m²)');
});
t('hiddenColumns de la config se aplica al cargar', () => {
    const T = tbl(makeFeatures(), { hiddenColumns: ['ZONA'] });
    assert.deepEqual(T.hiddenColumnNames(), ['ZONA']);
});
t('columnOrder de la config reordena', () => {
    const T = tbl(makeFeatures(), { columnOrder: ['TIPO','PADRON'] });
    assert.deepEqual(T.allColumns().slice(0,2).map(c => c.field), ['TIPO','PADRON']);
});
t('deriveColumns con features vacías', () => {
    assert.deepEqual(deriveColumns([]), []);
});
t('deriveColumns tolera properties faltantes', () => {
    assert.deepEqual(deriveColumns([{ type:'Feature' }, { type:'Feature', properties: { A: 1 } }]), [
        { field: 'A', label: 'A', visible: true, related: false, isAttachment: false }
    ]);
});

console.log('\n4) Filtros (DefinitionQuery, spec §3.3)');
t('filtro de igualdad textual', () => {
    const T = tbl();
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    assert.equal(T.filteredCount, 3);
});
t('filtro numérico mayor que', () => {
    const T = tbl();
    T.setFilter({ field: 'AREA', op: '>', value: 1000 });
    assert.equal(T.filteredCount, 2);
});
t('filtro contains', () => {
    const T = tbl();
    T.setFilter({ field: 'NOMBRE', op: 'contains', value: 'o' });
    const nombres = T.visibleRows().map(r => r.feature.properties.NOMBRE);
    assert.ok(nombres.every(n => n.toLowerCase().includes('o')), JSON.stringify(nombres));
});
t('filtro está vacío', () => {
    const T = tbl();
    T.setFilter({ field: 'AREA', op: 'empty' });
    assert.equal(T.filteredCount, 1);
});
t('filtro no está vacío', () => {
    const T = tbl();
    T.setFilter({ field: 'NOMBRE', op: 'notempty' });
    assert.equal(T.filteredCount, 4);
});
t('el filtro se combina con el orden', () => {
    const T = tbl();
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    T.toggleSort('AREA');
    const areas = T.visibleRows().map(r => r.feature.properties.AREA);
    assert.deepEqual(areas, [120, 800, 2400.75]);
});
t('clearFilter restaura todo', () => {
    const T = tbl();
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    assert.equal(T.filteredCount, 3);
    T.clearFilter();
    assert.equal(T.filteredCount, 5);
    assert.equal(T.hasFilter, false);
});
t('rechaza filtrar por un campo inexistente', () => {
    const r = tbl().setFilter({ field: 'NO_EXISTE', op: '=', value: 'x' });
    assert.equal(r.ok, false);
    assert.match(r.error, /no existe/);
});
t('el filtro vuelve a la página 1', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    T.setPage(3);
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    assert.equal(T.page, 1);
});

console.log('\n5) parseFilterExpression (texto libre)');
t('parsea "AREA > 1000"', () => {
    const r = parseFilterExpression('AREA > 1000');
    assert.equal(r.field, 'AREA'); assert.equal(r.op, '>'); assert.equal(r.value, '1000');
    assert.equal(r.error, null);
});
t('parsea "TIPO = URBANO"', () => {
    const r = parseFilterExpression('TIPO = URBANO');
    assert.equal(r.field, 'TIPO'); assert.equal(r.op, '='); assert.equal(r.value, 'URBANO');
});
t('parsea operador >= sin cortarlo en >', () => {
    const r = parseFilterExpression('AREA >= 1000');
    assert.equal(r.op, '>='); assert.equal(r.value, '1000');
});
t('parsea operador en español "contiene"', () => {
    const r = parseFilterExpression('NOMBRE contiene río');
    assert.equal(r.field, 'NOMBRE'); assert.equal(r.op, 'contains'); assert.equal(r.value, 'río');
});
t('parsea "está vacío"', () => {
    const r = parseFilterExpression('AREA está vacío');
    assert.equal(r.op, 'empty'); assert.equal(r.error, null);
});
t('quita comillas del valor', () => {
    const r = parseFilterExpression('TIPO = "URBANO"');
    assert.equal(r.value, 'URBANO');
});
t('error si falta el valor', () => {
    const r = parseFilterExpression('AREA >');
    assert.ok(r.error);
});
t('texto vacío no da error', () => {
    const r = parseFilterExpression('');
    assert.equal(r.error, null); assert.equal(r.field, '');
});
t('sin operador asume "no está vacío"', () => {
    const r = parseFilterExpression('NOMBRE');
    assert.equal(r.op, 'notempty');
});
t('setFilter acepta la expresión como string', () => {
    const T = tbl();
    const r = T.setFilter('AREA > 1000');
    assert.equal(r.ok, true);
    assert.equal(T.filteredCount, 2);
});
t('formatCondition genera texto legible', () => {
    assert.equal(formatCondition({ field: 'AREA', op: '>', value: '1000' }), 'AREA es mayor que 1000');
    assert.equal(formatCondition({ field: 'AREA', op: 'empty' }), 'AREA está vacío');
});

console.log('\n6) Paginación (spec §3.1)');
t('pageSize por defecto 50', () => { assert.equal(tbl().pageSize, 50); });
t('totalPages calcula bien', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    assert.equal(T.totalPages, 3);
});
t('pageRows devuelve el tamaño de página', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    assert.equal(T.pageRows().length, 2);
});
t('la última página tiene el resto', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    T.setPage(3);
    assert.equal(T.pageRows().length, 1);
});
t('setPage acota a los límites', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    assert.equal(T.setPage(99), 3);
    assert.equal(T.setPage(0), 1);
    assert.equal(T.setPage(-5), 1);
});
t('nextPage / prevPage', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    assert.equal(T.nextPage(), 2);
    assert.equal(T.prevPage(), 1);
});
t('la paginación respeta el filtro', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    assert.equal(T.totalPages, 2, '3 urbanos con pageSize 2 = 2 páginas');
});
t('setPageSize reinicia a la página 1', () => {
    const T = tbl(makeFeatures(), { pageSize: 2 });
    T.setPage(3);
    T.setPageSize(10);
    assert.equal(T.page, 1);
    assert.equal(T.totalPages, 1);
});

console.log('\n7) Selección con modificadores (spec §3.3)');
t('clic simple reemplaza la selección', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    T.selectWithModifiers(2);
    assert.deepEqual(T.selectedIndices(), [2]);
    assert.equal(T.selectionCount, 1);
});
t('Ctrl+clic agrega (discontinuo)', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    T.selectWithModifiers(2, { ctrl: true });
    T.selectWithModifiers(4, { ctrl: true });
    assert.deepEqual(T.selectedIndices(), [0, 2, 4]);
});
t('Ctrl+clic sobre uno ya seleccionado lo quita', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    T.selectWithModifiers(2, { ctrl: true });
    T.selectWithModifiers(0, { ctrl: true });
    assert.deepEqual(T.selectedIndices(), [2]);
});
t('Shift+clic selecciona el rango continuo', () => {
    const T = tbl();
    T.selectWithModifiers(1);
    T.selectWithModifiers(4, { shift: true });
    assert.deepEqual(T.selectedIndices(), [1, 2, 3, 4]);
});
t('Shift+clic hacia atrás también funciona', () => {
    const T = tbl();
    T.selectWithModifiers(4);
    T.selectWithModifiers(1, { shift: true });
    assert.deepEqual(T.selectedIndices(), [1, 2, 3, 4]);
});
t('Shift+clic usa el orden VISIBLE, no el original', () => {
    const T = tbl();
    T.toggleSort('PADRON');   // orden: 4,9,30,55,100 → índices 3,1,0,4,2
    T.selectWithModifiers(3);            // fila visible 0 (PADRON 4)
    T.selectWithModifiers(0, { shift: true });  // fila visible 2 (PADRON 30)
    assert.deepEqual(T.selectedIndices(), [0, 1, 3], 'debe tomar las 3 filas visibles del rango');
});
t('clearSelection vacía', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    T.clearSelection();
    assert.equal(T.selectionCount, 0);
});
t('isSelected consulta por índice original', () => {
    const T = tbl();
    T.selectWithModifiers(2);
    assert.equal(T.isSelected(2), true);
    assert.equal(T.isSelected(0), false);
});
t('la selección sobrevive al ordenamiento', () => {
    const T = tbl();
    T.selectWithModifiers(2);
    T.toggleSort('PADRON');
    assert.deepEqual(T.selectedIndices(), [2]);
});
t('la selección sobrevive al filtro', () => {
    const T = tbl();
    T.selectWithModifiers(2);
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    assert.deepEqual(T.selectedIndices(), [2]);
});

console.log('\n8) Extensión espacial de la selección (spec §3.3)');
t('sin selección devuelve vacío', () => {
    assert.equal(tbl().selectionExtent().type, 'empty');
});
t('un punto devuelve type point', () => {
    const T = tbl();
    T.selectWithModifiers(3);   // feature índice 3 es un Point
    const e = T.selectionExtent();
    assert.equal(e.type, 'point');
    assert.equal(e.single, true);
    assert.deepEqual(e.bounds, [-57.04, -25.48, -57.04, -25.48]);
});
t('un polígono devuelve su envolvente', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    const e = T.selectionExtent();
    assert.equal(e.type, 'extent');
    assert.deepEqual(e.bounds, [-57.01, -25.45, -57.00, -25.44]);
});
t('selección múltiple une las envolventes', () => {
    const T = tbl();
    T.selectWithModifiers(0);
    T.selectWithModifiers(2, { ctrl: true });
    const e = T.selectionExtent();
    assert.equal(e.type, 'extent');
    assert.equal(e.single, false);
    assert.equal(e.bounds[0], -57.03, 'lon mínima');
    assert.equal(e.bounds[1], -25.47, 'lat mínima');
    assert.equal(e.bounds[2], -57.00, 'lon máxima');
    assert.equal(e.bounds[3], -25.44, 'lat máxima');
});
t('boundsOfFeatures ignora valores no finitos', () => {
    assert.equal(boundsOfFeatures([{ geometry: { coordinates: [NaN, 3] } }]), null);
});
t('boundsOfFeatures con lista vacía', () => {
    assert.equal(boundsOfFeatures([]), null);
});

console.log('\n9) Relates 1:N (spec §3.2)');
t('abre la tabla hija y guarda el historial', () => {
    const T = tbl();
    const hijas = [{ type:'Feature', properties: { DETALLE: 'x' }, geometry: { type:'Point', coordinates: [0,0] } }];
    T.openRelated({ childLayerId: 'detalles', childFeatures: hijas, parentRowIndex: 2, field: 'PADRON' });
    assert.equal(T.layerId, 'detalles');
    assert.equal(T.totalRows, 1);
    assert.equal(T.hasParent, true);
    assert.ok(T.related);
    assert.equal(T.related.parentLayerId, 'parcelas');
});
t('closeRelated vuelve a la tabla padre', () => {
    const T = tbl();
    T.openRelated({ childLayerId: 'detalles', childFeatures: [], parentRowIndex: 2, field: 'PADRON' });
    assert.equal(T.closeRelated(), true);
    assert.equal(T.layerId, 'parcelas');
    assert.equal(T.totalRows, 5);
    assert.equal(T.hasParent, false);
});
t('closeRelated restaura orden, filtro y selección', () => {
    const T = tbl();
    T.toggleSort('PADRON');
    T.setFilter({ field: 'TIPO', op: '=', value: 'URBANO' });
    T.selectWithModifiers(2);
    const ordenAntes = T.sortField;
    const filtroAntes = T.filteredCount;
    T.openRelated({ childLayerId: 'detalles', childFeatures: [], parentRowIndex: 0, field: 'P' });
    T.closeRelated();
    assert.equal(T.sortField, ordenAntes);
    assert.equal(T.filteredCount, filtroAntes);
    assert.deepEqual(T.selectedIndices(), [2]);
});
t('closeRelated sin padre devuelve false', () => {
    assert.equal(tbl().closeRelated(), false);
});
t('soporta anidamiento de relates', () => {
    const T = tbl();
    T.openRelated({ childLayerId: 'nivel1', childFeatures: [], parentRowIndex: 0, field: 'a' });
    T.openRelated({ childLayerId: 'nivel2', childFeatures: [], parentRowIndex: 0, field: 'b' });
    assert.equal(T.layerId, 'nivel2');
    T.closeRelated();
    assert.equal(T.layerId, 'nivel1');
    T.closeRelated();
    assert.equal(T.layerId, 'parcelas');
});

console.log('\n10) Serialización (tableConfig)');
t('toConfig produce la forma esperada', () => {
    const T = tbl();
    T.toggleSort('PADRON');
    T.selectWithModifiers(1);
    T.toggleColumn('ZONA');
    const c = T.toConfig();
    assert.equal(c.sortField, 'PADRON');
    assert.equal(c.sortOrder, 'ASC');
    assert.deepEqual(c.selectedIds, [1]);
    assert.deepEqual(c.hiddenColumns, ['ZONA']);
    assert.equal(c.pageSize, 50);
    assert.equal(c.columnOrder.length, 5);
});
t('la config se puede recargar en otra instancia', () => {
    const T1 = tbl();
    T1.toggleSort('AREA'); T1.toggleSort('AREA');
    T1.setColumnVisible('ZONA', false);
    const cfg = T1.toConfig();
    const T2 = tbl(makeFeatures(), cfg);
    assert.equal(T2.sortField, 'AREA');
    assert.equal(T2.sortOrder, 'DESC');
    assert.deepEqual(T2.hiddenColumnNames(), ['ZONA']);
});
t('reset limpia todo', () => {
    const T = tbl();
    T.toggleSort('PADRON'); T.selectWithModifiers(0); T.setFilter({ field:'TIPO', op:'=', value:'URBANO' });
    T.reset();
    assert.equal(T.layerId, null);
    assert.equal(T.totalRows, 0);
    assert.equal(T.selectionCount, 0);
    assert.equal(T.hasFilter, false);
    assert.equal(T.sortField, null);
});

console.log('\n11) Eventos');
t('on("selection") notifica', () => {
    const T = tbl();
    let got = null;
    T.on('selection', p => { got = p; });
    T.selectWithModifiers(1);
    assert.deepEqual(got.indices, [1]);
});
t('on("sort") notifica', () => {
    const T = tbl();
    let got = null;
    T.on('sort', p => { got = p; });
    T.toggleSort('PADRON');
    assert.equal(got.field, 'PADRON');
    assert.equal(got.order, 'ASC');
});
t('un callback que lanza no rompe el modelo', () => {
    const T = tbl();
    T.on('change', () => { throw new Error('boom'); });
    T.selectWithModifiers(0);
    assert.equal(T.selectionCount, 1);
});

console.log('\n12) Formato de celdas');
t('vacío muestra guion', () => assert.equal(formatCellValue(null), '—'));
t('booleano en español', () => {
    assert.equal(formatCellValue(true), 'Sí');
    assert.equal(formatCellValue(false), 'No');
});
t('áreas con separador de miles y 2 decimales', () => {
    const s = formatCellValue(2400.75, 'AREA');
    assert.match(s, /2\.400,75|2,400\.75/, 'formato numérico con separador: ' + s);
});
t('texto tal cual', () => assert.equal(formatCellValue('URBANO'), 'URBANO'));

console.log('\n13) Datos reales: barrios de Piribebuy');
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
t('carga barrios.geojson y opera sobre sus 34 features', () => {
    const fc = JSON.parse(readFileSync(join(ROOT, 'data', 'piribebuy', 'barrios.geojson'), 'utf8'));
    const T = new AttributeTableClass();
    T.load('barrios', fc.features, { pageSize: 10 });
    assert.equal(T.totalRows, 34);
    assert.equal(T.totalPages, 4);
    assert.ok(T.allColumns().length > 0, 'debe derivar columnas');
    // Ordenar por una columna real
    const col = T.allColumns()[0].field;
    T.toggleSort(col);
    assert.equal(T.visibleRows().length, 34);
    // Filtrar por DISTRITO
    if (T.allColumns().some(c => c.field === 'DISTRITO')) {
        const r = T.setFilter({ field: 'DISTRITO', op: 'notempty' });
        assert.equal(r.ok, true);
        assert.ok(T.filteredCount > 0);
    }
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60) + '\n');
process.exit(fail ? 1 : 0);
