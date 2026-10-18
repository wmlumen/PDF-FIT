import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, 'snc.sqlite');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT '',
  plan TEXT DEFAULT 'free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT DEFAULT 'Proyecto sin nombre',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expedientes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT DEFAULT 'Expediente',
  state_json TEXT,
  validation_results TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  provider TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  amount REAL,
  currency TEXT DEFAULT 'PYG',
  buyer TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS usage (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_project ON expedientes(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS recovery_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
`);

const stmts = {
  users: {
    insert: db.prepare('INSERT INTO users (id, email, password_hash, name, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    byEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    all: db.prepare('SELECT * FROM users'),
    updatePlan: db.prepare('UPDATE users SET plan = ?, updated_at = ? WHERE id = ?'),
    updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?')
  },
  projects: {
    insert: db.prepare('INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'),
    byUser: db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY datetime(updated_at) DESC'),
    byId: db.prepare('SELECT * FROM projects WHERE id = ?'),
    delete: db.prepare('DELETE FROM projects WHERE id = ?')
  },
  expedientes: {
    insert: db.prepare('INSERT INTO expedientes (id, project_id, name, state_json, validation_results, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    byProject: db.prepare('SELECT * FROM expedientes WHERE project_id = ? ORDER BY datetime(updated_at) DESC'),
    byId: db.prepare('SELECT * FROM expedientes WHERE id = ?'),
    update: db.prepare('UPDATE expedientes SET name = COALESCE(?, name), state_json = COALESCE(?, state_json), validation_results = COALESCE(?, validation_results), updated_at = ? WHERE id = ?'),
    delete: db.prepare('DELETE FROM expedientes WHERE id = ?'),
    deleteByProject: db.prepare('DELETE FROM expedientes WHERE project_id = ?')
  },
  payments: {
    insert: db.prepare('INSERT INTO payments (id, user_id, plan_id, provider, status, amount, currency, buyer, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    byId: db.prepare('SELECT * FROM payments WHERE id = ?'),
    byUser: db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY datetime(created_at) DESC'),
    updateStatus: db.prepare('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?')
  },
  usage: {
    get: db.prepare('SELECT value FROM usage WHERE key = ?'),
    set: db.prepare('INSERT INTO usage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    increment: db.prepare('INSERT INTO usage (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1')
  },
  recovery: {
    insert: db.prepare('INSERT INTO recovery_tokens (token, email, expires_at) VALUES (?, ?, ?)'),
    getByToken: db.prepare('SELECT * FROM recovery_tokens WHERE token = ?'),
    deleteByToken: db.prepare('DELETE FROM recovery_tokens WHERE token = ?'),
    deleteByEmail: db.prepare('DELETE FROM recovery_tokens WHERE email = ?')
  }
};

export function migrateFromJson() {
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = join(process.cwd(), 'data');
    const files = {
      users: 'users.json',
      projects: 'projects.json',
      expedientes: 'expedientes.json',
      payments: 'payments.json'
    };
    const parse = (name) => {
      const p = path.join(dir, name);
      if (!existsSync(p)) return [];
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
    };
    const users = parse(files.users);
    const projects = parse(files.projects);
    const expedientes = parse(files.expedientes);
    const payments = parse(files.payments);

    const tx = db.transaction(() => {
      for (const u of users) {
        stmts.users.insert.run(u.id, u.email, u.password_hash, u.name || '', u.plan || 'free', u.created_at, u.updated_at);
      }
      for (const p of projects) {
        stmts.projects.insert.run(p.id, p.user_id, p.name || 'Proyecto sin nombre', p.created_at, p.updated_at);
      }
      for (const e of expedientes) {
        stmts.expedientes.insert.run(e.id, e.project_id, e.name || 'Expediente', e.state_json || null, e.validation_results || null, e.created_at, e.updated_at);
      }
      for (const p of payments) {
        stmts.payments.insert.run(p.id, p.user_id, p.plan_id, p.provider || 'manual', p.status || 'pending', p.amount, p.currency || 'PYG', JSON.stringify(p.buyer || {}), p.created_at, p.paid_at || null);
      }
    });
    tx();
  } catch (e) {
    console.error('migrateFromJson error', e);
  }
}

export const dbAPI = {
  users: {
    insert(data) { return stmts.users.insert.run(data.id, data.email, data.password_hash, data.name || '', data.plan || 'free', data.created_at, data.updated_at); },
    findByEmail(email) { return stmts.users.byEmail.get(email); },
    getAll() { return stmts.users.all.all(); },
    updatePlan(id, plan, updatedAt) { return stmts.users.updatePlan.run(plan, updatedAt, id); },
    updatePassword(email, hash) { return stmts.users.updatePassword.run(hash, new Date().toISOString(), email); }
  },
  projects: {
    insert(data) { return stmts.projects.insert.run(data.id, data.user_id, data.name || 'Proyecto sin nombre', data.created_at, data.updated_at); },
    findByUser(userId) { return stmts.projects.byUser.all(userId); },
    findById(id) { return stmts.projects.byId.get(id); },
    deleteById(id) { const r = stmts.projects.delete.run(id); stmts.expedientes.deleteByProject.run(id); return r; }
  },
  expedientes: {
    insert(data) { return stmts.expedientes.insert.run(data.id, data.project_id, data.name || 'Expediente', data.state_json || null, data.validation_results || null, data.created_at, data.updated_at); },
    findByProject(projectId) { return stmts.expedientes.byProject.all(projectId); },
    findById(id) { return stmts.expedientes.byId.get(id); },
    update(id, fields) { const now = new Date().toISOString(); return stmts.expedientes.update.run(fields.name, fields.state_json, fields.validation_results, now, id); },
    deleteById(id) { return stmts.expedientes.delete.run(id); }
  },
  payments: {
    insert(data) { return stmts.payments.insert.run(data.id, data.user_id, data.plan_id, data.provider || 'manual', data.status || 'pending', data.amount, data.currency || 'PYG', JSON.stringify(data.buyer || {}), data.created_at, data.paid_at || null); },
    findById(id) { return stmts.payments.byId.get(id); },
    findByUser(userId) { return stmts.payments.byUser.all(userId); },
    updateStatus(id, status, paidAt) { return stmts.payments.updateStatus.run(status, paidAt, id); }
  },
  usage: {
    get(key) { const row = stmts.usage.get.get(key); return row ? row.value : 0; },
    set(key, value) { return stmts.usage.set.run(key, value); },
    increment(key) { return stmts.usage.increment.run(key); }
  },
  recovery: {
    insert(data) { return stmts.recovery.insert.run(data.token, data.email, data.expires_at); },
    findByToken(token) { return stmts.recovery.getByToken.get(token); },
    deleteByToken(token) { return stmts.recovery.deleteByToken.run(token); },
    deleteByEmail(email) { return stmts.recovery.deleteByEmail.run(email); }
  }
};

export default dbAPI;
