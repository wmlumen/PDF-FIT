/**
 * Tests del panel de propiedades de capa (js/layerDialog.js).
 * Ejecutar: node tests/layer-dialog.test.mjs
 *
 * Cubre la lógica pura: parseo de rangos de escala, validación, formato,
 * normalización de color y construcción de la especificación de pestañas.
 * El render DOM se verifica aparte en navegador headless.
 */
import assert from 'node:assert/strict';
import {
    parseScaleRange, validateScaleRange, formatScaleRange, normalizeColor,
    buildDialogSpec, applyDialogValues, SCALE_PRESETS, LINE_PATTERNS
} from '../js/layerDialog.js';
import LayerManager, { formatScale } from '../js/layerManager.js';

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
}
const fresh = () => { LayerManager.reset(); return LayerManager; };

console.log('\n=== Panel de propiedades de capa ===\n');

console.log('1) parseScaleRange');
t('rango "50000-500"', () => {
    const r = parseScaleRange('50000-500');
    assert.equal(r.minScale, 50000); assert.equal(r.maxScale, 500);
    assert.equal(r.error, null);
});
t('vacío = sin límite', () => {
    const r = parseScaleRange('');
    assert.equal(r.minScale, null); assert.equal(r.maxScale, null); assert.equal(r.error, null);
});
t('null y undefined = sin límite', () => {
    assert.equal(parseScaleRange(null).error, null);
    assert.equal(parseScaleRange(undefined).error, null);
});
t('valor único se toma como escala mínima', () => {
    const r = parseScaleRange('50000');
    assert.equal(r.minScale, 50000); assert.equal(r.maxScale, null);
});
t('"-500" solo escala máxima', () => {
    const r = parseScaleRange('-500');
    assert.equal(r.minScale, null); assert.equal(r.maxScale, 500);
});
t('ignora separadores de miles y prefijo "1:"', () => {
    const r = parseScaleRange('1:50.000 - 1:500');
    assert.equal(r.minScale, 50000); assert.equal(r.maxScale, 500);
});
t('acepta guion largo y medio', () => {
    assert.equal(parseScaleRange('50000–500').minScale, 50000);
    assert.equal(parseScaleRange('50000—500').minScale, 50000);
});
t('rechaza minScale menor que maxScale (invertido)', () => {
    const r = parseScaleRange('500-50000');
    assert.ok(r.error, 'debería dar error');
    assert.match(r.error, /debe ser mayor/);
});
t('rechaza texto inválido', () => {
    assert.ok(parseScaleRange('hola').error);
});
t('rechaza cero y negativos', () => {
    assert.ok(parseScaleRange('0').error);
    assert.ok(parseScaleRange('0-500').error);
});
t('acepta espacios', () => {
    assert.equal(parseScaleRange('  50000 - 500  ').minScale, 50000);
});

console.log('\n2) validateScaleRange');
t('rango válido', () => assert.equal(validateScaleRange(50000, 500), null));
t('solo mínimo válido', () => assert.equal(validateScaleRange(50000, null), null));
t('solo máximo válido', () => assert.equal(validateScaleRange(null, 500), null));
t('ambos null válido', () => assert.equal(validateScaleRange(null, null), null));
t('invertido es error', () => assert.ok(validateScaleRange(500, 50000)));
t('iguales es error', () => assert.ok(validateScaleRange(500, 500)));
t('negativo es error', () => assert.ok(validateScaleRange(-1, null)));
t('el mensaje explica cuál es cuál', () => {
    const e = validateScaleRange(500, 50000);
    assert.match(e, /alejado/);
    assert.match(e, /cercano/);
});

console.log('\n3) formatScaleRange');
t('ambos límites', () => assert.match(formatScaleRange(50000, 500), /1:50\.000.*1:500/));
t('sin límite', () => assert.equal(formatScaleRange(null, null), 'Sin límite'));
t('solo mínimo', () => assert.match(formatScaleRange(50000, null), /Hasta/));
t('solo máximo', () => assert.match(formatScaleRange(null, 500), /Desde/));

console.log('\n4) normalizeColor');
t('#rrggbb se mantiene', () => assert.equal(normalizeColor('#22d3ee'), '#22d3ee'));
t('#rgb se expande', () => assert.equal(normalizeColor('#abc'), '#aabbcc'));
t('mayúsculas a minúsculas', () => assert.equal(normalizeColor('#AABBCC'), '#aabbcc'));
t('rgb() a hex', () => assert.equal(normalizeColor('rgb(34, 211, 238)'), '#22d3ee'));
t('rgba() a hex', () => assert.equal(normalizeColor('rgba(34, 211, 238, 0.5)'), '#22d3ee'));
t('vacío devuelve el color por defecto', () => assert.equal(normalizeColor(''), '#22d3ee'));
t('basura devuelve el color por defecto', () => assert.equal(normalizeColor('nope'), '#22d3ee'));

console.log('\n5) buildDialogSpec: estructura');
t('capa produce 7 pestañas', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'barrios', title: 'Barrios', geometryType: 'Polygon', featureCount: 34 });
    const spec = buildDialogSpec(lm.get('barrios'), { geometryType: 'Polygon', currentScale: 130000 });
    const ids = spec.tabs.map(x => x.id);
    assert.deepEqual(ids, ['general','escala','simbologia','interaccion','etiquetas','popup','tabla','detalles']);
});
t('el título dice "Propiedades de capa"', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.equal(buildDialogSpec(lm.get('a')).title, 'Propiedades de capa');
});
t('un grupo produce solo la pestaña General', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'Grupo' });
    const spec = buildDialogSpec(lm.get('g'));
    assert.equal(spec.tabs.length, 1);
    assert.equal(spec.tabs[0].id, 'general');
    assert.equal(spec.title, 'Propiedades de grupo');
});
t('buildDialogSpec sin nodo lanza', () => {
    assert.throws(() => buildDialogSpec(null), /requiere un nodo/);
});

console.log('\n6) buildDialogSpec: contenido por pestaña');
t('General trae nombre, visibilidad y opacidad', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Capa A' });
    const spec = buildDialogSpec(lm.get('a'));
    const keys = spec.tabs[0].fields.map(f => f.key);
    assert.ok(keys.includes('title'));
    assert.ok(keys.includes('visible'));
    assert.ok(keys.includes('opacity'));
});
t('Escala trae rango y presets', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    const spec = buildDialogSpec(lm.get('a'));
    const esc = spec.tabs.find(x => x.id === 'escala');
    assert.ok(esc.fields.some(f => f.type === 'scale-range'));
    assert.ok(esc.fields.some(f => f.type === 'presets'));
});
t('Simbología de línea: color + grosor + patrón, sin relleno', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'vias', title: 'Vías' });
    const spec = buildDialogSpec(lm.get('vias'), { geometryType: 'LineString' });
    const sym = spec.tabs.find(x => x.id === 'simbologia');
    const keys = sym.fields.map(f => f.key);
    assert.ok(keys.includes('style.color'));
    assert.ok(keys.includes('style.weight'));
    assert.ok(keys.includes('style.dashArray'));
    assert.ok(!keys.includes('style.fillColor'), 'una línea no tiene relleno');
});
t('Simbología de punto incluye radio, sin relleno separado', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'centro', title: 'Centro' });
    const spec = buildDialogSpec(lm.get('centro'), { geometryType: 'Point' });
    const sym = spec.tabs.find(x => x.id === 'simbologia');
    const keys = sym.fields.map(f => f.key);
    assert.ok(keys.includes('style.radius'));
    assert.ok(!keys.includes('style.fillColor'));
});
t('Simbología de polígono incluye relleno y su opacidad', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'barrios', title: 'Barrios' });
    const spec = buildDialogSpec(lm.get('barrios'), { geometryType: 'Polygon' });
    const sym = spec.tabs.find(x => x.id === 'simbologia');
    const keys = sym.fields.map(f => f.key);
    assert.ok(keys.includes('style.fillColor'));
    assert.ok(keys.includes('style.fillOpacity'));
    assert.ok(!keys.includes('style.radius'));
});
t('Interacción trae los 4 permisos + leyenda', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    const spec = buildDialogSpec(lm.get('a'));
    const inter = spec.tabs.find(x => x.id === 'interaccion');
    const keys = inter.fields.map(f => f.key);
    for (const k of ['selectable','editable','snappable','labelEnabled','legend.showInLegend','legend.hideInLegend']) {
        assert.ok(keys.includes(k), `falta ${k}`);
    }
});
t('Popup usa los atributos reales del archivo', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    const spec = buildDialogSpec(lm.get('a'), { properties: ['NOMBRE','TIPO','AREA'] });
    const pop = spec.tabs.find(x => x.id === 'popup');
    const fields = pop.fields.find(f => f.type === 'fields');
    assert.equal(fields.value.length, 3);
    assert.equal(fields.value[0].fieldName, 'NOMBRE');
    assert.equal(fields.value[0].visible, true);
});
t('Popup respeta campos declarados y agrega los nuevos', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setPopupConfig('a', { title: '{AREA}', fields: [
        { fieldName: 'AREA', label: 'Superficie', visible: true },
        { fieldName: 'GID', label: 'ID', visible: false }
    ]});
    const spec = buildDialogSpec(lm.get('a'), { properties: ['AREA','NOMBRE','GID'] });
    const fields = spec.tabs.find(x => x.id === 'popup').fields.find(f => f.type === 'fields').value;
    assert.equal(fields[0].fieldName, 'AREA');
    assert.equal(fields[0].label, 'Superficie', 'conserva el alias');
    assert.equal(fields[1].fieldName, 'GID');
    assert.equal(fields[1].visible, false, 'conserva la visibilidad');
    assert.ok(fields.some(f => f.fieldName === 'NOMBRE'), 'agrega el campo nuevo');
});
t('Popup sin atributos cae a una lista por defecto', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    const spec = buildDialogSpec(lm.get('a'));
    const fields = spec.tabs.find(x => x.id === 'popup').fields.find(f => f.type === 'fields').value;
    assert.ok(fields.length > 0);
});
t('Detalles trae identificador y escala actual', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    const spec = buildDialogSpec(lm.get('a'), { currentScale: 130398 });
    const det = spec.tabs.find(x => x.id === 'detalles');
    assert.ok(det.fields.some(f => f.label === 'Identificador'));
    const esc = det.fields.find(f => f.label === 'Escala actual del visor');
    assert.match(esc.value, /1:130\.398/);
});
t('el rango de escala refleja el valor actual del nodo', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setScaleRange('a', { minScale: 50000, maxScale: 500 });
    const spec = buildDialogSpec(lm.get('a'));
    const f = spec.tabs.find(x => x.id === 'escala').fields.find(f => f.type === 'scale-range');
    assert.equal(f.minScale, 50000);
    assert.equal(f.maxScale, 500);
});

console.log('\n7) Presets y patrones de línea');
t('SCALE_PRESETS tiene 5 opciones incluida "sin límite"', () => {
    assert.equal(SCALE_PRESETS.length, 5);
    assert.equal(SCALE_PRESETS[0].id, 'sin-limite');
    assert.equal(SCALE_PRESETS[0].minScale, null);
});
t('todos los presets son rangos válidos', () => {
    for (const p of SCALE_PRESETS) {
        assert.equal(validateScaleRange(p.minScale, p.maxScale), null, `${p.label} es inválido`);
    }
});
t('LINE_PATTERNS tiene 4 patrones', () => {
    assert.equal(LINE_PATTERNS.length, 4);
    assert.equal(LINE_PATTERNS[0].dashArray, null, 'el primero es continuo');
    assert.ok(LINE_PATTERNS[1].dashArray, 'el segundo es segmentado');
});

console.log('\n8) applyDialogValues');
t('aplica escala, nombre y opacidad de una vez', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Original' });
    const res = applyDialogValues(lm.get('a'), {
        scaleRange: '50000-500', title: 'Nuevo', opacity: 40
    });
    assert.equal(res.ok, true);
    assert.equal(lm.get('a').minScale, 50000);
    assert.equal(lm.get('a').maxScale, 500);
    assert.equal(lm.get('a').title, 'Nuevo');
    assert.equal(lm.get('a').opacity, 0.4);
    assert.ok(res.changed.includes('escala'));
    assert.ok(res.changed.includes('nombre'));
    assert.ok(res.changed.includes('opacidad'));
});
t('rechaza la escala inválida SIN aplicar nada', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Original' });
    const res = applyDialogValues(lm.get('a'), { scaleRange: '500-50000', title: 'Nuevo' });
    assert.equal(res.ok, false);
    assert.ok(res.error);
    assert.equal(lm.get('a').title, 'Original', 'no debe aplicar el resto si la escala falla');
    assert.equal(lm.get('a').minScale, null);
});
t('aplica simbología y la normaliza', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    let painted = null;
    const res = applyDialogValues(lm.get('a'), {
        'style.color': '#ff0000', 'style.weight': '4', 'style.fillOpacity': 50, 'style.dashArray': 'solid'
    }, { onStyleChange: (id, s) => { painted = s; } });
    assert.equal(res.ok, true);
    assert.equal(lm.get('a').style.color, '#ff0000');
    assert.equal(lm.get('a').style.weight, 4, 'weight debe ser número');
    assert.equal(lm.get('a').style.fillOpacity, 0.5, 'fillOpacity 50% → 0.5');
    assert.equal(lm.get('a').style.dashArray, null, '"solid" → null');
    assert.ok(painted, 'debe notificar el cambio de estilo al mapa');
});
t('aplica capacidades y leyenda', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    applyDialogValues(lm.get('a'), {
        selectable: false, editable: true, snappable: false, labelEnabled: true,
        'legend.showInLegend': false, 'legend.hideInLegend': true
    });
    assert.equal(lm.get('a').selectable, false);
    assert.equal(lm.get('a').editable, true);
    assert.equal(lm.get('a').snappable, false);
    assert.equal(lm.get('a').labelEnabled, true);
    assert.equal(lm.get('a').legend.showInLegend, false);
    assert.equal(lm.get('a').legend.hideInLegend, true);
});
t('aplica la configuración de popup', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    applyDialogValues(lm.get('a'), {
        'popup.title': '{PADRON}',
        'popup.fields': [{ fieldName: 'PADRON', label: 'Padrón', visible: true }]
    });
    assert.equal(lm.get('a').popupInfo.title, '{PADRON}');
    assert.equal(lm.get('a').popupInfo.fields[0].label, 'Padrón');
});
t('aplica la configuración de tabla', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    applyDialogValues(lm.get('a'), {
        'tableConfig.pageSize': '100', 'tableConfig.sortOrder': 'DESC', 'tableConfig.sortField': 'padron'
    });
    assert.equal(lm.get('a').tableConfig.pageSize, 100);
    assert.equal(lm.get('a').tableConfig.sortOrder, 'DESC');
    assert.equal(lm.get('a').tableConfig.sortField, 'padron');
});
t('notifica el cambio de visibilidad al mapa', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    let vis = null;
    applyDialogValues(lm.get('a'), { visible: false }, { onVisibilityChange: (id, v) => { vis = v; } });
    assert.equal(vis, false);
    assert.equal(lm.get('a').visible, false);
});
t('no reporta cambios si nada cambió', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setScaleRange('a', { minScale: 50000, maxScale: 500 });
    const res = applyDialogValues(lm.get('a'), { scaleRange: '50000-500' });
    assert.equal(res.ok, true);
    assert.equal(res.changed.length, 0);
});
t('nodo inexistente devuelve error controlado', () => {
    const res = applyDialogValues(null, { title: 'x' });
    assert.equal(res.ok, false);
    assert.ok(res.error);
});
t('nombre vacío restaura el original', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Original' });
    lm.rename('a', 'Cambiado');
    applyDialogValues(lm.get('a'), { title: '   ' });
    assert.equal(lm.get('a').title, 'Original');
});

console.log('\n9) Integración con el modelo (formato de escala)');
t('formatScale sigue coincidiendo con formatScaleRange', () => {
    assert.equal(formatScale(50000), '1:50.000');
    assert.match(formatScaleRange(50000, 500), new RegExp(formatScale(50000).replace('.', '\\.')));
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60) + '\n');
process.exit(fail ? 1 : 0);
