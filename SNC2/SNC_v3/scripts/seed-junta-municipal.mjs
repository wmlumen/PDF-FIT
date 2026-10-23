import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const db = new sqlite3.Database('data/snc.sqlite');
const pass = 'Piri2026*';
const hash = await bcrypt.hash(pass, 12);

// Junta Municipal: tiene todas las sub-dependencias como hijas.
// Un usuario de Junta Municipal puede ver lo mismo que todas las dependencias.
const juntas = [
  { email: 'junta@piribebuy.gov.py', name: 'Junta Municipal de Piribebuy', dep: 'junta_municipal,catastro,ambiental,planificacion,obras,educacion,patrimonio' },
  { email: 'super@piribebuy.gov.py', name: 'Super Administrador', dep: 'super_admin' },
  { email: 'notarial@piribebuy.gov.py', name: 'Dirección Notarial', dep: 'notarial' },
];

for (const u of juntas) {
  const id = crypto.randomUUID();
  await new Promise((resolve) => {
    db.run(
      `INSERT OR IGNORE INTO users (id, email, password_hash, password_hash_v2, name, plan, role, status, department, created_at, updated_at)
       VALUES (?, ?, '', ?, ?, 'dominio', 'admin', 'active', ?, datetime('now'), datetime('now'))`,
      [id, u.email, hash, u.name, u.dep],
      function(e) {
        if (e) console.error('ERR', u.email, e.message);
        else if (this.changes > 0) console.log('OK:', u.email, '| dep:', u.dep.substring(0, 50));
        else console.log('SKIP (ya existe):', u.email);
        resolve();
      }
    );
  });
}

// Actualizar el admin existente para tener super_admin también
db.run("UPDATE users SET department = 'super_admin,catastro,junta_municipal' WHERE email = 'piribebuy@municipalidad.gov.py'", function(e) {
  if (e) console.error('ERR update:', e.message);
  else console.log('OK: piribebuy admin actualizado a super_admin,catastro,junta_municipal');
});

db.close();
process.exit(0);
