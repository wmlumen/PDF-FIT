/**
 * tests/layer-stacking.test.mjs
 * Validación de Jerarquía de Apilamiento (Leaflet Panes) y Agrupación por Servidor/Tema
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// Mock de entorno de navegador si no existe
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        getElementById: () => null,
        body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } }
    };
}

const { LAYER_PANES, setupMapPanes } = await import('../js/mapEngine.js');
const { LayerManager } = await import('../js/layerManager.js');

test('Leaflet Panes - Definición de 7 niveles con prelación estricta Z-Index', () => {
    assert.ok(LAYER_PANES.BASE, 'Debe existir pane-base');
    assert.ok(LAYER_PANES.PARAGUAY, 'Debe existir pane-paraguay');
    assert.ok(LAYER_PANES.MAG, 'Debe existir pane-mag');
    assert.ok(LAYER_PANES.MADES, 'Debe existir pane-mades');
    assert.ok(LAYER_PANES.CATASTRO, 'Debe existir pane-catastro');
    assert.ok(LAYER_PANES.MUNICIPAL, 'Debe existir pane-municipal');
    assert.ok(LAYER_PANES.USUARIO, 'Debe existir pane-usuario');

    // Jerarquía estricta:
    // Base (200) < Paraguay (300) < MAG (400) < MADES (500) < Catastro (600) < Municipio (700) < Usuario (800)
    assert.equal(LAYER_PANES.BASE.zIndex, 200);
    assert.equal(LAYER_PANES.PARAGUAY.zIndex, 300);
    assert.equal(LAYER_PANES.MAG.zIndex, 400);
    assert.equal(LAYER_PANES.MADES.zIndex, 500);
    assert.equal(LAYER_PANES.CATASTRO.zIndex, 600);
    assert.equal(LAYER_PANES.MUNICIPAL.zIndex, 700);
    assert.equal(LAYER_PANES.USUARIO.zIndex, 800);

    assert.ok(LAYER_PANES.USUARIO.zIndex > LAYER_PANES.MUNICIPAL.zIndex);
    assert.ok(LAYER_PANES.MUNICIPAL.zIndex > LAYER_PANES.CATASTRO.zIndex);
    assert.ok(LAYER_PANES.CATASTRO.zIndex > LAYER_PANES.MADES.zIndex);
    assert.ok(LAYER_PANES.MADES.zIndex > LAYER_PANES.MAG.zIndex);
    assert.ok(LAYER_PANES.MAG.zIndex > LAYER_PANES.PARAGUAY.zIndex);
    assert.ok(LAYER_PANES.PARAGUAY.zIndex > LAYER_PANES.BASE.zIndex);
});

test('Leaflet Panes - setupMapPanes crea y configura los panes con sus respectivos z-index', () => {
    const panesCreated = {};
    const mockMap = {
        getPane: (name) => panesCreated[name] || null,
        createPane: (name) => {
            const pane = { style: {} };
            panesCreated[name] = pane;
            return pane;
        }
    };

    setupMapPanes(mockMap);

    assert.equal(Object.keys(panesCreated).length, 7);
    assert.equal(panesCreated['pane-base'].style.zIndex, 200);
    assert.equal(panesCreated['pane-paraguay'].style.zIndex, 300);
    assert.equal(panesCreated['pane-mag'].style.zIndex, 400);
    assert.equal(panesCreated['pane-mades'].style.zIndex, 500);
    assert.equal(panesCreated['pane-catastro'].style.zIndex, 600);
    assert.equal(panesCreated['pane-municipal'].style.zIndex, 700);
    assert.equal(panesCreated['pane-usuario'].style.zIndex, 800);
});

test('LayerManager - Agrupación flexible por Servidor (byServer) y por Tema (byTheme)', () => {
    LayerManager.reset();

    LayerManager.registerLayer({
        id: 'parcelas-expediente',
        title: 'Parcelas en Trámite',
        server: 'Local / Usuario',
        theme: 'Usuario'
    });

    LayerManager.registerLayer({
        id: 'depto-paraguay',
        title: 'Departamentos Nacionales',
        server: 'INE / Geodésico',
        theme: 'Nacional'
    });

    LayerManager.registerLayer({
        id: 'mag-cultivos',
        title: 'Cultivos Temporales',
        server: 'MAG',
        theme: 'Agropecuario'
    });

    LayerManager.registerLayer({
        id: 'mades-sinasip',
        title: 'Áreas Protegidas',
        server: 'MADES',
        theme: 'Ambiental'
    });

    LayerManager.registerLayer({
        id: 'snc-catastro',
        title: 'Catastro Oficial WMS',
        server: 'SNC',
        theme: 'Catastral'
    });

    // Probar byServer()
    const byServer = LayerManager.byServer();
    assert.ok(Array.isArray(byServer));
    const servers = byServer.map(s => s.server);
    assert.ok(servers.includes('Local / Usuario'));
    assert.ok(servers.includes('MAG'));
    assert.ok(servers.includes('MADES'));
    assert.ok(servers.includes('SNC'));

    // Probar byTheme()
    const byTheme = LayerManager.byTheme();
    assert.ok(Array.isArray(byTheme));
    const themes = byTheme.map(t => t.theme);
    assert.ok(themes.includes('Usuario'));
    assert.ok(themes.includes('Nacional'));
    assert.ok(themes.includes('Agropecuario'));
    assert.ok(themes.includes('Ambiental'));
    assert.ok(themes.includes('Catastral'));
});
