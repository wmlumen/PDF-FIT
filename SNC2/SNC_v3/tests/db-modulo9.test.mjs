// Test de regresion: capa de datos Modulo 9 (workflow expedientes + bitacora hash).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  WORKFLOW_EXPEDIENTE, estadoValido, puedeTransitar, exigeHomologacion,
  expediente_historial, transicionarExpediente
} = require('../db.cjs');
const { dbAPI } = require('../db.cjs');

let passed = 0;
let failed = 0;
function ok(nombre, cond, detalle = '') {
  if (cond) { console.log(`✅ PASS: ${nombre}`); passed++; }
  else { console.log(`❌ FAIL: ${nombre} ${detalle}`); failed++; }
}

const TS = Date.now();
const TEST_USER = 'test-mod9-user-' + TS;
const TEST_PROJ = 'test-mod9-proj-' + TS;
const TEST_EXP = 'test-mod9-exp-' + TS;

async function setup() {
  await dbAPI.users.insert({ id: TEST_USER, email: 'mod9_' + TS + '@example.com', name: 'Mod9 Test', plan: 'free', role: 'member', status: 'active' });
  await dbAPI.projects.insert({ id: TEST_PROJ, user_id: TEST_USER, name: 'Mod9 Proj' });
  await dbAPI.expedientes.insert({ id: TEST_EXP, project_id: TEST_PROJ, name: 'Mod9 Exp' });
}

async function cleanupUser() {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'snc.sqlite'));
  await new Promise((res) => db.run('DELETE FROM users WHERE id = ?', [TEST_USER], () => { db.close(); res(); }));
}

async function run() {
  console.log('\n🧪 TESTS REGRESSION - Modulo 9 (workflow + hash chain)\n');
  await setup();

  const actor = { id: TEST_USER, email: 'mod9_' + TS + '@example.com' };

  // 1. Cadena de hash: 3 transiciones validas consecutivas
  try {
    await transicionarExpediente(TEST_EXP, 'MESA_ENTRADA', actor);
    await transicionarExpediente(TEST_EXP, 'ASIGNADO', actor);
    await transicionarExpediente(TEST_EXP, 'EN_REVISION', actor);
    const v = await expediente_historial.verifyChain(TEST_EXP);
    ok('cadena 3 transiciones valida', v.ok === true && v.total === 3 && v.rotoEn === null, JSON.stringify(v));
  } catch (e) { ok('cadena 3 transiciones valida', false, String(e && e.message)); }

  // 2. Deteccion de manipulacion
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'snc.sqlite'));
    await new Promise((res, rej) => db.run('UPDATE expediente_historial SET hash = ? WHERE expediente_id = ? AND seq = (SELECT MAX(seq) FROM expediente_historial WHERE expediente_id = ?)', ['0'.repeat(64), TEST_EXP, TEST_EXP], (e) => e ? rej(e) : res()));
    db.close();
    const v2 = await expediente_historial.verifyChain(TEST_EXP);
    ok('manipulacion detectada', v2.ok === false && v2.rotoEn !== null, JSON.stringify(v2));
  } catch (e) { ok('manipulacion detectada', false, String(e && e.message)); }

  // 3 & 4. Transiciones invalidas
  // Nota: el par (desde, hacia) se evalua contra la maquina de estados.
  // Los valores null/undefined NO pueden fijarse en la columna `estado`
  // (NOT NULL DEFAULT 'BORRADOR'): SQLite conserva el valor anterior, asi que
  // no corresponden a un caso real y se excluyen del conteo. El caso desde=''
  // SI es representable y se incluye.
  const estados = Object.keys(WORKFLOW_EXPEDIENTE);
  const extra = ['NOPE', ''];
  const allEstados = estados.concat(extra);
  function allowed(desde, hacia) { return puedeTransitar(desde, hacia); }
  let invalidCount = 0;
  let invalidOk = 0;
  const TEST_EXP2 = TEST_EXP + '-2';
  await dbAPI.expedientes.insert({ id: TEST_EXP2, project_id: TEST_PROJ, name: 'Mod9 Exp2' });
  for (const desde of allEstados) {
    for (const hacia of allEstados) {
      if (allowed(desde, hacia)) continue;
      invalidCount++;
      // fijar el estado de partida de forma determinista
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'snc.sqlite'));
      await new Promise((res) => db.run('UPDATE expedientes SET estado = ? WHERE id = ?', [String(desde), TEST_EXP2], () => { db.close(); res(); }));
      let threw = false; let codeOk = false;
      try {
        await transicionarExpediente(TEST_EXP2, hacia, actor);
      } catch (e) {
        threw = true;
        codeOk = e && e.code === 'TRANSICION_INVALIDA';
      }
      if (threw && codeOk) invalidOk++;
    }
  }
  ok('transiciones invalidas lanzan TRANSICION_INVALIDA', invalidOk === invalidCount && invalidCount > 0, invalidOk + '/' + invalidCount);
  await dbAPI.expedientes.deleteById(TEST_EXP2);

  // 5. estadoValido / puedeTransitar edge cases
  ok('estadoValido(undefined) false', estadoValido(undefined) === false);
  ok('estadoValido(null) false', estadoValido(null) === false);
  ok('estadoValido("") false', estadoValido('') === false);
  ok('estadoValido("XXX") false', estadoValido('XXX') === false);
  ok('estadoValido("BORRADOR") true', estadoValido('BORRADOR') === true);
  ok('puedeTransitar(undefined,null) false', puedeTransitar(undefined, null) === false);
  ok('puedeTransitar("BORRADOR","BORRADOR") false', puedeTransitar('BORRADOR', 'BORRADOR') === false);
  ok('puedeTransitar("BORRADOR","MESA_ENTRADA") true', puedeTransitar('BORRADOR', 'MESA_ENTRADA') === true);

  // 6. exigeHomologacion
  ok('FRACCIONAMIENTO detectado', exigeHomologacion('fraccionamiento') === true);
  ok('LOTEAMIENTO detectado', exigeHomologacion('Loteamiento X') === true);
  ok('LOTEO detectado', exigeHomologacion('loteo') === true);
  ok('LEVANTAMIENTO no detectado', exigeHomologacion('LEVANTAMIENTO') === false);
  ok('CATASTRO no detectado', exigeHomologacion('CATASTRO') === false);
  ok('null no detectado', exigeHomologacion(null) === false);

  // 7. Integridad referencial
  const TEST_EXP3 = TEST_EXP + '-3';
  await dbAPI.expedientes.insert({ id: TEST_EXP3, project_id: TEST_PROJ, name: 'Mod9 Exp3' });
  await transicionarExpediente(TEST_EXP3, 'MESA_ENTRADA', actor);
  await dbAPI.expedientes.deleteById(TEST_EXP3);
  const rows = await expediente_historial.list(TEST_EXP3);
  ok('sin huerfanos tras delete expediente', Array.isArray(rows) && rows.length === 0, 'rows=' + rows.length);

  // 8. Concurrencia
  const ids = [TEST_EXP + '-c1', TEST_EXP + '-c2', TEST_EXP + '-c3'];
  for (const id of ids) await dbAPI.expedientes.insert({ id, project_id: TEST_PROJ, name: id });
  await Promise.all(ids.map(id => transicionarExpediente(id, 'MESA_ENTRADA', actor)));
  let concOk = true;
  for (const id of ids) {
    const v = await expediente_historial.verifyChain(id);
    if (!(v.ok === true && v.total === 1)) concOk = false;
  }
  ok('concurrencia mantiene cadena valida', concOk);
  for (const id of ids) await dbAPI.expedientes.deleteById(id);

  // cleanup
  await dbAPI.expedientes.deleteById(TEST_EXP);
  await dbAPI.projects.deleteById(TEST_PROJ);
  await cleanupUser();

  console.log('\n📊 MODULO 9 REGRESSION: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
  else console.log('OK');
}

run().catch(err => { console.error('Unhandled:', err); process.exit(1); });
