import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const db = new sqlite3.Database('data/snc.sqlite');

const usuarios = [
  { email: 'catastro@piribebuy.gov.py',      name: 'Dir. Catastro',          dep: 'catastro' },
  { email: 'ambiental@piribebuy.gov.py',     name: 'Dir. Ambiental',        dep: 'ambiental' },
  { email: 'planificacion@piribebuy.gov.py', name: 'Dir. Planificacion',   dep: 'planificacion' },
  { email: 'obras@piribebuy.gov.py',         name: 'Dir. Obras y Vialidad', dep: 'obras' },
  { email: 'educacion@piribebuy.gov.py',    name: 'Dir. Educacion',        dep: 'educacion' },
  { email: 'patrimonio@piribebuy.gov.py',   name: 'Dir. Patrimonio',       dep: 'patrimonio' },
];
const pass = 'Piri2026*';

const hash = await bcrypt.hash(pass, 12);
let done = 0, errors = 0;

for (const u of usuarios) {
  const id = crypto.randomUUID();
  await new Promise((resolve) => {
    db.run(
      `INSERT OR IGNORE INTO users (id, email, password_hash, password_hash_v2, name, plan, role, status, department, created_at, updated_at)
       VALUES (?, ?, '', ?, ?, 'dominio', 'manager', 'active', ?, datetime('now'), datetime('now'))`,
      [id, u.email, hash, u.name, u.dep],
      function(e) {
        if (e) { console.error('ERR', u.email, e.message); errors++; }
        else if (this.changes > 0) { console.log('OK:', u.email, '| dep:', u.dep); done++; }
        else { console.log('SKIP (ya existe):', u.email); done++; }
        resolve();
      }
    );
  });
}
console.log('Creados:', done, '| Errores:', errors);
db.close();
process.exit(0);
