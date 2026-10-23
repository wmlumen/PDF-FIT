import assert from 'node:assert/strict';
import http from 'node:http';

process.env.FIREBASE_CONFIG = 'test_environment';
const { app } = await import('../server-api.js');
const { dbAPI } = await import('../db.cjs');

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
  console.log('\n🧪 TESTS INTEGRACIÓN - Health Check & Usage Limits (/api/health, /api/usage)\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check real (200 OK con DB viva)
    const healthRes = await fetch(`${BASE}/api/health`);
    const healthData = await healthRes.json();
    assertCondition(healthRes.status === 200, '/api/health devuelve 200 OK');
    assertCondition(healthData.status === 'ok' && healthData.db === true, '/api/health reporta status: ok y db: true (A-02)');

    // 2. Crear usuario de prueba para verificar /api/usage
    const userEmail = `usage_test_${Date.now()}@snc.test`;
    const userPassword = 'Password123!';
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword,
        name: 'Usuario Cuotas'
      })
    });
    const regData = await regRes.json();
    const token = regData.token;
    assertCondition(Boolean(token), 'Usuario para test de cuotas registrado con token');

    // 3. GET /api/usage debe devolver exportsToday como número (A-01)
    const usageRes = await fetch(`${BASE}/api/usage`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usageData = await usageRes.json();
    assertCondition(usageRes.status === 200, 'GET /api/usage devuelve 200');
    assertCondition(typeof usageData.usage?.exportsToday === 'number', 'GET /api/usage retorna exportsToday como número y no Promise/objeto (A-01)');
    assertCondition(usageData.usage?.exportsToday === 0, 'GET /api/usage reporta 0 exportaciones iniciales');

    // 4. POST /api/usage/increment (1ra exportación permitida)
    const incRes1 = await fetch(`${BASE}/api/usage/increment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const incData1 = await incRes1.json();
    assertCondition(incRes1.status === 200 && incData1.ok === true, 'POST /api/usage/increment permite primera exportación (200 OK)');

    // Verificar que GET /api/usage ahora devuelve 1
    const usageResAfter1 = await fetch(`${BASE}/api/usage`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usageDataAfter1 = await usageResAfter1.json();
    assertCondition(usageDataAfter1.usage?.exportsToday === 1, 'exportsToday incrementó a 1 en base de datos');

    // 5. Incrementar hasta el límite del plan free (límite = 3 exportaciones/día)
    const incRes2 = await fetch(`${BASE}/api/usage/increment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assertCondition(incRes2.status === 200, 'POST /api/usage/increment permite segunda exportación (2/3)');

    const incRes3 = await fetch(`${BASE}/api/usage/increment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assertCondition(incRes3.status === 200, 'POST /api/usage/increment permite tercera exportación (3/3)');

    // 6. La 4ta exportación debe ser bloqueada con 403 y código EXPORT_LIMIT
    const incRes4 = await fetch(`${BASE}/api/usage/increment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const incData4 = await incRes4.json();
    assertCondition(incRes4.status === 403, 'POST /api/usage/increment bloquea con 403 al superar límite diario');
    assertCondition(incData4.code === 'EXPORT_LIMIT', 'Respuesta incluye código EXPORT_LIMIT');

    // 7. Simular degradación de DB en /api/health -> 503
    const originalHealth = dbAPI.health;
    try {
      dbAPI.health = async () => ({ ok: false, error: 'Simulated DB failure' });
      const degradedRes = await fetch(`${BASE}/api/health`);
      assertCondition(degradedRes.status === 503, '/api/health devuelve 503 cuando la DB no está disponible (A-02)');
      const degradedData = await degradedRes.json();
      assertCondition(degradedData.db === false, '/api/health reporta db: false en degradación');
    } finally {
      dbAPI.health = originalHealth;
    }

  } finally {
    server.close();
  }

  console.log(`\n📊 USAGE & HEALTH TESTS SUMMARY: ${passed}/${passed + failed} tests passed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
