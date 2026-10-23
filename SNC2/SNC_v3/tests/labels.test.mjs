/**
 * Tests del etiquetado por atributo (js/labels.js).
 * Ejecutar: node tests/labels.test.mjs
 */
import assert from 'node:assert/strict';
import {
    LABEL_DEFAULTS, PLACEMENTS,
    normalizeLabelConfig, hasLabelSource, interpolate, labelText, buildLabels,
    labelStyle, labelHtml, inScaleRange, describeLabelConfig, leafletDirection
} from '../js/labels.js';

let pass = 0, fail = 0;
const test = (name, fn) => {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
};
const eq = (a, b, m) => assert.deepEqual(a, b, m);

console.log('='.repeat(60));
console.log('ETIQUETADO POR ATRIBUTO');
console.log('='.repeat(60));

// ─── Normalización ────────────────────────────────────────────────────────────
console.log('\n1) Normalización de la configuración');
test('config vacía toma los valores por defecto', () => {
    const c = normalizeLabelConfig();
    eq(c.enabled, false);
    eq(c.fontSize, LABEL_DEFAULTS.fontSize);
    eq(c.colorFromLayer, true);
    eq(c.haloEnabled, true);
    eq(c.placement, 'auto');
    eq(c.minScale, null);
});
test('tolera null y basura', () => {
    const c = normalizeLabelConfig(null);
    eq(c.enabled, false);
    const c2 = normalizeLabelConfig({ fontSize: 'abc', placement: 'inventado', color: 'no-es-color' });
    eq(c2.fontSize, LABEL_DEFAULTS.fontSize);
    eq(c2.placement, 'auto');
    eq(c2.color, LABEL_DEFAULTS.color);
});
test('recorta el tamaño de fuente a un rango usable', () => {
    eq(normalizeLabelConfig({ fontSize: 2 }).fontSize, 6);
    eq(normalizeLabelConfig({ fontSize: 999 }).fontSize, 48);
    eq(normalizeLabelConfig({ fontSize: 14 }).fontSize, 14);
});
test('acepta colores hex válidos de 3 y 6 dígitos', () => {
    eq(normalizeLabelConfig({ color: '#abc' }).color, '#abc');
    eq(normalizeLabelConfig({ color: '#1f2937' }).color, '#1f2937');
    eq(normalizeLabelConfig({ color: 'rojo' }).color, LABEL_DEFAULTS.color);
});
test('colorFromLayer es true salvo que se desactive explícitamente', () => {
    eq(normalizeLabelConfig({}).colorFromLayer, true);
    eq(normalizeLabelConfig({ colorFromLayer: false }).colorFromLayer, false);
});
test('la opacidad de la caja queda en 0..1', () => {
    eq(normalizeLabelConfig({ boxOpacity: -1 }).boxOpacity, 0);
    eq(normalizeLabelConfig({ boxOpacity: 5 }).boxOpacity, 1);
    eq(normalizeLabelConfig({ boxOpacity: 0.5 }).boxOpacity, 0.5);
});
test('las escalas vacías se normalizan a null', () => {
    eq(normalizeLabelConfig({ minScale: '' }).minScale, null);
    eq(normalizeLabelConfig({ maxScale: undefined }).maxScale, null);
    eq(normalizeLabelConfig({ minScale: 50000 }).minScale, 50000);
});

// ─── ¿Hay fuente? ─────────────────────────────────────────────────────────────
console.log('\n2) Detección de fuente de etiqueta');
test('sin campo ni expresión no hay fuente', () => {
    eq(hasLabelSource({}), false);
    eq(hasLabelSource({ field: '   ' }), false);
});
test('con campo hay fuente', () => eq(hasLabelSource({ field: 'nombre' }), true));
test('con expresión hay fuente', () => eq(hasLabelSource({ expression: '{nombre}' }), true));

// ─── Interpolación ────────────────────────────────────────────────────────────
console.log('\n3) Interpolación de la expresión');
test('sustituye un campo', () => {
    eq(interpolate('{nombre}', { nombre: 'Arroyo Yhaguy' }), 'Arroyo Yhaguy');
});
test('sustituye varios campos', () => {
    eq(interpolate('{nombre} ({tipo})', { nombre: 'Yhaguy', tipo: 'río' }), 'Yhaguy (río)');
});
test('un campo ausente queda vacío, no "undefined"', () => {
    eq(interpolate('{nombre} {noExiste}', { nombre: 'Río' }), 'Río');
    eq(interpolate('{noExiste}', {}), '');
});
test('tolera diferencias de mayúsculas', () => {
    eq(interpolate('{NOMBRE}', { nombre: 'Piribebuy' }), 'Piribebuy');
    eq(interpolate('{nombre}', { NOMBRE: 'Piribebuy' }), 'Piribebuy');
});
test('colapsa espacios sobrantes', () => {
    eq(interpolate('  {a}   {b}  ', { a: 'x', b: 'y' }), 'x y');
});
test('valores numéricos y cero se muestran', () => {
    eq(interpolate('{n}', { n: 0 }), '0');
    eq(interpolate('{n}', { n: 1234.5 }), '1234.5');
});
test('sin expresión devuelve vacío', () => eq(interpolate('', { a: 1 }), ''));

// ─── Texto de la etiqueta ─────────────────────────────────────────────────────
console.log('\n4) Texto final de la etiqueta');
test('con expresión manda la expresión', () => {
    eq(labelText({ nombre: 'A', tipo: 'río' }, { expression: '{nombre} ({tipo})' }), 'A (río)');
});
test('sin expresión usa el campo simple', () => {
    eq(labelText({ nombre: 'Arroyo' }, { field: 'nombre' }), 'Arroyo');
});
test('el campo simple tolera mayúsculas', () => {
    eq(labelText({ NOMBRE: 'Arroyo' }, { field: 'nombre' }), 'Arroyo');
});
test('campo vacío o ausente no produce etiqueta', () => {
    eq(labelText({ nombre: '' }, { field: 'nombre' }), '');
    eq(labelText({}, { field: 'nombre' }), '');
});
test('el valor 0 sí produce etiqueta', () => {
    eq(labelText({ valor: 0 }, { field: 'valor' }), '0');
});
test('sin fuente devuelve vacío', () => eq(labelText({ a: 1 }, {}), ''));

// ─── Lista de etiquetas ───────────────────────────────────────────────────────
console.log('\n5) Construcción de la lista de etiquetas');
const HIDRO = [
    { properties: { nombre: 'Arroyo Yhaguy', tipo: 'arroyo' } },
    { properties: { nombre: 'Río Piribebuy', tipo: 'río' } },
    { properties: { nombre: '', tipo: 'canal' } },
    { properties: { nombre: 'Arroyo Yhaguy', tipo: 'arroyo' } }
];
test('desactivadas no devuelven nada', () => {
    eq(buildLabels(HIDRO, { enabled: false, field: 'nombre' }), []);
});
test('activadas sin campo no devuelven nada', () => {
    eq(buildLabels(HIDRO, { enabled: true }), []);
});
test('devuelve una etiqueta por entidad con valor', () => {
    const out = buildLabels(HIDRO, { enabled: true, field: 'nombre' });
    eq(out.length, 3);   // la tercera no tiene nombre
    eq(out[0], { index: 0, text: 'Arroyo Yhaguy' });
    eq(out[1], { index: 1, text: 'Río Piribebuy' });
    eq(out[2], { index: 3, text: 'Arroyo Yhaguy' });
});
test('dedupe quita textos repetidos', () => {
    const out = buildLabels(HIDRO, { enabled: true, field: 'nombre', dedupe: true });
    eq(out.length, 2);
    eq(out.map(o => o.text), ['Arroyo Yhaguy', 'Río Piribebuy']);
});
test('conserva el índice original de la entidad', () => {
    const out = buildLabels(HIDRO, { enabled: true, field: 'nombre', dedupe: true });
    eq(out[0].index, 0);
    eq(out[1].index, 1);
});
test('tolera una lista vacía o nula', () => {
    eq(buildLabels([], { enabled: true, field: 'nombre' }), []);
    eq(buildLabels(null, { enabled: true, field: 'nombre' }), []);
});

// ─── Estilo ───────────────────────────────────────────────────────────────────
console.log('\n6) Estilo de la etiqueta (color de la capa)');
test('hereda el color de la capa por defecto', () => {
    const st = labelStyle({ enabled: true, field: 'nombre' }, { color: '#0ea5e9' });
    eq(st.color, '#0ea5e9');
});
test('el color propio se usa si se desactiva la herencia', () => {
    const st = labelStyle({ color: '#ff0000', colorFromLayer: false }, { color: '#0ea5e9' });
    eq(st.color, '#ff0000');
});
test('si la capa no tiene color, cae al propio', () => {
    const st = labelStyle({ color: '#123456' }, {});
    eq(st.color, '#123456');
});
test('negrita y cursiva se traducen a CSS', () => {
    eq(labelStyle({ bold: true, italic: true }).fontWeight, '700');
    eq(labelStyle({ bold: true, italic: true }).fontStyle, 'italic');
    eq(labelStyle({ bold: false, italic: false }).fontWeight, '500');
    eq(labelStyle({ bold: false, italic: false }).fontStyle, 'normal');
});
test('el tamaño de fuente se respeta', () => {
    eq(labelStyle({ fontSize: 16 }).fontSize, 16);
});
test('la posición se traduce a la dirección de Leaflet', () => {
    eq(leafletDirection('center'), 'center');
    eq(leafletDirection('above'), 'top');
    eq(leafletDirection('below'), 'bottom');
    eq(leafletDirection('left'), 'left');
    eq(leafletDirection('right'), 'right');
    eq(leafletDirection('auto'), 'auto');
    eq(leafletDirection(undefined), 'auto');
});

// ─── HTML ─────────────────────────────────────────────────────────────────────
console.log('\n7) HTML de la etiqueta');
test('usa el color de la capa', () => {
    const html = labelHtml('Arroyo', { enabled: true, field: 'nombre' }, { color: '#0ea5e9' });
    assert.match(html, /color:#0ea5e9/);
});
test('aplica el halo con text-shadow', () => {
    const html = labelHtml('Arroyo', { haloEnabled: true, haloWidth: 2 }, {});
    assert.match(html, /text-shadow:/);
});
test('sin halo no hay text-shadow', () => {
    const html = labelHtml('Arroyo', { haloEnabled: false }, {});
    assert.doesNotMatch(html, /text-shadow:/);
});
test('la caja de fondo se aplica si está activada', () => {
    const con = labelHtml('A', { boxEnabled: true, boxColor: '#ffffff', boxOpacity: 0.8 }, {});
    assert.match(con, /background:rgba\(255,255,255,0\.8\)/);
    const sin = labelHtml('A', { boxEnabled: false }, {});
    assert.doesNotMatch(sin, /background:/);
});
test('escapa el texto para evitar inyección de HTML', () => {
    const html = labelHtml('<script>alert(1)</script>', {}, {});
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
});
test('escapa comillas en el texto', () => {
    const html = labelHtml('Río "Yhaguy"', {}, {});
    assert.doesNotMatch(html, /"Yhaguy"/);
    assert.match(html, /&quot;Yhaguy&quot;/);
});

// ─── Rango de escala ──────────────────────────────────────────────────────────
console.log('\n8) Rango de escala');
test('sin límites siempre se muestra', () => {
    eq(inScaleRange({}, 50000), true);
    eq(inScaleRange({}, null), true);
});
test('respeta el mínimo (no mostrar si está muy alejado)', () => {
    eq(inScaleRange({ minScale: 20000 }, 50000), false);
    eq(inScaleRange({ minScale: 20000 }, 10000), true);
});
test('respeta el máximo (no mostrar si está muy cerca)', () => {
    eq(inScaleRange({ maxScale: 5000 }, 2000), false);
    eq(inScaleRange({ maxScale: 5000 }, 10000), true);
});
test('con ambos límites solo se muestra dentro', () => {
    const c = { minScale: 20000, maxScale: 5000 };
    eq(inScaleRange(c, 10000), true);
    eq(inScaleRange(c, 50000), false);
    eq(inScaleRange(c, 2000), false);
});
test('sin escala del visor se muestra igual', () => {
    eq(inScaleRange({ minScale: 20000, maxScale: 5000 }, null), true);
});

// ─── Descripción ──────────────────────────────────────────────────────────────
console.log('\n9) Descripción legible');
test('desactivadas', () => eq(describeLabelConfig({}), 'Desactivadas'));
test('activadas sin campo', () => {
    eq(describeLabelConfig({ enabled: true }), 'Activadas, sin campo elegido');
});
test('con campo muestra la fuente y el color de la capa', () => {
    const d = describeLabelConfig({ enabled: true, field: 'nombre', fontSize: 12 });
    assert.match(d, /\{nombre\}/);
    assert.match(d, /12px/);
    assert.match(d, /color de la capa/);
});
test('con color propio lo muestra', () => {
    const d = describeLabelConfig({ enabled: true, field: 'nombre', colorFromLayer: false, color: '#ff0000' });
    assert.match(d, /#ff0000/);
});

// ─── Caso real del usuario ────────────────────────────────────────────────────
console.log('\n10) Caso real: capa Hidrografía con columna nombre');
test('muestra el nombre de cada río con el color de la capa', () => {
    const features = [
        { properties: { nombre: 'Arroyo Yhaguy', tipo: 'arroyo', long_km: 12.5 } },
        { properties: { nombre: 'Río Piribebuy', tipo: 'río', long_km: 30.2 } },
        { properties: { nombre: 'Canal Norte', tipo: 'canal', long_km: 4.1 } }
    ];
    const config = { enabled: true, field: 'nombre', colorFromLayer: true, fontSize: 12 };
    const layerStyle = { color: '#0ea5e9' };   // azul de Hidrografía

    const labels = buildLabels(features, config);
    eq(labels.length, 3);
    eq(labels.map(l => l.text), ['Arroyo Yhaguy', 'Río Piribebuy', 'Canal Norte']);

    const html = labelHtml(labels[0].text, config, layerStyle);
    assert.match(html, /Arroyo Yhaguy/);
    assert.match(html, /color:#0ea5e9/);       // mismo color que la capa
    assert.match(html, /font-size:12px/);

    const st = labelStyle(config, layerStyle);
    eq(st.color, '#0ea5e9');
    eq(st.colorFromLayer, true);
});
test('se puede cambiar el color sin perder el resto', () => {
    const config = { enabled: true, field: 'nombre', colorFromLayer: false, color: '#dc2626' };
    const st = labelStyle(config, { color: '#0ea5e9' });
    eq(st.color, '#dc2626');
});
test('expresión combinada con varios campos', () => {
    const features = [{ properties: { nombre: 'Río Piribebuy', tipo: 'río' } }];
    const labels = buildLabels(features, { enabled: true, expression: '{nombre} ({tipo})' });
    eq(labels[0].text, 'Río Piribebuy (río)');
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);
