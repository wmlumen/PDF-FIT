import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { dbAPI } = require('../db.cjs');

let passed = 0;
let failed = 0;

function assertCondition(cond, name, details = '') {
  if (cond) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name} ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🧪 TESTS UNITARIOS - db.cjs Contrato dbAPI (Audit C-07 / A1-2 / A1-3)\n');

  // 1. Health check
  const h1 = await dbAPI.health();
  assertCondition(h1.ok === true && h1.sqlite === true, 'dbAPI.health() retorna ok y sqlite=true');
  const h2 = await dbAPI.health.check();
  assertCondition(h2.ok === true, 'dbAPI.health.check() alias funciona correctamente');

  // 2. Plans seed
  await dbAPI.plans.seed();
  const freePlan = await dbAPI.plans.findById('free');
  assertCondition(freePlan && freePlan.id === 'free' && freePlan.name === 'Plan Gratuito', 'plans.seed() carga planes por defecto');
  const allPlans = await dbAPI.plans.list(false);
  assertCondition(allPlans.length >= 3, 'plans.list() retorna todos los planes');

  // 3. Users lifecycle
  const testUserId = 'test-user-' + Date.now();
  const testEmail = `test_${Date.now()}@example.com`;
  await dbAPI.users.insert({
    id: testUserId,
    email: testEmail,
    password_hash: 'legacy_hash_test',
    password_hash_v2: null,
    name: 'Usuario Test',
    plan: 'free',
    role: 'member',
    status: 'active'
  });
  const u1 = await dbAPI.users.findById(testUserId);
  assertCondition(u1 && u1.email === testEmail, 'users.insert y users.findById funcionan');
  const uByEmail = await dbAPI.users.findByEmail(testEmail);
  assertCondition(uByEmail && uByEmail.id === testUserId, 'users.findByEmail encuentra usuario');

  await dbAPI.users.updateMembership(testUserId, { name: 'Usuario Actualizado', plan: 'pro' });
  const uUpdated = await dbAPI.users.findById(testUserId);
  assertCondition(uUpdated.name === 'Usuario Actualizado' && uUpdated.plan === 'pro', 'users.updateMembership actualiza nombre y plan');

  // 4. Projects lifecycle
  const testProjectId = 'test-proj-' + Date.now();
  await dbAPI.projects.insert({
    id: testProjectId,
    user_id: testUserId,
    name: 'Proyecto Test'
  });
  const p1 = await dbAPI.projects.findById(testProjectId);
  assertCondition(p1 && p1.name === 'Proyecto Test', 'projects.insert y projects.findById funcionan');
  const pList = await dbAPI.projects.findByUser(testUserId);
  assertCondition(pList.some(p => p.id === testProjectId), 'projects.findByUser lista proyectos del usuario');

  // 5. Expedientes lifecycle (C-07 / A1-2)
  const testExpId = 'test-exp-' + Date.now();
  await dbAPI.expedientes.insert({
    id: testExpId,
    project_id: testProjectId,
    name: 'Expediente Test',
    state_json: { crs: 'EPSG:32721' },
    validation_results: { valid: true },
    files_json: [{ name: 'plano.dxf', size: 1024 }]
  });
  const exp1 = await dbAPI.expedientes.findById(testExpId);
  assertCondition(exp1 && exp1.name === 'Expediente Test', 'expedientes.insert y expedientes.findById funcionan');
  assertCondition(exp1.files_json !== undefined, 'expedientes contiene columna files_json (C-07)');

  // findByProject alias (C-07)
  const expByProject = await dbAPI.expedientes.findByProject(testProjectId);
  assertCondition(expByProject.some(e => e.id === testExpId), 'expedientes.findByProject encuentra expedientes del proyecto (C-07)');

  // update (C-07)
  await dbAPI.expedientes.update(testExpId, {
    name: 'Expediente Modificado',
    files_json: [{ name: 'plano.shp', size: 2048 }]
  });
  const expUpdated = await dbAPI.expedientes.findById(testExpId);
  assertCondition(expUpdated.name === 'Expediente Modificado', 'expedientes.update actualiza nombre');
  assertCondition(typeof expUpdated.files_json === 'string' && expUpdated.files_json.includes('plano.shp'), 'expedientes.update actualiza files_json como JSON válido');

  // deleteById (C-07)
  await dbAPI.expedientes.deleteById(testExpId);
  const expDeleted = await dbAPI.expedientes.findById(testExpId);
  assertCondition(expDeleted === null, 'expedientes.deleteById elimina expediente por ID (C-07)');

  // 6. Payments lifecycle
  const testPaymentId = 'test-pay-' + Date.now();
  const testProviderId = 'prov-' + Date.now();
  await dbAPI.payments.insert({
    id: testPaymentId,
    user_id: testUserId,
    plan_id: 'pro',
    amount: 150000,
    currency: 'PYG',
    status: 'pending'
  });
  await dbAPI.payments.updateProvider(testPaymentId, testProviderId, 'created', '{"ref":"123"}');
  const payByProv = await dbAPI.payments.findByProviderId(testProviderId);
  assertCondition(payByProv && payByProv.id === testPaymentId, 'payments.findByProviderId encuentra pago por provider_id');

  await dbAPI.payments.updateStatus(testPaymentId, 'paid', new Date().toISOString());
  const payPaid = await dbAPI.payments.findById(testPaymentId);
  assertCondition(payPaid && payPaid.status === 'paid', 'payments.updateStatus actualiza estado a paid');

  // 7. Temp Projects
  const testTempId = 'temp-proj-' + Date.now();
  await dbAPI.temp_projects.insert({
    id: testTempId,
    user_id: testUserId,
    name: 'Temp Proj',
    expedientes_json: [{ id: 'temp-1' }]
  });
  const tempP = await dbAPI.temp_projects.findById(testTempId);
  assertCondition(tempP && tempP.expedientes && tempP.expedientes.length === 1, 'temp_projects insert y findById con parseo de expedientes_json');
  await dbAPI.temp_projects.deleteById(testTempId);
  const tempDeleted = await dbAPI.temp_projects.findById(testTempId);
  assertCondition(tempDeleted === null, 'temp_projects.deleteById elimina proyecto temporal');

  // 8. Admin Audit
  await dbAPI.admin_audit.insert({
    admin_user_id: testUserId,
    action: 'test_action',
    target_type: 'user',
    target_id: testUserId,
    old_value: { a: 1 },
    new_value: { a: 2 },
    ip: '127.0.0.1'
  });
  const auditList = await dbAPI.admin_audit.list({ limit: 10 });
  assertCondition(auditList.some(a => a.action === 'test_action' && a.admin_user_id === testUserId), 'admin_audit.insert y list registran y recuperan auditoría');

  // 9. Transactions
  let txExecuted = false;
  await dbAPI.transaction(async (api) => {
    txExecuted = true;
    return 'ok';
  });
  assertCondition(txExecuted === true, 'transaction() ejecuta callback con dbAPI');

  // Transaction rollback
  let rollbackCaught = false;
  try {
    await dbAPI.transaction(async (api) => {
      await api.projects.insert({ id: 'rollback-test', user_id: testUserId, name: 'Should Rollback' });
      throw new Error('Forced rollback');
    });
  } catch {
    rollbackCaught = true;
  }
  const rolledBackProj = await dbAPI.projects.findById('rollback-test');
  assertCondition(rollbackCaught && rolledBackProj === null, 'transaction() hace rollback ante error');

  // Cleanup
  await dbAPI.projects.deleteById(testProjectId);

  console.log(`\n📊 DB CONTRACT TESTS SUMMARY: ${passed}/${passed + failed} tests passed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
