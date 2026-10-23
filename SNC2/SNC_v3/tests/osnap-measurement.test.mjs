/**
 * tests/osnap-measurement.test.mjs
 * Pruebas unitarias para Osnap / Refent (F3) y Osnap Tracking (F11)
 * Validación de acotamiento milimétrico de alta precisión para parcelas catastrales.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SNAP_TYPES,
    SNAP_STYLES,
    findSegmentIntersections,
    calculatePolygonCentroid,
    extractSnapCandidates,
    findSnapPoint,
    calculateTrackingProjection,
    OsnapManager
} from '../js/osnapManager.js';

test('Osnap - Definición de constantes y estilos CAD para puntos críticos', () => {
    assert.equal(SNAP_TYPES.ENDPOINT, 'endpoint');
    assert.equal(SNAP_TYPES.MIDPOINT, 'midpoint');
    assert.equal(SNAP_TYPES.CENTER, 'center');
    assert.equal(SNAP_TYPES.INTERSECTION, 'intersection');

    assert.ok(SNAP_STYLES[SNAP_TYPES.ENDPOINT].symbol, 'Endpoint debe tener símbolo');
    assert.ok(SNAP_STYLES[SNAP_TYPES.MIDPOINT].symbol, 'Midpoint debe tener símbolo');
    assert.ok(SNAP_STYLES[SNAP_TYPES.CENTER].symbol, 'Center debe tener símbolo');
    assert.ok(SNAP_STYLES[SNAP_TYPES.INTERSECTION].symbol, 'Intersection debe tener símbolo');
});

test('Osnap - Cálculo geométrico exacto de intersección entre segmentos', () => {
    // Segmento horizontal de (0, 5) a (10, 5)
    const segA = [[0, 5], [10, 5]];
    // Segmento vertical de (5, 0) a (5, 10)
    const segB = [[5, 0], [5, 10]];

    const inter = findSegmentIntersections(segA, segB);
    assert.ok(inter, 'Debe encontrar intersección');
    assert.equal(inter[0], 5, 'X de intersección debe ser 5');
    assert.equal(inter[1], 5, 'Y de intersección debe ser 5');

    // Segmentos paralelos no deben intersecarse
    const segC = [[0, 0], [10, 0]];
    const segD = [[0, 2], [10, 2]];
    assert.equal(findSegmentIntersections(segC, segD), null, 'Segmentos paralelos retornan null');

    // Segmentos que no se cruzan en el tramo
    const segE = [[0, 0], [2, 2]];
    const segF = [[5, 5], [10, 10]];
    assert.equal(findSegmentIntersections(segE, segF), null, 'Segmentos no intersectados retornan null');
});

test('Osnap - Cálculo de centroide de polígono', () => {
    // Cuadrado de 10x10 con base en origen
    const ring = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0]
    ];
    const centroid = calculatePolygonCentroid(ring);
    assert.equal(Math.round(centroid[0]), 5, 'Centroide X debe ser 5');
    assert.equal(Math.round(centroid[1]), 5, 'Centroide Y debe ser 5');
});

test('Osnap - Extracción completa de candidatos (Extremos, Puntos medios, Centro, Intersección)', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                id: 'PARCELA_1',
                properties: { CODIGO: '11-0001-01', PADRON: '1001' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-57.0, -25.0],
                        [-56.9, -25.0],
                        [-56.9, -25.1],
                        [-57.0, -25.1],
                        [-57.0, -25.0]
                    ]]
                }
            }
        ]
    };

    const candidates = extractSnapCandidates(geojson);
    assert.ok(candidates.length > 0, 'Debe extraer candidatos');

    const endpoints = candidates.filter(c => c.type === SNAP_TYPES.ENDPOINT);
    const midpoints = candidates.filter(c => c.type === SNAP_TYPES.MIDPOINT);
    const centers = candidates.filter(c => c.type === SNAP_TYPES.CENTER);

    assert.equal(endpoints.length, 4, 'Cuadrilátero debe tener 4 extremos');
    assert.equal(midpoints.length, 4, 'Cuadrilátero debe tener 4 puntos medios');
    assert.equal(centers.length, 1, 'Cuadrilátero debe tener 1 centro');

    // Verificar coordenadas matemáticas exactas de un punto medio
    const topMid = midpoints.find(m => Math.abs(m.lat - (-25.0)) < 1e-6);
    assert.ok(topMid, 'Debe existir punto medio superior');
    assert.equal(topMid.lng, -56.95, 'Punto medio lng debe ser -56.95');
});

test('Osnap - Detección de intersección entre polígonos colindantes o cruzados', () => {
    // Dos líneas diagonales que forman una X
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0], [10, 10]]
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 10], [10, 0]]
                }
            }
        ]
    };

    const candidates = extractSnapCandidates(geojson);
    const intersections = candidates.filter(c => c.type === SNAP_TYPES.INTERSECTION);
    assert.equal(intersections.length, 1, 'Debe encontrar 1 intersección');
    assert.equal(intersections[0].lng, 5, 'Intersección lng = 5');
    assert.equal(intersections[0].lat, 5, 'Intersección lat = 5');
});

test('Osnap - Snapping magnético por proximidad del cursor (findSnapPoint)', () => {
    const candidates = [
        { type: SNAP_TYPES.ENDPOINT, lng: -57.123456, lat: -25.654321 },
        { type: SNAP_TYPES.MIDPOINT, lng: -57.200000, lat: -25.700000 }
    ];

    // Cursor muy cerca del primer candidato (dentro de tolerancia)
    const cursorNear = { lng: -57.123458, lat: -25.654320 };
    const snap = findSnapPoint(cursorNear, candidates, { tolerancePx: 20 });
    assert.ok(snap, 'Debe anclar al punto más cercano');
    assert.equal(snap.type, SNAP_TYPES.ENDPOINT);
    assert.equal(snap.lng, -57.123456, 'Debe retornar la coordenada matemática exacta del dibujo');

    // Cursor lejano (fuera de tolerancia)
    const cursorFar = { lng: -56.000000, lat: -24.000000 };
    const snapFar = findSnapPoint(cursorFar, candidates, { tolerancePx: 10 });
    assert.equal(snapFar, null, 'Fuera de tolerancia debe devolver null');
});

test('Osnap Tracking - Proyección de líneas guía vectoriales imaginarias (Horizontal y Vertical)', () => {
    const anchor = { lng: -57.500000, lat: -25.300000 };

    // Cursor desplazado horizontalmente (misma latitud aprox, distinta longitud)
    const cursorHorizontal = { lng: -57.505000, lat: -25.300001 };
    const trackH = calculateTrackingProjection(anchor, cursorHorizontal, { tolerancePx: 15 });
    assert.ok(trackH, 'Debe proyectar guía horizontal');
    assert.equal(trackH.axis, 'horizontal');
    assert.equal(trackH.projected.lat, -25.300000, 'Debe alinear perfectamente la latitud con el ancla');

    // Cursor desplazado verticalmente (misma longitud aprox, distinta latitud)
    const cursorVertical = { lng: -57.500002, lat: -25.308000 };
    const trackV = calculateTrackingProjection(anchor, cursorVertical, { tolerancePx: 15 });
    assert.ok(trackV, 'Debe proyectar guía vertical');
    assert.equal(trackV.axis, 'vertical');
    assert.equal(trackV.projected.lng, -57.500000, 'Debe alinear perfectamente la longitud con el ancla');
});

test('OsnapManager - Instancia, conmutación F3 (Osnap) y F11 (Tracking)', () => {
    const manager = new OsnapManager(null, { enabled: true, osnapEnabled: true, trackingEnabled: true });

    assert.equal(manager.osnapEnabled, true, 'Osnap debe iniciar activo');
    assert.equal(manager.trackingEnabled, true, 'Tracking debe iniciar activo');

    // Simular toggle F3
    const newStateOsnap = manager.toggleOsnap();
    assert.equal(newStateOsnap, false, 'Toggle Osnap debe cambiar a false');
    assert.equal(manager.toggleOsnap(true), true, 'Forzar Osnap true');

    // Simular toggle F11
    const newStateTrack = manager.toggleTracking();
    assert.equal(newStateTrack, false, 'Toggle Tracking debe cambiar a false');
    assert.equal(manager.toggleTracking(true), true, 'Forzar Tracking true');

    // Asignación de ancla
    manager.setAnchor({ lat: -25.5, lng: -57.5 });
    assert.deepEqual(manager.lastAcquiredAnchor, { lat: -25.5, lng: -57.5 });

    manager.destroy();
});
