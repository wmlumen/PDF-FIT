import assert from 'node:assert/strict';
import { applyLineageEvent, createLineageEvent } from '../js/lineage.js';

const event = createLineageEvent({ operation: 'SUBDIVISION', sources: ['MADRE-1'], results: ['HIJA-1', 'HIJA-2'], documentRef: 'EXP-2026-1', user: { id: 'u1', name: 'Técnico' } });
assert.equal(event.operation, 'SUBDIVISION');
assert.deepEqual(event.sourceParcelIds, ['MADRE-1']);
assert.deepEqual(event.resultParcelIds, ['HIJA-1', 'HIJA-2']);
assert.equal(event.userId, 'u1');

const geojson = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { SNC_PARCELA_ID: 'MADRE-1' }, geometry: null },
    { type: 'Feature', properties: { SNC_PARCELA_ID: 'HIJA-1' }, geometry: null },
    { type: 'Feature', properties: { SNC_PARCELA_ID: 'HIJA-2' }, geometry: null }
] };
const updated = applyLineageEvent(geojson, event);
assert.equal(updated.features[0].properties.PARCELA_ESTADO, 'HISTORICA');
assert.equal(updated.features[1].properties.PARCELA_ESTADO, 'VIGENTE');
assert.deepEqual(updated.features[2].properties.PARCELAS_ORIGEN, ['MADRE-1']);
assert.equal(geojson.features[0].properties.PARCELA_ESTADO, undefined, 'No muta el original');

assert.throws(() => createLineageEvent({ operation: 'SUBDIVISION', sources: [], results: ['X'] }));
assert.throws(() => createLineageEvent({ operation: 'BORRADO', sources: ['X'], results: ['Y'] }));

console.log('✅ LINEAGE TESTS: 10/10 pasaron');
