const sqlite3 = require('sqlite3').verbose();
const { existsSync, mkdirSync, appendFileSync } = require('node:fs');
const { join } = require('node:path');
const bcrypt = require('bcrypt');

const DATA_DIR = process.env.SNC_DATA_DIR || join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, 'snc.sqlite');

const DB_LOG = join(DATA_DIR, 'db.log');

function logDb(event, meta = {}) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...meta }) + '\n';
    appendFileSync(DB_LOG, line, 'utf8');
  } catch (e) {
    // no romper la app por logging
  }
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('[DB]', JSON.stringify({ event: 'open_error', error: err.message }));
});

db.on('error', (err) => {
  logDb('db_error', { error: err.message });
  console.error('[DB]', err.message);
});

logDb('db_open', { dataDir: DATA_DIR, dbPath: DB_PATH });

db.serialize(() => {
  db.run('PRAGMA journal_mode = DELETE');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    password_hash_v2 TEXT,
    name TEXT DEFAULT '',
    plan TEXT DEFAULT 'free',
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Migraciones aditivas e idempotentes para instalaciones existentes.
  db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'", () => {});
  db.run("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", () => {});
  db.run("ALTER TABLE users ADD COLUMN last_login_ip TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN stats_json TEXT NOT NULL DEFAULT '{}'", () => {});
  db.run("ALTER TABLE users ADD COLUMN blocked_reason TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN blocked_until TEXT", () => {});

  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('free','paid','enterprise')),
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    limits_json TEXT NOT NULL DEFAULT '{}',
    features_json TEXT NOT NULL DEFAULT '[]',
    watermark INTEGER NOT NULL DEFAULT 1 CHECK(watermark IN (0,1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expedientes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state_json TEXT,
    validation_results TEXT,
    files_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL,
    provider TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'pending',
    amount REAL,
    currency TEXT DEFAULT 'PYG',
    buyer TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    provider_id TEXT,
    webhook_status TEXT,
    webhook_data TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS usage (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS public_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    html_content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recovery_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ip_events (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    user_id TEXT,
    event TEXT NOT NULL,
    meta TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_ip_events_ip ON ip_events(ip)");
  db.run("CREATE INDEX IF NOT EXISTS idx_ip_events_user ON ip_events(user_id)");
});

function migrateFromJson() {
  return Promise.resolve();
}

async function runJsonMigration() {
  const { readFileSync, existsSync: ex } = require('node:fs');
  const { join: j } = require('node:path');
  const dataDir = j(process.cwd(), 'data');
  
  const usersFile = j(dataDir, 'users.json');
  if (ex(usersFile)) {
    try {
      const users = JSON.parse(readFileSync(usersFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      users.forEach(u => stmt.run(u.id, u.email, u.password_hash, u.name || '', u.plan || 'free', u.created_at, u.updated_at));
      stmt.finalize();
      logDb('migrate_users', { count: users.length });
    } catch (e) { logDb('migrate_users_error', { error: e.message }); }
  }
  
  const projectsFile = j(dataDir, 'projects.json');
  if (ex(projectsFile)) {
    try {
      const projects = JSON.parse(readFileSync(projectsFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO projects (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
      projects.forEach(p => stmt.run(p.id, p.user_id, p.name, p.created_at, p.updated_at));
      stmt.finalize();
      logDb('migrate_projects', { count: projects.length });
    } catch (e) { logDb('migrate_projects_error', { error: e.message }); }
  }
  
  const expedientesFile = j(dataDir, 'expedientes.json');
  if (ex(expedientesFile)) {
    try {
      const expedientes = JSON.parse(readFileSync(expedientesFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO expedientes (id, project_id, name, state_json, validation_results, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      expedientes.forEach(e => stmt.run(e.id, e.project_id, e.name, e.state_json, e.validation_results, e.created_at, e.updated_at));
      stmt.finalize();
      logDb('migrate_expedientes', { count: expedientes.length });
    } catch (e) { logDb('migrate_expedientes_error', { error: e.message }); }
  }
  
  const paymentsFile = j(dataDir, 'payments.json');
  if (ex(paymentsFile)) {
    try {
      const payments = JSON.parse(readFileSync(paymentsFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO payments (id, user_id, plan_id, provider, status, amount, currency, buyer, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      payments.forEach(p => stmt.run(p.id, p.user_id, p.plan_id, p.provider || 'manual', p.status || 'pending', p.amount, p.currency || 'PYG', p.buyer ? JSON.stringify(p.buyer) : null, p.paid_at, p.created_at));
      stmt.finalize();
      logDb('migrate_payments', { count: payments.length });
    } catch (e) { logDb('migrate_payments_error', { error: e.message }); }
  }
  
  const usageFile = j(dataDir, 'usage.json');
  if (ex(usageFile)) {
    try {
      const usage = JSON.parse(readFileSync(usageFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO usage (key, value, updated_at) VALUES (?, ?, ?)');
      for (const [key, val] of Object.entries(usage)) {
        stmt.run(key, val, new Date().toISOString());
      }
      stmt.finalize();
      logDb('migrate_usage', { keys: Object.keys(usage).length });
    } catch (e) { logDb('migrate_usage_error', { error: e.message }); }
  }
}

function promisifyQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    logDb('sql_query', { query: sql, params });
    db.all(sql, params, (err, rows) => {
      if (err) { logDb('sql_error', { query: sql, error: err.message }); reject(err); }
      else resolve(rows);
    });
  });
}

function promisifyGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    logDb('sql_query', { query: sql, params });
    db.get(sql, params, (err, row) => {
      if (err) { logDb('sql_error', { query: sql, error: err.message }); reject(err); }
      else resolve(row || null);
    });
  });
}

function promisifyRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    logDb('sql_query', { query: sql, params });
    db.run(sql, params, function(err) {
      if (err) { logDb('sql_error', { query: sql, error: err.message }); reject(err); }
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

const users = {
  insert(user) {
    const sql = 'INSERT INTO users (id, email, password_hash, password_hash_v2, name, plan, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [user.id, user.email, user.password_hash || null, user.password_hash_v2 || null, user.name || '', user.plan || 'free', user.role || 'member', user.status || 'active', user.created_at || new Date().toISOString(), user.updated_at || new Date().toISOString()]);
  },
  findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return promisifyGet(sql, [email]);
  },
  updatePlan(userId, plan, updatedAt) {
    const sql = 'UPDATE users SET plan = ?, updated_at = ? WHERE id = ?';
    return promisifyRun(sql, [plan, updatedAt || new Date().toISOString(), userId]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM users WHERE id = ?', [id]);
  },
  list() {
    return promisifyQuery('SELECT id, email, name, plan, role, status, created_at, updated_at FROM users ORDER BY datetime(created_at) DESC');
  },
  count() {
    return promisifyGet('SELECT COUNT(*) AS total FROM users').then(row => row?.total || 0);
  },
  ensureAdmin() {
    return promisifyGet("SELECT id FROM users WHERE role = 'admin' LIMIT 1").then(admin => {
      if (admin) return admin.id;
      return promisifyGet('SELECT id FROM users ORDER BY datetime(created_at) ASC LIMIT 1').then(first => {
        if (!first) return null;
        return promisifyRun("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?", [new Date().toISOString(), first.id]).then(() => first.id);
      });
    });
  },
  updateMembership(id, fields) {
    const allowed = new Set(['name', 'plan', 'role', 'status']);
    const entries = Object.entries(fields || {}).filter(([key]) => allowed.has(key));
    if (!entries.length) return Promise.resolve({ changes: 0 });
    const sql = `UPDATE users SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = ? WHERE id = ?`;
    return promisifyRun(sql, [...entries.map(([, value]) => value), new Date().toISOString(), id]);
  },
  updateHashV2(userId, hash, updatedAt) {
    const sql = 'UPDATE users SET password_hash_v2 = ?, password_hash = COALESCE(NULLIF(password_hash, \'\'), password_hash), updated_at = ? WHERE id = ?';
    return promisifyRun(sql, [hash, updatedAt || new Date().toISOString(), userId]);
  },
  clearLegacyHash(userId, updatedAt) {
    const sql = 'UPDATE users SET password_hash = NULL, updated_at = ? WHERE id = ?';
    return promisifyRun(sql, [updatedAt || new Date().toISOString(), userId]);
  },
  findLegacyUsers(limit = 100) {
    const sql = 'SELECT * FROM users WHERE password_hash IS NOT NULL AND password_hash <> \'\' AND (password_hash_v2 IS NULL OR password_hash_v2 = \'\')';
    return promisifyQuery(sql).then(rows => rows.slice(0, limit));
  },
  updatePassword(email, hash) {
    const sql = 'UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?';
    return promisifyRun(sql, [hash, new Date().toISOString(), email]);
  },
  updateLoginIp(userId, ip, updatedAt) {
    return promisifyRun('UPDATE users SET last_login_ip = ?, updated_at = ? WHERE id = ?', [ip || null, updatedAt || new Date().toISOString(), userId]);
  },
  setBlocked(userId, reason, blockedUntil, updatedAt) {
    return promisifyRun('UPDATE users SET blocked_reason = ?, blocked_until = ?, updated_at = ? WHERE id = ?', [reason || null, blockedUntil || null, updatedAt || new Date().toISOString(), userId]);
  },
  getStats(userId) {
    return promisifyGet('SELECT stats_json FROM users WHERE id = ?', [userId]).then(row => {
      try { return JSON.parse(row?.stats_json || '{}'); } catch { return {}; }
    });
  },
  updateStats(userId, statsObj, updatedAt) {
    return promisifyRun('UPDATE users SET stats_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(statsObj || {}), updatedAt || new Date().toISOString(), userId]);
  },
  findByIp(ip) {
    const sql = 'SELECT id, email, name, role, status, last_login_ip, created_at FROM users WHERE last_login_ip = ?';
    return promisifyQuery(sql, [ip]);
  },
  listByIp(ip) {
    const sql = 'SELECT id, email, name, role, status, last_login_ip, created_at FROM users WHERE last_login_ip = ? ORDER BY datetime(updated_at) DESC';
    return promisifyQuery(sql, [ip]);
  },
  insertIpEvent(event) {
    const sql = 'INSERT INTO ip_events (id, ip, user_id, event, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [event.id || crypto.randomUUID(), event.ip, event.user_id || null, event.event, event.meta || null, event.created_at || new Date().toISOString()]);
  }
};

const plans = {
  list(activeOnly = false) {
    const where = activeOnly ? ' WHERE active = 1' : '';
    return promisifyQuery(`SELECT * FROM plans${where}`);
  },
  getById(id) {
    return promisifyGet('SELECT * FROM plans WHERE id = ?', [id]);
  },
  findById(id) {
    return this.getById(id);
  },
  getStats() {
    return promisifyQuery(`
      SELECT p.id AS plan_id,
             COUNT(u.id) AS active_users,
             COALESCE(SUM(json_extract(u.stats_json, '$.consultados')), 0) AS consultados,
             COALESCE(SUM(json_extract(u.stats_json, '$.concretados')), 0) AS concretados
      FROM plans p
      LEFT JOIN users u ON u.plan = p.id AND u.status = 'active'
      GROUP BY p.id
    `);
  },
  upsert(plan) {
    const sql = `INSERT INTO plans (id, name, type, price, currency, limits_json, features_json, watermark, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, price=excluded.price, currency=excluded.currency, limits_json=excluded.limits_json, features_json=excluded.features_json, watermark=excluded.watermark, active=excluded.active, updated_at=excluded.updated_at`;
    return promisifyRun(sql, [plan.id, plan.name, plan.type, Number(plan.price || 0), plan.currency || 'USD', JSON.stringify(plan.limits || {}), JSON.stringify(plan.features || []), plan.watermark ? 1 : 0, plan.active !== false ? 1 : 0, plan.created_at || new Date().toISOString(), new Date().toISOString()]);
  }
};

const projects = {
  insert(project) {
    const sql = 'INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
    return promisifyRun(sql, [project.id, project.user_id, project.name, project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString()]);
  },
  listByUser(userId) {
    return promisifyQuery('SELECT * FROM projects WHERE user_id = ? ORDER BY datetime(created_at) DESC', [userId]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM projects WHERE id = ?', [id]);
  },
  deleteById(id) {
    return promisifyRun('DELETE FROM projects WHERE id = ?', [id]);
  }
};

const expedientes = {
  insert(expediente) {
    const sql = 'INSERT INTO expedientes (id, project_id, name, state_json, validation_results, files_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [expediente.id, expediente.project_id, expediente.name, expediente.state_json ? JSON.stringify(expediente.state_json) : null, expediente.validation_results || null, expediente.files_json ? JSON.stringify(expediente.files_json) : null, expediente.created_at || new Date().toISOString(), expediente.updated_at || new Date().toISOString()]);
  },
  listByProject(projectId) {
    return promisifyQuery('SELECT * FROM expedientes WHERE project_id = ? ORDER BY datetime(created_at) DESC', [projectId]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM expedientes WHERE id = ?', [id]);
  },
  deleteByProject(projectId) {
    return promisifyRun('DELETE FROM expedientes WHERE project_id = ?', [projectId]);
  }
};

const payments = {
  insert(payment) {
    const sql = 'INSERT INTO payments (id, user_id, plan_id, provider, status, amount, currency, buyer, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [payment.id, payment.user_id, payment.plan_id, payment.provider || 'manual', payment.status || 'pending', payment.amount, payment.currency || 'PYG', payment.buyer ? JSON.stringify(payment.buyer) : null, payment.paid_at, payment.created_at || new Date().toISOString()]);
  },
  findById(id) {
    const sql = 'SELECT * FROM payments WHERE id = ?';
    return promisifyGet(sql, [id]);
  },
  updateStatus(id, status, paidAt) {
    return promisifyRun('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?', [status, paidAt, id]);
  },
  updateProvider(id, providerId, webhookStatus = null, webhookData = null) {
    return promisifyRun('UPDATE payments SET provider_id = ?, webhook_status = ?, webhook_data = ? WHERE id = ?', [providerId, webhookStatus, webhookData, id]);
  },
  list() {
    return promisifyQuery('SELECT * FROM payments ORDER BY datetime(created_at) DESC');
  }
};

const usage = {
  get(key) {
    const sql = 'SELECT value FROM usage WHERE key = ?';
    return promisifyGet(sql, [key]).then(row => row ? row.value : 0);
  },
  increment(key) {
    const sql = 'INSERT INTO usage (key, value, updated_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET value = value + 1, updated_at = ?';
    return promisifyRun(sql, [key, new Date().toISOString(), new Date().toISOString()]);
  }
};

const public_reports = {
  insert(report) {
    const sql = 'INSERT INTO public_reports (id, user_id, html_content, created_at) VALUES (?, ?, ?, ?)';
    return promisifyRun(sql, [report.id, report.user_id, report.html_content, report.created_at || new Date().toISOString()]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM public_reports WHERE id = ?', [id]);
  }
};

const recovery = {
  insert(data) {
    const sql = 'INSERT INTO recovery_tokens (token, email, expires_at) VALUES (?, ?, ?)';
    return promisifyRun(sql, [data.token, data.email, data.expires_at]);
  },
  findByToken(token) {
    const sql = 'SELECT * FROM recovery_tokens WHERE token = ?';
    return promisifyGet(sql, [token]);
  },
  deleteByToken(token) {
    const sql = 'DELETE FROM recovery_tokens WHERE token = ?';
    return promisifyRun(sql, [token]);
  },
  deleteByEmail(email) {
    const sql = 'DELETE FROM recovery_tokens WHERE email = ?';
    return promisifyRun(sql, [email]);
  }
};

const dbAPI = { users, plans, projects, expedientes, payments, usage, public_reports, recovery };

module.exports = { dbAPI, migrateFromJson, runJsonMigration };
