/**
 * Tests de la referencia catastral SNC (js/sncReference.js) y de la regla de
 * leyenda (una capa apagada no figura en la leyenda).
 * Ejecutar: node tests/snc-reference.test.mjs
 */
import assert from 'node:assert/strict';
import {
    REF_STATES, REF_DEFAULTS,
    normalizeRefConfig, refState, refVisible, refRemotaVisible, refVisualVisible,
    refInLegend, refRemotaOnTop, describeRefState, refLegendEntries,
    shouldShowInLegend
} from '../js/sncReference.js';

let pass = 0, fail = 0;
const test = (name, fn) => {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
};
const eq = (a, b, m) => assert.deepEqual(a, b, m);

console.log('='.repeat(60));
console.log('REFERENCIA CATASTRAL SNC — VISUAL Y REMOTA SEPARADAS');
console.log('='.repeat(60));

// ─── Normalización ────────────────────────────────────────────────────────────
console.log('\n1) Normalización');
test('config vacía: ambas apagadas', () => {
    const c = normalizeRefConfig();
    eq(c.visualEnabled, false);
    eq(c.remotaEnabled, false);
    eq(c.remotaOnTop, true);
    eq(c.remotaInLegend, false);
});
test('tolera null y basura', () => {
    const c = normalizeRefConfig(null);
    eq(c.visualEnabled, false);
    eq(normalizeRefConfig({ remotaOpacity: 'x' }).remotaOpacity, REF_DEFAULTS.remotaOpacity);
});
test('la opacidad queda en 0..1', () => {
    eq(normalizeRefConfig({ remotaOpacity: -1 }).remotaOpacity, 0);
    eq(normalizeRefConfig({ remotaOpacity: 9 }).remotaOpacity, 1);
    eq(normalizeRefConfig({ remotaOpacity: 0.5 }).remotaOpacity, 0.5);
});
test('remotaOnTop es true salvo que se desactive', () => {
    eq(normalizeRefConfig({}).remotaOnTop, true);
    eq(normalizeRefConfig({ remotaOnTop: false }).remotaOnTop, false);
});

// ─── Estado ───────────────────────────────────────────────────────────────────
console.log('\n2) Estado compuesto');
test('ninguna activa', () => eq(refState({}), REF_STATES.OFF));
test('solo visual', () => eq(refState({ visualEnabled: true }), REF_STATES.VISUAL));
test('solo remota', () => eq(refState({ remotaEnabled: true }), REF_STATES.REMOTA));
test('ambas', () => eq(refState({ visualEnabled: true, remotaEnabled: true }), REF_STATES.AMBAS));
test('desactivada no es visible', () => eq(refVisible({}), false));
test('remota sola es visible', () => eq(refVisible({ remotaEnabled: true }), true));
test('visual sola es visible', () => eq(refVisible({ visualEnabled: true }), true));

// ─── Independencia visual / remota ────────────────────────────────────────────
console.log('\n3) Independencia entre visual y remota (lo pedido)');
test('activar la remota NO prende la visual', () => {
    eq(refRemotaVisible({ remotaEnabled: true }), true);
    eq(refVisualVisible({ remotaEnabled: true }), false);
});
test('activar la visual NO prende la remota', () => {
    eq(refVisualVisible({ visualEnabled: true }), true);
    eq(refRemotaVisible({ visualEnabled: true }), false);
});
test('la remota puede ir sola encima del mapa base', () => {
    const c = { remotaEnabled: true };
    eq(refRemotaVisible(c), true);
    eq(refRemotaOnTop(c), true);
});
test('la remota puede apagarse y quedar la visual', () => {
    const c = { visualEnabled: true, remotaEnabled: false };
    eq(refRemotaVisible(c), false);
    eq(refVisualVisible(c), true);
    eq(refVisible(c), true);
});
test('si se apaga la remota y no hay visual, no hay nada', () => {
    eq(refVisible({ visualEnabled: false, remotaEnabled: false }), false);
});

// ─── Leyenda ──────────────────────────────────────────────────────────────────
console.log('\n4) Comportamiento en la leyenda');
test('por defecto la referencia NO figura en la leyenda', () => {
    eq(refInLegend({ visualEnabled: true }), false);
    eq(refInLegend({ remotaEnabled: true }), false);
});
test('figura solo si se la habilita explícitamente', () => {
    eq(refInLegend({ visualEnabled: true, remotaInLegend: true }), true);
});
test('la visual y la remota son entradas separadas', () => {
    const entradas = refLegendEntries({ visualEnabled: true, remotaEnabled: true, remotaInLegend: true });
    eq(entradas.length, 2);
    eq(entradas.map(e => e.id), ['snc-ref', 'snc-ref-remota']);
});
test('sin habilitar la leyenda, no hay entradas', () => {
    eq(refLegendEntries({ visualEnabled: true, remotaEnabled: true }), []);
});

// ─── Regla de leyenda: apagada = fuera ────────────────────────────────────────
console.log('\n5) Regla: una capa apagada no figura en la leyenda');
const capa = (over) => ({
    id: 'hidro', title: 'Hidrografía', visible: true,
    legend: { showInLegend: true, hideInLegend: false },
    ...over
});
test('capa activa y visible: en la leyenda', () => {
    eq(shouldShowInLegend(capa({}), { isVisible: true }), true);
});
test('capa apagada en el modelo: fuera', () => {
    eq(shouldShowInLegend(capa({ visible: false }), { isVisible: true }), false);
});
test('capa apagada en el mapa: fuera', () => {
    eq(shouldShowInLegend(capa({}), { isVisible: false }), false);
});
test('capa marcada como oculta de la leyenda: fuera', () => {
    eq(shouldShowInLegend(capa({ legend: { showInLegend: true, hideInLegend: true } }), { isVisible: true }), false);
});
test('capa con el toggle de leyenda apagado: fuera', () => {
    eq(shouldShowInLegend(capa({ legend: { showInLegend: false, hideInLegend: false } }), { isVisible: true }), false);
});
test('el toggle de leyenda prendido por defecto muestra la capa', () => {
    eq(shouldShowInLegend(capa({ legend: {} }), { isVisible: true }), true);
});
test('nodo nulo: fuera (no rompe)', () => eq(shouldShowInLegend(null, {}), false));

// ─── Descripción ──────────────────────────────────────────────────────────────
console.log('\n6) Descripción legible');
test('desactivada', () => eq(describeRefState({}), 'Desactivada'));
test('solo remota', () => eq(describeRefState({ remotaEnabled: true }), 'Solo capa remota (encima del mapa base)'));
test('solo visual', () => eq(describeRefState({ visualEnabled: true }), 'Solo capa visual'));
test('ambas', () => eq(describeRefState({ visualEnabled: true, remotaEnabled: true }), 'Visual + remota activas'));

// ─── Caso real del usuario ────────────────────────────────────────────────────
console.log('\n7) Caso real: apagar la leyenda de una capa la quita');
test('prender y apagar el toggle de leyenda', () => {
    let n = capa({});
    eq(shouldShowInLegend(n, { isVisible: true }), true);
    n = capa({ legend: { showInLegend: false, hideInLegend: false } });
    eq(shouldShowInLegend(n, { isVisible: true }), false);
});
test('la referencia remota sola, sin leyenda', () => {
    const c = { remotaEnabled: true, remotaOpacity: 0.7 };
    eq(refRemotaVisible(c), true);
    eq(refVisualVisible(c), false);
    eq(refInLegend(c), false);
    eq(refRemotaOnTop(c), true);
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);
