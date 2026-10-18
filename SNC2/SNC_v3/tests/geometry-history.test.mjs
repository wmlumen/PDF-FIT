import assert from 'node:assert/strict';
import proj4 from 'proj4';
import { GeometryHistory } from '../js/geometryHistory.js';

const featureCollection = x => ({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { CODIGO: 'A' }, geometry: { type: 'Point', coordinates: [x, 0] } }]
});

const history = new GeometryHistory(2);
const initial = featureCollection(0);
const first = featureCollection(1);
const second = featureCollection(2);
const third = featureCollection(3);

history.reset(initial);
assert.equal(history.canUndo, false);
history.commit(initial, first, 'Mover 1');
history.commit(first, second, 'Mover 2');
history.commit(second, third, 'Mover 3');
assert.equal(history.undoStack.length, 2, 'Respeta el límite configurado');

const undo = history.undo(third);
assert.equal(undo.value.features[0].geometry.coordinates[0], 2);
assert.equal(history.canRedo, true);
undo.value.features[0].geometry.coordinates[0] = 99;
assert.equal(second.features[0].geometry.coordinates[0], 2, 'Las instantáneas no comparten referencias');

const redo = history.redo(undo.value);
assert.equal(redo.value.features[0].geometry.coordinates[0], 3);
history.commit(redo.value, featureCollection(4), 'Nueva rama');
assert.equal(history.canRedo, false, 'Una edición nueva invalida la rama de rehacer');
const beforeRejected = history.current;
history.commit(beforeRejected, featureCollection(5), 'Cambio rechazado');
assert.equal(history.rollbackLastCommit().features[0].geometry.coordinates[0], 4, 'Revierte una transacción rechazada');

const utm21s = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const geographic = [-57.5759, -25.2637];
const utm = proj4('WGS84', utm21s, geographic);
const roundTrip = proj4(utm21s, 'WGS84', utm);
assert.ok(Math.abs(roundTrip[0] - geographic[0]) < 1e-8, 'Conserva longitud en ida y vuelta UTM');
assert.ok(Math.abs(roundTrip[1] - geographic[1]) < 1e-8, 'Conserva latitud en ida y vuelta UTM');

console.log('✅ GEOMETRY HISTORY/COORDINATE TESTS: 10/10 pasaron');
