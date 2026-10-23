// Crea el usuario municipal de Piribebuy con rol admin.
// Uso: node scripts/seed-piribebuy-user.mjs
import bcrypt from 'bcrypt';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { dbAPI } = require('../db.cjs');

const EMAIL = 'piribebuy@municipalidad.gov.py';
const PASSWORD = 'Piri2026*';
const NAME = 'Municipalidad de Piribebuy';

async function main() {
  const existing = await dbAPI.users.findByEmail(EMAIL);
  if (existing) {
    console.log('El usuario ya existe:', existing.email, '| rol:', existing.role);
    process.exit(0);
  }
  const hash = await bcrypt.hash(PASSWORD, 12);
  const id = crypto.randomUUID();
  await dbAPI.users.insert({
    id,
    email: EMAIL,
    password_hash_v2: hash,
    name: NAME,
    plan: 'dominio',
    role: 'admin',
    status: 'active',
  });
  const created = await dbAPI.users.findByEmail(EMAIL);
  console.log('Usuario creado:', created.email, '| rol:', created.role, '| id:', created.id);
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
