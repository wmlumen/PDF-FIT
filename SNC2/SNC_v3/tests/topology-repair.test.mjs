import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import { buildTopologyRepairPreview, cleanRing } from '../js/topologyRepair.js';

assert.deepEqual(cleanRing([[0,0],[1,0],[1,0],[1,1],[0,0]]), [[0,0],[1,0],[1,1],[0,0]]);
assert.throws(() => cleanRing([[0,0],[0,0]]));

const overlapping = turf.featureCollection([
    turf.polygon([[[0,0],[2,0],[2,2],[0,2],[0,0]]]),
    turf.polygon([[[1,0],[3,0],[3,2],[1,2],[1,0]]])
]);
const result = buildTopologyRepairPreview(overlapping, turf);
assert.ok(result.actions.some(action => action.type === 'REMOVE_OVERLAP'));
const remainingOverlap = turf.intersect(turf.featureCollection(result.preview.features));
assert.ok(!remainingOverlap || turf.area(remainingOverlap) <= 0.1);
assert.notDeepEqual(result.preview, overlapping);

const bowtie = turf.featureCollection([turf.polygon([[[0,0],[2,2],[0,2],[2,0],[0,0]]])]);
const repaired = buildTopologyRepairPreview(bowtie, turf);
assert.ok(repaired.actions.some(action => action.type === 'UNKINK'));

console.log('✅ TOPOLOGY REPAIR TESTS: 6/6 pasaron');
