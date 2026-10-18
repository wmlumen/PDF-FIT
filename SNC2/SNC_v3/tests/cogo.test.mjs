import assert from 'node:assert/strict';
import { buildCogoRing, normalizeAzimuth, parseBearing, parseCogoCourses } from '../js/cogo.js';

assert.equal(normalizeAzimuth(-10), 350);
assert.equal(parseBearing('N 45 E'), 45);
assert.equal(parseBearing('S 45 E'), 135);
assert.equal(parseBearing('S 45 W'), 225);
assert.equal(parseBearing('N 45 W'), 315);

const courses = parseCogoCourses('LINEA;90;100\nLINEA;180;100\nLINEA;270;100\nLINEA;0;100');
const square = buildCogoRing([500000, 7200000], courses);
assert.ok(square.closureDistance < 1e-8, 'El cuadrado cierra');
assert.equal(square.report.length, 4);
assert.ok(Math.abs(square.report[0].geometricDistance - 100) < 1e-8);

const pointCourse = buildCogoRing([500000, 7200000], parseCogoCourses('PUNTO;500010;7200010'));
assert.ok(Math.abs(pointCourse.report[0].geometricDistance - Math.sqrt(200)) < 1e-8);

const arc = buildCogoRing([500000, 7200000], parseCogoCourses('ARCO;90;50;90;D'));
assert.ok(arc.coordinates.length > 3, 'El arco se densifica');
assert.ok(Math.abs(arc.report[0].arcLength - Math.PI * 25) < 1e-8);

console.log('✅ COGO TESTS: 12/12 pasaron');
