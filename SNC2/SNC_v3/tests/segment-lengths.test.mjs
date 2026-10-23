import assert from 'node:assert/strict';
import { calculateRingSegments, formatMeters, calculateCotaPosition } from '../js/segmentLengths.js';

const segments = calculateRingSegments([[0,0],[3000,0],[3000,4000],[0,0]]);
assert.equal(segments.length, 3);
assert.equal(segments[0].lengthMeters, 3000);
assert.equal(segments[1].lengthMeters, 4000);
assert.equal(segments[2].lengthMeters, 5000);
assert.match(formatMeters(1234.56), /1[.\s]234,56/);

// Pruebas unitarias de calculateCotaPosition
const squareFeature = {
    type: 'Feature',
    properties: { PADRON: '123' },
    geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
    }
};

const bottomSegment = {
    start: [0, 0],
    end: [100, 0],
    midpoint: [50, 0],
    lengthMeters: 100
};

// 1. Modo 'inside' (interno): debe desplazarse hacia y > 0 (hacia el interior del cuadrado)
const posInside = calculateCotaPosition({
    segment: bottomSegment,
    feature: squareFeature,
    mode: 'inside',
    offsetPixels: 10
});
assert.equal(posInside.mode, 'inside');
assert.ok(posInside.offset[1] > 0, 'Modo inside debe desplazarse hacia el interior (y > 0)');

// 2. Modo 'outside' (externo): debe desplazarse hacia y < 0 (hacia el exterior del cuadrado)
const posOutside = calculateCotaPosition({
    segment: bottomSegment,
    feature: squareFeature,
    mode: 'outside',
    offsetPixels: 10
});
assert.equal(posOutside.mode, 'outside');
assert.ok(posOutside.offset[1] < 0, 'Modo outside debe desplazarse hacia el exterior (y < 0)');

// 3. Modo 'above': en cartesiano estándar debe tener offset positivo en Y
const posAbove = calculateCotaPosition({
    segment: bottomSegment,
    feature: squareFeature,
    mode: 'above',
    offsetPixels: 12
});
assert.ok(posAbove.offset[1] > 0, 'Modo above debe desplazarse encima de la línea');

// 4. Modo 'below': en cartesiano estándar debe tener offset negativo en Y
const posBelow = calculateCotaPosition({
    segment: bottomSegment,
    feature: squareFeature,
    mode: 'below',
    offsetPixels: 12
});
assert.ok(posBelow.offset[1] < 0, 'Modo below debe desplazarse debajo de la línea');

// 5. Modo 'auto' (anti-solapamiento): verifica que calcule offset no nulo
const posAuto = calculateCotaPosition({
    segment: bottomSegment,
    feature: squareFeature,
    mode: 'auto',
    offsetPixels: 14
});
assert.equal(posAuto.mode, 'auto');
assert.notEqual(posAuto.offset[1], 0, 'Modo auto debe aplicar separación para no solapar');

console.log('✅ SEGMENT LENGTH TESTS: 10/10 pasaron');
