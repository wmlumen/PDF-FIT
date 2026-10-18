import assert from 'node:assert/strict';
import { calculateRingSegments, formatMeters } from '../js/segmentLengths.js';
const segments = calculateRingSegments([[0,0],[3000,0],[3000,4000],[0,0]]);
assert.equal(segments.length, 3);
assert.equal(segments[0].lengthMeters, 3000);
assert.equal(segments[1].lengthMeters, 4000);
assert.equal(segments[2].lengthMeters, 5000);
assert.match(formatMeters(1234.56), /1[.\s]234,56/);
console.log('✅ SEGMENT LENGTH TESTS: 5/5 pasaron');
