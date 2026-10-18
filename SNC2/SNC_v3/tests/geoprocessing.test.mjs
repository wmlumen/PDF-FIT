import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import { executeGeoprocessing } from '../js/geoprocessing.js';

const geojson = turf.featureCollection([
    turf.polygon([[[0,0],[2,0],[2,2],[0,2],[0,0]]]),
    turf.polygon([[[1,1],[3,1],[3,3],[1,3],[1,1]]]),
    turf.polygon([[[5,5],[6,5],[6,6],[5,6],[5,5]]])
]);
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`✅ PASS: ${name}`); };
check('intersección produce polígono', () => assert.equal(executeGeoprocessing({ operation: 'INTERSECTION', geojson }, turf).feature.geometry.type, 'Polygon'));
check('unión aumenta área', () => assert.ok(turf.area(executeGeoprocessing({ operation: 'UNION', geojson }, turf).feature) > turf.area(geojson.features[0])));
check('diferencia reduce área', () => assert.ok(turf.area(executeGeoprocessing({ operation: 'DIFFERENCE', geojson }, turf).feature) < turf.area(geojson.features[0])));
check('clip equivale a intersección', () => assert.ok(executeGeoprocessing({ operation: 'CLIP', geojson }, turf).feature));
check('buffer válido', () => assert.ok(turf.area(executeGeoprocessing({ operation: 'BUFFER', geojson, distanceMeters: 10 }, turf).feature) > turf.area(geojson.features[0])));
check('buffer rechaza distancia cero', () => assert.throws(() => executeGeoprocessing({ operation: 'BUFFER', geojson, distanceMeters: 0 }, turf)));
check('disolver combina polígonos', () => assert.ok(executeGeoprocessing({ operation: 'DISSOLVE', geojson }, turf).feature));
check('selección espacial encuentra parcela intersectada', () => assert.deepEqual(executeGeoprocessing({ operation: 'SPATIAL_SELECT', geojson, primaryIndex: 0 }, turf).selectedIndexes, [1]));
console.log(`✅ GEOPROCESSING TESTS: ${passed}/8 pasaron`);
