// Test de regresion: Fase 11 (auditoria estrategica de modelo de datos,
// 2026-10-23) — parcela como entidad direccionable: parcelas, cuenta_catastral,
// personas, parcela_propietario, matriculas, parcel_lineage.
// Ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { dbAPI, syncParcelasFromGeojson } = require('../db.cjs');

let passed = 0;
let failed = 0;
function ok(nombre, cond, detalle = '') {
  if (cond) { console.log(`✅ PASS: ${nombre}`); passed++; }
  else { console.log(`❌ FAIL: ${nombre} ${detalle}`); failed++; }
}

const TS = Date.now();
const TEST_USER = 'test-f11-user-' + TS;
const TEST_PROJ = 'test-f11-proj-' + TS;
const TEST_EXP = 'test-f11-exp-' + TS;

const GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature', geometry: null,
      properties: {
        CODIGO: 'F11-C1', PADRON: '123', DEPARTAMEN: '11', DISTRITO: '5', ZONA: '3', MANZANA: '7', LOTE: '2',
        PROPIETARIO: 'Juan Perez', FINCA: 'F-100', MATRICULA: 'M-200', SUP_SIG_M: '500.5'
      }
    },
    { type: 'Feature', geometry: null, properties: { CODIGO: 'F11-C2', PADRON: '124' } }
  ]
};

async function setup() {
  await dbAPI.users.insert({ id: TEST_USER, email: 'f11_' + TS + '@example.com', plan: 'free', role: 'member', status: 'active' });
  await dbAPI.projects.insert({ id: TEST_PROJ, user_id: TEST_USER, name: 'Fase11 Proj' });
  await dbAPI.expedientes.insert({ id: TEST_EXP, project_id: TEST_PROJ, name: 'Fase11 Exp' });
}

async function cleanup() {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'snc.sqlite'));
  await new Promise((res) => db.run('DELETE FROM users WHERE id = ?', [TEST_USER], () => { db.close(); res(); }));
}

async function run() {
  console.log('\n🧪 TESTS REGRESSION - Fase 11 (CCC, personas, matriculas, linaje)\n');
  await setup();

  let result;
  try {
    result = await syncParcelasFromGeojson(TEST_EXP, GEOJSON);
    ok('sync crea una parcela por feature', result.length === 2, JSON.stringify(result.map(r => r.parcela.codigo)));
  } catch (e) { ok('sync crea una parcela por feature', false, String(e && e.message)); result = []; }

  try {
    const ccc = result[0]?.cuenta_catastral;
    ok('CCC se crea automaticamente con los campos territoriales', !!ccc?.codigo_ccc && ccc.codigo_ccc.includes('11-5-3-7-2-123'), JSON.stringify(ccc));
  } catch (e) { ok('CCC se crea automaticamente con los campos territoriales', false, String(e && e.message)); }

  try {
    const matricula = result[0]?.matricula;
    ok('matricula se sincroniza desde FINCA/MATRICULA del feature', matricula?.matricula === 'M-200' && matricula?.finca === 'F-100', JSON.stringify(matricula));
  } catch (e) { ok('matricula se sincroniza desde FINCA/MATRICULA del feature', false, String(e && e.message)); }

  try {
    const matriculaSinDatos = result[1]?.matricula;
    ok('sin FINCA/MATRICULA en el feature, no se crea fila de matricula', matriculaSinDatos === null, JSON.stringify(matriculaSinDatos));
  } catch (e) { ok('sin FINCA/MATRICULA en el feature, no se crea fila de matricula', false, String(e && e.message)); }

  let persona, propietarios;
  try {
    persona = await dbAPI.personas.findOrCreateByCedula({ cedula: '1234567', nombre: 'Juan', apellido: 'Perez' });
    propietarios = await dbAPI.parcelaPropietario.upsert({
      parcela_id: result[0].parcela.id, persona_id: persona.id, tipo_relacion: 'PROPIETARIO', porcentaje: 100
    });
    ok('persona + parcela_propietario vinculan por cedula', propietarios.length === 1 && propietarios[0].cedula === '1234567' && propietarios[0].porcentaje === 100, JSON.stringify(propietarios));
  } catch (e) { ok('persona + parcela_propietario vinculan por cedula', false, String(e && e.message)); }

  try {
    const mismaPersona = await dbAPI.personas.findOrCreateByCedula({ cedula: '1234567', nombre: 'Otro nombre' });
    ok('findOrCreateByCedula no duplica por la misma cedula', mismaPersona.id === persona.id, JSON.stringify(mismaPersona));
  } catch (e) { ok('findOrCreateByCedula no duplica por la misma cedula', false, String(e && e.message)); }

  let lineage;
  try {
    lineage = await dbAPI.parcelLineage.append({ expediente_id: TEST_EXP, codigo_origen: 'F11-C1', codigo_destino: 'F11-C1-A', tipo_evento: 'FRACCIONAMIENTO' });
    const listado = await dbAPI.parcelLineage.listByExpediente(TEST_EXP);
    ok('parcel_lineage persiste eventos server-side', listado.length === 1 && listado[0].tipo_evento === 'FRACCIONAMIENTO', JSON.stringify(listado));
  } catch (e) { ok('parcel_lineage persiste eventos server-side', false, String(e && e.message)); }

  // Re-sincronizar (como si se guardara el expediente de nuevo tras una edicion
  // de geometria) no debe duplicar filas ni perder los enganches existentes.
  try {
    await dbAPI.matriculas.update(result[0].matricula.id, { estado: 'VERIFICADA', matricula: 'M-VERIFICADA' });
    const resync = await syncParcelasFromGeojson(TEST_EXP, GEOJSON);
    ok('re-sync preserva el id de la parcela (no la duplica)', resync[0].parcela.id === result[0].parcela.id, JSON.stringify([resync[0].parcela.id, result[0].parcela.id]));
    ok('re-sync no pisa una matricula ya verificada', resync[0].matricula.matricula === 'M-VERIFICADA', JSON.stringify(resync[0].matricula));
    ok('re-sync no cambia el codigo CCC ya asignado', resync[0].cuenta_catastral.codigo_ccc === result[0].cuenta_catastral.codigo_ccc, JSON.stringify([resync[0].cuenta_catastral.codigo_ccc, result[0].cuenta_catastral.codigo_ccc]));
    const listado = await dbAPI.parcelas.listByExpediente(TEST_EXP);
    ok('re-sync no duplica filas de parcelas', listado.length === 2, String(listado.length));
  } catch (e) {
    ok('re-sync preserva el id de la parcela (no la duplica)', false, String(e && e.message));
    ok('re-sync no pisa una matricula ya verificada', false);
    ok('re-sync no cambia el codigo CCC ya asignado', false);
    ok('re-sync no duplica filas de parcelas', false);
  }

  await cleanup();

  console.log(`\n📊 FASE 11 REGRESSION: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run();
