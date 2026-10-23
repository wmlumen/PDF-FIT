/**
 * Tests del LayerManager (js/layerManager.js) — spec Tabla de Contenido tipo ArcGIS.
 * Ejecutar: node tests/layer-manager.test.mjs
 */
import assert from 'node:assert/strict';
import {
    LayerManager, zoomToScale, scaleToZoom, formatScale, CONTENT_MODES
} from '../js/layerManager.js';

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`  ok   ${name}`); pass++; }
    catch (e) { console.log(`  FAIL ${name}\n       ${e.message}`); fail++; }
}
function fresh() { LayerManager.reset(); return LayerManager; }

console.log('\n=== LayerManager — jerarquía, cascada, escala, tabla ===\n');

console.log('1) Escala: zoom ↔ denominador');
t('zoomToScale crece al alejarse (zoom menor)', () => {
    assert.ok(zoomToScale(10) > zoomToScale(15), 'zoom 10 debe dar escala mayor');
});
t('zoomToScale en el ecuador, zoom 0 = ~5.9e8', () => {
    const s = zoomToScale(0, 0);
    assert.ok(s > 5e8 && s < 6e8, `s=${s}`);
});
t('scaleToZoom es el inverso de zoomToScale', () => {
    for (const z of [8, 12, 15, 18]) {
        const s = zoomToScale(z, -25.45);
        const back = scaleToZoom(s, -25.45);
        assert.ok(Math.abs(back - z) < 1e-9, `zoom ${z} -> escala ${s} -> ${back}`);
    }
});
t('la latitud afecta la escala (Mercator)', () => {
    assert.ok(zoomToScale(15, -25) < zoomToScale(15, 0), 'a mayor latitud, menor escala');
});
t('formatScale usa separador de miles', () => {
    assert.equal(formatScale(50000), '1:50.000');
    assert.equal(formatScale(null), '—');
});
t('CONTENT_MODES tiene los 6 modos del spec', () => {
    assert.equal(CONTENT_MODES.length, 6);
    const ids = CONTENT_MODES.map(m => m.id);
    for (const need of ['drawing','source','selection','editing','snapping','labeling']) {
        assert.ok(ids.includes(need), `falta modo ${need}`);
    }
});

console.log('\n2) Registro y jerarquía');
t('registrar capa raíz', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'barrios', title: 'Barrios' });
    assert.equal(lm.get('barrios').title, 'Barrios');
    assert.equal(lm.get('barrios').kind, 'layer');
    assert.deepEqual(lm.roots, ['barrios']);
});
t('registrar grupo y anidar capas', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g_sig', title: 'Información SIG' });
    lm.registerLayer({ id: 'vias', title: 'Vías', parentId: 'g_sig' });
    lm.registerLayer({ id: 'hidro', title: 'Hidrografía', parentId: 'g_sig' });
    assert.deepEqual(lm.get('g_sig').children, ['vias','hidro']);
    assert.deepEqual(lm.roots, ['g_sig']);
    assert.equal(lm.get('vias').parentId, 'g_sig');
});
t('grupos anidados (subgrupos)', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g_infra', title: 'Infraestructura' });
    lm.registerGroup({ id: 'g_vial', title: 'Red Vial', parentId: 'g_infra' });
    lm.registerLayer({ id: 'pavimento', title: 'Pavimento', parentId: 'g_vial' });
    lm.registerLayer({ id: 'tierra', title: 'Tierra', parentId: 'g_vial' });
    assert.deepEqual(lm.get('g_infra').children, ['g_vial']);
    assert.deepEqual(lm.get('g_vial').children, ['pavimento','tierra']);
    assert.equal(lm.get('pavimento').parentId, 'g_vial');
});
t('re-registrar preserva la configuración del usuario', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'barrios', title: 'Barrios', featureCount: 34 });
    lm.setOpacity('barrios', 0.5);
    lm.rename('barrios', 'Mis Barrios');
    lm.registerLayer({ id: 'barrios', title: 'Barrios', featureCount: 99 });
    assert.equal(lm.get('barrios').opacity, 0.5, 'opacidad debe preservarse');
    assert.equal(lm.get('barrios').title, 'Mis Barrios', 'alias debe preservarse');
    assert.equal(lm.get('barrios').featureCount, 99, 'featureCount debe refrescarse');
});
t('remove elimina el grupo y toda su descendencia', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.registerGroup({ id: 'g2', title: 'G2', parentId: 'g' });
    lm.registerLayer({ id: 'b', title: 'B', parentId: 'g2' });
    assert.equal(lm.all().length, 4);
    lm.remove('g');
    assert.equal(lm.all().length, 0, 'debe borrar los 4');
    assert.deepEqual(lm.roots, []);
});

console.log('\n3) Visibilidad en cascada (spec §1.1)');
t('apagar un grupo oculta toda su descendencia', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.registerLayer({ id: 'b', title: 'B', parentId: 'g' });
    lm.setVisible('g', false);
    assert.equal(lm.get('a').visible, false);
    assert.equal(lm.get('b').visible, false);
    assert.equal(lm.get('g').visible, false);
});
t('encender el grupo RESTAURA el estado individual previo', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.registerLayer({ id: 'b', title: 'B', parentId: 'g' });
    lm.setVisible('b', false);              // b apagada por el usuario
    lm.setVisible('g', false);              // apagar grupo
    lm.setVisible('g', true);               // volver a encender
    assert.equal(lm.get('a').visible, true, 'a debe volver encendida');
    assert.equal(lm.get('b').visible, false, 'b debe seguir apagada (estado previo)');
});
t('encender una hija marca el grupo como visible', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.setVisible('g', false);
    assert.equal(lm.get('g').visible, false);
    lm.setVisible('a', true);
    assert.equal(lm.get('g').visible, true, 'el grupo debe reflejar que hay una hija visible');
});
t('la propagación asciende por varios niveles', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g1', title: 'Nivel 1' });
    lm.registerGroup({ id: 'g2', title: 'Nivel 2', parentId: 'g1' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g2' });
    lm.setVisible('g1', false);
    assert.equal(lm.get('g1').visible, false);
    lm.setVisible('a', true);
    assert.equal(lm.get('g2').visible, true);
    assert.equal(lm.get('g1').visible, true, 'debe propagar hasta la raíz');
});
t('toggleVisible alterna', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.equal(lm.get('a').visible, true);
    lm.toggleVisible('a');
    assert.equal(lm.get('a').visible, false);
});

console.log('\n4) Rango de escala y estado visual (spec §1.1)');
t('isInScaleRange respeta minScale/maxScale', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setScaleRange('a', { minScale: 50000, maxScale: 500 });
    lm.setCurrentScale(10000);
    assert.equal(lm.isInScaleRange('a'), true, '10000 está entre 500 y 50000');
    lm.setCurrentScale(100000);
    assert.equal(lm.isInScaleRange('a'), false, '100000 es más alejado que minScale 50000');
    lm.setCurrentScale(100);
    assert.equal(lm.isInScaleRange('a'), false, '100 es más cercano que maxScale 500');
});
t('sin rango definido siempre está en rango', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setCurrentScale(1);
    assert.equal(lm.isInScaleRange('a'), true);
});
t('visualState: active / inactive / disabled', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setScaleRange('a', { minScale: 50000, maxScale: 500 });
    lm.setCurrentScale(10000);
    assert.equal(lm.visualState('a'), 'active');
    lm.setVisible('a', false);
    assert.equal(lm.visualState('a'), 'inactive');
    lm.setVisible('a', true);
    lm.setCurrentScale(100000);
    assert.equal(lm.visualState('a'), 'disabled', 'fuera de rango = atenuado');
});
t('activeLayers excluye las fuera de escala', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.registerLayer({ id: 'b', title: 'B' });
    lm.setScaleRange('b', { minScale: 1000, maxScale: null });
    lm.setCurrentScale(50000);
    const ids = lm.activeLayers().map(n => n.id);
    assert.deepEqual(ids, ['a'], 'b está fuera de rango a escala 50000');
});

console.log('\n5) Renombrar con doble clic (spec §1.1)');
t('rename cambia el título y guarda el original', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Barrios' });
    lm.rename('a', 'Barrios Urbanos');
    assert.equal(lm.get('a').title, 'Barrios Urbanos');
    assert.equal(lm.get('a').originalTitle, 'Barrios');
});
t('rename con cadena vacía revierte al original', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Barrios' });
    lm.rename('a', 'Otro');
    lm.rename('a', '   ');
    assert.equal(lm.get('a').title, 'Barrios');
});
t('resetTitle restaura el original', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'Barrios' });
    lm.rename('a', 'X');
    lm.resetTitle('a');
    assert.equal(lm.get('a').title, 'Barrios');
});

console.log('\n6) Opacidad, capacidades y modos');
t('setOpacity acota a [0,1]', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setOpacity('a', 1.5);
    assert.equal(lm.get('a').opacity, 1);
    lm.setOpacity('a', -0.3);
    assert.equal(lm.get('a').opacity, 0);
    lm.setOpacity('a', 0.42);
    assert.equal(lm.get('a').opacity, 0.42);
});
t('setMode acepta solo modos válidos', () => {
    const lm = fresh();
    assert.equal(lm.setMode('source'), true);
    assert.equal(lm.mode, 'source');
    assert.equal(lm.setMode('inventado'), false);
    assert.equal(lm.mode, 'source', 'no debe cambiar con un modo inválido');
});
t('capacidades por modo filtran correctamente', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A', editable: true });
    lm.registerLayer({ id: 'b', title: 'B', editable: false });
    lm.registerLayer({ id: 'c', title: 'C', selectable: false });
    assert.deepEqual(lm.editableLayers().map(n => n.id), ['a']);
    assert.deepEqual(lm.selectableLayers().map(n => n.id).sort(), ['a','b']);
    assert.deepEqual(lm.snappableLayers().map(n => n.id).sort(), ['a','b','c']);
});

console.log('\n7) Leyenda (spec §2.1)');
t('legendLayers filtra por visibilidad y rango', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.registerLayer({ id: 'b', title: 'B' });
    lm.setVisible('b', false);
    assert.deepEqual(lm.legendLayers().map(n => n.id), ['a']);
});
t('legendLayers excluye hideInLegend', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.registerLayer({ id: 'b', title: 'B' });
    lm.get('b').legend.hideInLegend = true;
    assert.deepEqual(lm.legendLayers().map(n => n.id), ['a']);
});
t('legendLayers excluye basemaps y auxiliares', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'osm', title: 'OSM', sourceType: 'basemap' });
    lm.registerLayer({ id: 'nota', title: 'Nota', sourceType: 'auxiliar' });
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.deepEqual(lm.legendLayers().map(n => n.id), ['a']);
});
t('legendLayers respeta el rango de escala', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setScaleRange('a', { minScale: 1000, maxScale: null });
    lm.setCurrentScale(50000);
    assert.deepEqual(lm.legendLayers().map(n => n.id), []);
});

console.log('\n8) Agrupación por origen (modo List By Source)');
t('bySource agrupa por sourcePath', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A', sourcePath: 'data/piribebuy' });
    lm.registerLayer({ id: 'b', title: 'B', sourcePath: 'data/piribebuy' });
    lm.registerLayer({ id: 'c', title: 'C', sourcePath: 'data/otro' });
    const groups = lm.bySource();
    assert.equal(groups.length, 2);
    const pir = groups.find(g => g.source === 'data/piribebuy');
    assert.equal(pir.layers.length, 2);
});

console.log('\n9) Orden de dibujo');
t('reorder mueve un nodo dentro de su padre', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.registerLayer({ id: 'b', title: 'B' });
    lm.registerLayer({ id: 'c', title: 'C' });
    assert.deepEqual(lm.roots, ['a','b','c']);
    lm.reorder('c', 0);
    assert.deepEqual(lm.roots, ['c','a','b']);
});
t('walk recorre en orden con profundidad', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.registerLayer({ id: 'b', title: 'B' });
    const seen = [];
    lm.walk((n, d) => seen.push(`${n.id}@${d}`));
    assert.deepEqual(seen, ['g@0','a@1','b@0']);
});

console.log('\n10) Tabla de atributos (spec §3)');
t('setTableConfig y orden por columna', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setTableConfig('a', { sortField: 'padron', sortOrder: 'DESC' });
    assert.equal(lm.get('a').tableConfig.sortField, 'padron');
    assert.equal(lm.get('a').tableConfig.sortOrder, 'DESC');
});
t('setSelection guarda los ids seleccionados', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setSelection('a', [1,2,3]);
    assert.deepEqual(lm.get('a').tableConfig.selectedIds, [1,2,3]);
    lm.setSelection('a', []);
    assert.deepEqual(lm.get('a').tableConfig.selectedIds, []);
});
t('pageSize por defecto 50', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.equal(lm.get('a').tableConfig.pageSize, 50);
});
t('columnas ocultas y orden de columnas', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setTableConfig('a', { hiddenColumns: ['gid'], columnOrder: ['padron','finca'] });
    assert.deepEqual(lm.get('a').tableConfig.hiddenColumns, ['gid']);
    assert.deepEqual(lm.get('a').tableConfig.columnOrder, ['padron','finca']);
});

console.log('\n11) Configuración de popups (spec §5)');
t('setPopupConfig guarda título y campos', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setPopupConfig('a', {
        title: '{padron}',
        fields: [
            { fieldName: 'gid', label: 'ID Interno', visible: false },
            { fieldName: 'padron', label: 'Padrón', visible: true }
        ]
    });
    const p = lm.get('a').popupInfo;
    assert.equal(p.title, '{padron}');
    assert.equal(p.fields.length, 2);
});
t('setPopupFieldVisible alterna un campo', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setPopupConfig('a', { title: 'x', fields: [{ fieldName: 'gid', visible: false }] });
    lm.setPopupFieldVisible('a', 'gid', true);
    assert.equal(lm.get('a').popupInfo.fields[0].visible, true);
});

console.log('\n12) Serialización (spec §5)');
t('toJSON produce la estructura del spec', () => {
    const lm = fresh();
    lm.registerLayer({ id: 'catastro_distrital', title: 'Parcelas Urbanas',
        minScale: 50000, maxScale: 500, sourcePath: 'data/catastro' });
    lm.setPopupConfig('catastro_distrital', {
        title: '{padron}',
        fields: [{ fieldName: 'padron', label: 'Padrón', visible: true }]
    });
    const j = lm.toJSON();
    assert.ok(Array.isArray(j.nodes));
    const n = j.nodes[0];
    assert.equal(n.layerId, 'catastro_distrital');
    assert.equal(n.title, 'Parcelas Urbanas');
    assert.equal(n.visible, true);
    assert.equal(n.minScale, 50000);
    assert.equal(n.maxScale, 500);
    assert.equal(n.popupInfo.title, '{padron}');
    assert.equal(n.tableConfig.pageSize, 50);
});
t('fromJSON restaura el estado completo', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'Grupo' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.rename('a', 'Alias A');
    lm.setOpacity('a', 0.3);
    lm.setVisible('a', false);
    const snapshot = JSON.parse(JSON.stringify(lm.toJSON()));

    const lm2 = fresh();
    lm2.fromJSON(snapshot);
    assert.equal(lm2.get('a').title, 'Alias A');
    assert.equal(lm2.get('a').opacity, 0.3);
    assert.equal(lm2.get('a').visible, false);
    assert.equal(lm2.get('a').parentId, 'g');
    assert.deepEqual(lm2.get('g').children, ['a']);
});
t('round-trip toJSON/fromJSON es estable', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g', title: 'G' });
    lm.registerLayer({ id: 'a', title: 'A', parentId: 'g' });
    lm.setTableConfig('a', { sortField: 'x', sortOrder: 'DESC', hiddenColumns: ['y'] });
    const j1 = lm.toJSON();
    const lm2 = fresh();
    lm2.fromJSON(j1);
    const j2 = lm2.toJSON();
    assert.deepEqual(j2.nodes.map(n=>n.layerId).sort(), j1.nodes.map(n=>n.layerId).sort());
    const a1 = j1.nodes.find(n=>n.layerId==='a');
    const a2 = j2.nodes.find(n=>n.layerId==='a');
    assert.equal(a2.tableConfig.sortField, a1.tableConfig.sortField);
    assert.equal(a2.tableConfig.sortOrder, a1.tableConfig.sortOrder);
    assert.deepEqual(a2.tableConfig.hiddenColumns, a1.tableConfig.hiddenColumns);
});
t('fromJSON tolera datos incompletos', () => {
    const lm = fresh();
    assert.equal(lm.fromJSON({ nodes: [{ layerId: 'x' }] }), true);
    assert.ok(lm.get('x'));
    assert.equal(lm.fromJSON(null), false);
    assert.equal(lm.fromJSON({}), false);
});

console.log('\n13) Eventos');
t('on("change") recibe los cambios', () => {
    const lm = fresh();
    let count = 0;
    const off = lm.on('change', () => count++);
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.ok(count > 0, 'debe notificar el registro');
    off();
    const before = count;
    lm.registerLayer({ id: 'b', title: 'B' });
    assert.equal(count, before, 'tras desuscribir no debe notificar');
});
t('on("visibility") recibe el cambio de visibilidad', () => {
    const lm = fresh();
    let payload = null;
    lm.on('visibility', (p) => payload = p);
    lm.registerLayer({ id: 'a', title: 'A' });
    lm.setVisible('a', false);
    assert.equal(payload.id, 'a');
    assert.equal(payload.visible, false);
});
t('un callback que lanza no rompe el modelo', () => {
    const lm = fresh();
    lm.on('change', () => { throw new Error('boom'); });
    lm.registerLayer({ id: 'a', title: 'A' });
    assert.ok(lm.get('a'), 'el modelo debe seguir funcionando');
});

console.log('\n14) Caso real: jerarquía de Piribebuy');
t('monta el árbol completo con grupos y verifica cascada', () => {
    const lm = fresh();
    lm.registerGroup({ id: 'g_piri', title: 'Piribebuy' });
    lm.registerGroup({ id: 'g_base', title: 'Base territorial', parentId: 'g_piri' });
    lm.registerLayer({ id: 'barrios', title: 'Barrios', parentId: 'g_base', sourcePath: 'data/piribebuy' });
    lm.registerLayer({ id: 'vias', title: 'Vías', parentId: 'g_base', sourcePath: 'data/piribebuy' });
    lm.registerLayer({ id: 'hidro', title: 'Hidrografía', parentId: 'g_base', sourcePath: 'data/piribebuy' });
    lm.registerGroup({ id: 'g_vert', title: 'Vertedero', parentId: 'g_piri' });
    lm.registerLayer({ id: 'vertedero', title: 'Vertedero', parentId: 'g_vert' });
    lm.registerLayer({ id: 'centro', title: 'Centro', parentId: 'g_vert' });
    lm.registerLayer({ id: 'vertedero_500', title: 'Buffer 500', parentId: 'g_vert' });

    // 3 grupos (g_piri, g_base, g_vert) + 6 capas = 9 nodos
    assert.equal(lm.all().length, 9);
    assert.equal(lm.groups().length, 3);
    assert.equal(lm.layers().length, 6);
    assert.equal(lm.get('g_piri').children.length, 2);

    // Apagar solo el subgrupo vertedero
    lm.setVisible('g_vert', false);
    assert.equal(lm.get('vertedero').visible, false);
    assert.equal(lm.get('centro').visible, false);
    assert.equal(lm.get('barrios').visible, true, 'el otro subgrupo no debe afectarse');
    assert.equal(lm.get('g_piri').visible, true, 'el padre sigue visible por g_base');

    // Apagar todo Piribebuy
    lm.setVisible('g_piri', false);
    assert.equal(lm.get('barrios').visible, false);
    assert.equal(lm.get('vertedero').visible, false);

    // Reencender: barrios vuelve, vertedero sigue apagado
    lm.setVisible('g_piri', true);
    assert.equal(lm.get('barrios').visible, true);
    assert.equal(lm.get('vertedero').visible, false, 'estado previo preservado');
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTADO: ${pass} ok, ${fail} fallos`);
console.log('='.repeat(60) + '\n');
process.exit(fail ? 1 : 0);
