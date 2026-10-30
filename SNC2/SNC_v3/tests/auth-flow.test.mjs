import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';

// Evitar que server-api arranque el listener en el puerto fijo de producción
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
  console.log('\n🧪 TESTS INTEGRACIÓN - Flujo de Registro y Autenticación (/api/auth)\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}`;

  try {
    // 1. Registro con contraseña débil (debe fallar 400)
    const weakReg = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'debil@snc.test', password: '123' })
    });
    const weakJson = await weakReg.json();
    assertCondition(weakReg.status === 400 && weakJson.error.includes('Contraseña insegura'), 'Registro rechaza contraseña débil con 400');

    // 2. Registro exitoso
    const testEmail = `auth_test_${Date.now()}@snc.test`;
    const testPassword = 'Password123!';
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Ingeniero Agrimensor',
        usage: 'profesional_catastral'
      })
    });
    const regData = await regRes.json();
    assertCondition(regRes.status === 201, 'Registro exitoso devuelve 201');
    assertCondition(Boolean(regData.token), 'Registro devuelve token JWT');
    assertCondition(regData.user?.role === 'member', 'Registro asigna rol member (A1-6)');
    assertCondition(regData.user?.email === testEmail, 'Registro devuelve email normalizado');
    assertCondition(regData.user?.uso === 'profesional_catastral', 'Registro guarda y devuelve el uso previsto');

    // 3. Registro duplicado (debe fallar 409)
    const dupRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Duplicado'
      })
    });
    assertCondition(dupRes.status === 409, 'Registro con email duplicado devuelve 409');

    // 4. Login con contraseña incorrecta (401)
    const badLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword99!'
      })
    });
    assertCondition(badLogin.status === 401, 'Login con contraseña incorrecta devuelve 401');

    // 5. Login con email inexistente (401)
    const noUserLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inexistente_99999@snc.test',
        password: testPassword
      })
    });
    assertCondition(noUserLogin.status === 401, 'Login de usuario inexistente devuelve 401');

    // 6. Login exitoso con usuario nuevo (password_hash_v2)
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginData = await loginRes.json();
    assertCondition(loginRes.status === 200, 'Login exitoso devuelve 200');
    assertCondition(Boolean(loginData.token), 'Login devuelve token JWT válido');
    assertCondition(loginData.user?.email === testEmail, 'Login devuelve datos correctos del usuario');

    // 7. Consulta de sesión /api/auth/me con el token
    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const meData = await meRes.json();
    assertCondition(meRes.status === 200, '/api/auth/me devuelve 200 con token');
    assertCondition(meData.user?.email === testEmail, '/api/auth/me identifica al usuario autenticado');
    assertCondition(meData.user?.password_hash === undefined && meData.user?.password_hash_v2 === undefined, '/api/auth/me no expone hashes de contraseña');

    // 8. Migración de usuario con hash heredado SHA-256 (A-03 / A1-6)
    const legacyEmail = `legacy_${Date.now()}@snc.test`;
    const legacyPlainPassword = 'LegacyPassword123!';
    const legacySha256 = crypto.createHash('sha256').update(legacyPlainPassword).digest('hex');
    const legacyUserId = 'legacy-user-' + Date.now();

    await dbAPI.users.insert({
      id: legacyUserId,
      email: legacyEmail,
      password_hash: legacySha256,
      password_hash_v2: null,
      name: 'Usuario Antiguo',
      plan: 'pro',
      role: 'member',
      status: 'active'
    });

    const legacyLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: legacyEmail,
        password: legacyPlainPassword
      })
    });
    const legacyData = await legacyLogin.json();
    assertCondition(legacyLogin.status === 200, 'Usuario con hash legacy SHA-256 puede iniciar sesión (A-03)');
    assertCondition(Boolean(legacyData.token), 'Usuario legacy recibe token JWT');

    // Esperar migración asíncrona a bcrypt v2 en segundo plano
    await new Promise(r => setTimeout(r, 400));
    const migratedUser = await dbAPI.users.findById(legacyUserId);
    assertCondition(Boolean(migratedUser.password_hash_v2), 'Usuario fue migrado automáticamente a password_hash_v2');
    assertCondition(!migratedUser.password_hash, 'El hash legacy antiguo fue limpiado de la DB');

    // Segundo login del usuario migrado ahora mediante bcrypt v2
    const secondLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: legacyEmail,
        password: legacyPlainPassword
      })
    });
    assertCondition(secondLogin.status === 200, 'Segundo login del usuario migrado funciona con bcrypt v2');

  } finally {
    server.close();
  }

  console.log(`\n📊 AUTH FLOW TESTS SUMMARY: ${passed}/${passed + failed} tests passed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
