const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.SNC_DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'snc.sqlite');

const DB_LOG = path.join(DATA_DIR, 'db.log');

function logDb(event, meta = {}) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...meta }) + '\n';
    fs.appendFileSync(DB_LOG, line, 'utf8');
  } catch (e) {
    // no romper la app por logging
  }
}

const sqlite3 = require('sqlite3').verbose();
// crypto.createHash no es global implícito en este entorno; requerirlo explicitamente.
const crypto = require('crypto');
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
  db.run("ALTER TABLE users ADD COLUMN department TEXT DEFAULT ''", () => {});

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
  // Perf (auditoria rendimiento 2026-10-23, P-03): projects.user_id y
  // expedientes.project_id se consultan en cada listado (listByUser/listByProject)
  // y no tenian indice; sin esto, listar crece O(n) con el total de filas.
  db.run('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_expedientes_project ON expedientes(project_id)');

  // Modulo 9 — Mesa de entrada: columnas de estado registral.
  // Se agregan con ALTER TABLE idempotente porque la tabla ya existe en DBs
  // en produccion; CREATE TABLE IF NOT EXISTS no las agregaria.
  // Se ejecuta dentro de la misma cola serialize para garantizar el orden
  // (un db.all anidado fuera de la cola puede resolver antes de abrir la DB).
  db.all('PRAGMA table_info(expedientes)', [], (err, cols) => {
    if (err) { logDb('modulo9_pragma_error', { error: err.message }); return; }
    const existing = (cols || []).map(c => c.name);
    const pendientes = [];
    const addCol = (name, ddl) => {
      if (existing.includes(name)) return;
      pendientes.push({ name, ddl });
    };
    addCol('estado', "estado TEXT NOT NULL DEFAULT 'BORRADOR'");
    addCol('entrada_nro', "entrada_nro TEXT");
    addCol('revisor_id', "revisor_id TEXT");
    addCol('precalificacion_status', "precalificacion_status TEXT");
    addCol('precalificacion_json', "precalificacion_json TEXT");
    addCol('dictamen_json', "dictamen_json TEXT");
    addCol('padron_nro', "padron_nro TEXT");
    addCol('homologacion_estado', "homologacion_estado TEXT NOT NULL DEFAULT 'PENDIENTE'");
    addCol('resolucion_municipal_nro', "resolucion_municipal_nro TEXT");
    addCol('resolucion_municipal_fecha', "resolucion_municipal_fecha TEXT");
    addCol('intendente_promulgacion_fecha', "intendente_promulgacion_fecha TEXT");
    // Encadenar los ALTER para que se apliquen en orden y secuencia
    let i = 0;
    const next = () => {
      if (i >= pendientes.length) { logDb('modulo9_ready', { agregadas: pendientes.length }); return; }
      const col = pendientes[i++];
      db.run(`ALTER TABLE expedientes ADD COLUMN ${col.ddl}`, [], (e) => {
        if (e) logDb('modulo9_alter_error', { col: col.name, error: e.message });
        else logDb('modulo9_alter_ok', { col: col.name });
        next();
      });
    };
    next();
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_expedientes_entrada_nro ON expedientes(entrada_nro) WHERE entrada_nro IS NOT NULL");
  });

  // Bitacora inmutable del expediente (req. 180). Cadena de hash SHA-256:
  // cada fila enlaza con la anterior, asi cualquier borrado/alteracion rompe
  // la cadena y queda detectable con verifyChain().
  db.run(`CREATE TABLE IF NOT EXISTS expediente_historial (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    actor_id TEXT,
    actor_email TEXT,
    accion TEXT NOT NULL,
    estado_desde TEXT,
    estado_hacia TEXT NOT NULL,
    diff_json TEXT,
    hash_prev TEXT,
    hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    nonce TEXT
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_hist_exp ON expediente_historial(expediente_id, seq)");

  // La tabla ya existe en DBs en produccion sin la columna `nonce` (se agrego al
  // corregir el Bug M9-1). CREATE TABLE IF NOT EXISTS no la agrega: se hace con
  // ALTER TABLE idempotente leyendo el esquema real.
  db.all('PRAGMA table_info(expediente_historial)', [], (err, cols) => {
    if (err) { logDb('modulo9_hist_pragma_error', { error: err.message }); return; }
    const existing = (cols || []).map(c => c.name);
    if (existing.includes('nonce')) { logDb('modulo9_nonce_ok', {}); return; }
    db.run("ALTER TABLE expediente_historial ADD COLUMN nonce TEXT", [], (e) => {
      if (e) logDb('modulo9_nonce_error', { error: e.message });
      else logDb('modulo9_nonce_added', {});
    });
  });

  // Reparacion de la cadena pre-AUTOINCREMENT (Bug M9-1).
  // La tabla se creo con una secuencia global: el hash de las filas tempranas se
  // calculo con MAX(seq)+1 por expediente, no con el seq real insertado, asi que
  // la cadena quedaba rota desde la fila 1. Se recalcula cada fila con su seq
  // real (el AUTOINCREMENT ya asignado) y el hash_prev del predecessor real.
  db.all('SELECT expediente_id FROM expediente_historial GROUP BY expediente_id', [], (err, grupos) => {
    if (err || !grupos || !grupos.length) return;
    let pending = grupos.length;
    const done = () => { if (--pending === 0) logDb('modulo9_reparacion_ok', { expedientes: grupos.length }); };
    grupos.forEach(g => {
      db.all('SELECT * FROM expediente_historial WHERE expediente_id = ? ORDER BY seq ASC', [g.expediente_id], [], (e2, rows) => {
        if (e2 || !rows) { done(); return; }
        let prev = null;
        let i = 0;
        const next = () => {
          if (i >= rows.length) { done(); return; }
          const r = rows[i++];
          const nuevoHash = calcularHash({
            expediente_id: r.expediente_id, seq: r.seq, accion: r.accion,
            estado_desde: r.estado_desde, estado_hacia: r.estado_hacia,
            diff_json: r.diff_json, created_at: r.created_at
          }, prev);
          db.run('UPDATE expediente_historial SET hash = ?, hash_prev = ? WHERE seq = ?',
            [nuevoHash, prev, r.seq], [], () => { prev = nuevoHash; next(); });
        };
        next();
      });
    });
  });

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
  // Perf (auditoria rendimiento 2026-10-23, P-03): consultados en listados por
  // usuario y en el webhook (findByProviderId), sin indice.
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id)');

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

  // ═══════════════════════════════════════════════════════════════════
  // Fase 11 (auditoria estrategica de modelo de datos, 2026-10-23): la
  // parcela pasa a ser una entidad direccionable (una fila por feature del
  // GeoJSON de cada expediente), en vez de vivir solo como atributo suelto
  // dentro de expedientes.state_json. Cuenta Corriente Catastral, matricula
  // y propietario se enganchan a esa fila, no al expediente completo.
  // ═══════════════════════════════════════════════════════════════════

  db.run(`CREATE TABLE IF NOT EXISTS parcelas (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    feature_index INTEGER NOT NULL,
    codigo TEXT,
    padron TEXT,
    departamento TEXT,
    distrito TEXT,
    zona TEXT,
    manzana TEXT,
    lote TEXT,
    propietario_raw TEXT,
    finca_raw TEXT,
    matricula_raw TEXT,
    sup_sig_m REAL,
    sup_legal REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(expediente_id, feature_index)
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_parcelas_expediente ON parcelas(expediente_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_parcelas_codigo ON parcelas(codigo)');

  db.run(`CREATE TABLE IF NOT EXISTS cuenta_catastral (
    id TEXT PRIMARY KEY,
    parcela_id TEXT NOT NULL UNIQUE REFERENCES parcelas(id) ON DELETE CASCADE,
    codigo_ccc TEXT NOT NULL UNIQUE,
    departamento TEXT,
    distrito TEXT,
    zona TEXT,
    manzana TEXT,
    lote TEXT,
    padron_nro TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_ccc_codigo ON cuenta_catastral(codigo_ccc)');

  db.run(`CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    cedula TEXT NOT NULL UNIQUE,
    nombre TEXT,
    apellido TEXT,
    fecha_nacimiento TEXT,
    telefono TEXT,
    correo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS parcela_propietario (
    id TEXT PRIMARY KEY,
    parcela_id TEXT NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    tipo_relacion TEXT NOT NULL DEFAULT 'PROPIETARIO',
    porcentaje REAL,
    fecha_desde TEXT,
    fecha_hasta TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(parcela_id, persona_id, tipo_relacion)
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_pp_parcela ON parcela_propietario(parcela_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pp_persona ON parcela_propietario(persona_id)');

  db.run(`CREATE TABLE IF NOT EXISTS matriculas (
    id TEXT PRIMARY KEY,
    parcela_id TEXT NOT NULL UNIQUE REFERENCES parcelas(id) ON DELETE CASCADE,
    matricula TEXT,
    finca TEXT,
    folio TEXT,
    protocolo TEXT,
    escribano TEXT,
    estado TEXT NOT NULL DEFAULT 'SIN_VERIFICAR',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS parcel_lineage (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    codigo_origen TEXT,
    codigo_destino TEXT,
    tipo_evento TEXT NOT NULL,
    fecha TEXT,
    meta_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_lineage_expediente ON parcel_lineage(expediente_id)');
});

// async wrappers for DB calls
const dbAsync = {};
dbAsync.run = promisify(db.run.bind(db));
dbAsync.get = promisify(db.get.bind(db));
dbAsync.all = promisify(db.all.bind(db));
dbAsync.serialize = promisify(db.serialize.bind(db));

function promisify(fn) {
  return (...args) => new Promise((resolve, reject) => {
    fn.call(db, ...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// promisifyRun
async function promisifyRun(sql, params = []) {
  logDb('sql_query', { query: sql, params });
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        logDb('sql_error', { query: sql, error: err.message });
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

// promisifyGet
async function promisifyGet(sql, params = []) {
  logDb('sql_query', { query: sql, params });
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        logDb('sql_error', { query: sql, error: err.message });
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

// promisifyQuery
async function promisifyQuery(sql, params = []) {
  logDb('sql_query', { query: sql, params });
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        logDb('sql_error', { query: sql, error: err.message });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
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
    // Fix P0-1 (2026-10-19): la DB heredada tiene password_hash TEXT NOT NULL.
    // Insertar null rompía register y alta de miembros con SQLITE_CONSTRAINT.
    // Se usa '' (cadena vacía) para "sin hash legacy"; findLegacyUsers ignora ''.
    const legacyHash = user.password_hash === undefined || user.password_hash === null || user.password_hash === ''
      ? ''
      : user.password_hash;
    const sql = 'INSERT INTO users (id, email, password_hash, password_hash_v2, name, plan, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [user.id, user.email, legacyHash, user.password_hash_v2 || null, user.name || '', user.plan || 'free', user.role || 'member', user.status || 'active', user.created_at || new Date().toISOString(), user.updated_at || new Date().toISOString()]);
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
    // Fix P0-7b (2026-10-19): la columna password_hash es NOT NULL en la DB
    // heredada; limpiar a NULL lanza SQLITE_CONSTRAINT. Se vacía con ''.
    const sql = "UPDATE users SET password_hash = '', updated_at = ? WHERE id = ?";
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
  // Fix P1-1 (2026-10-19): poblar planes por defecto de forma idempotente.
  // El seed usa nombres canónicos propios; los planes comerciales que ya existen
  // en la DB (destacado, dominio, links…) NO se tocan.
  async seed() {
    const defaults = [
      { id: 'free', name: 'Plan Gratuito', type: 'free', price: 0, currency: 'GS', limits: { projects: 1, expedientesPerProject: 2, parcelasPorExpediente: 500, exportacionesPorDia: 3 }, features: ['Acceso básico a catastro'], watermark: true },
      { id: 'pro', name: 'Plan Profesional', type: 'paid', price: 29, currency: 'USD', limits: { projects: 5, expedientesPerProject: 20, parcelasPorExpediente: 5000, exportacionesPorDia: 50 }, features: ['Validación avanzada', 'Exportación ilimitada'], watermark: false },
      { id: 'enterprise', name: 'Plan Corporativo', type: 'enterprise', price: 99, currency: 'USD', limits: { projects: 9999, expedientesPerProject: 9999, parcelasPorExpediente: 999999, exportacionesPorDia: 999999 }, features: ['Todo incluido', 'Soporte 24/7'], watermark: false }
    ];
    const now = new Date().toISOString();
    for (const plan of defaults) {
      await promisifyRun(
        `INSERT INTO plans (id, name, type, price, currency, limits_json, features_json, watermark, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, price=excluded.price,
           currency=excluded.currency, limits_json=excluded.limits_json, features_json=excluded.features_json,
           watermark=excluded.watermark, active=1, updated_at=excluded.updated_at`,
        [plan.id, plan.name, plan.type, plan.price, plan.currency, JSON.stringify(plan.limits), JSON.stringify(plan.features), plan.watermark ? 1 : 0, now, now]
      );
    }
    return { seeded: defaults.length };
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
  // Fix P1-6 (2026-10-19): contrato de dbAPI — el test exige findByUser.
  findByUser(userId) {
    return this.listByUser(userId);
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
  // Fix P0-5 (2026-10-19): server-api.js llama findByProject en 3 lugares.
  findByProject(projectId) {
    return this.listByProject(projectId);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM expedientes WHERE id = ?', [id]);
  },
  deleteByProject(projectId) {
    return promisifyRun('DELETE FROM expedientes WHERE project_id = ?', [projectId]);
  },
  // Fix P0-6 (2026-10-19): PUT /api/expedientes/:id y gestión de files.
  update(id, fields = {}) {
    const sets = [];
    const params = [];
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(String(fields.name).slice(0, 200)); }
    if (fields.state_json !== undefined) { sets.push('state_json = ?'); params.push(fields.state_json ? JSON.stringify(fields.state_json) : null); }
    if (fields.validation_results !== undefined) { sets.push('validation_results = ?'); params.push(fields.validation_results ? JSON.stringify(fields.validation_results) : null); }
    if (fields.files_json !== undefined) { sets.push('files_json = ?'); params.push(files_json_value(fields.files_json)); }
    if (!sets.length) return Promise.resolve({ changes: 0 });
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    return promisifyRun(`UPDATE expedientes SET ${sets.join(', ')} WHERE id = ?`, params);
  },
  // Fix P0-6 (2026-10-19): DELETE /api/expedientes/:id.
  deleteById(id) {
    return promisifyRun('DELETE FROM expedientes WHERE id = ?', [id]);
  }
};

// ═══════════════════════════════════════════════════════════════════
// Modulo 9 — Mesa de entrada de expedientes (workflow registral)
// Maquina de estados + bitacora inmutable con cadena de hash.
// ═══════════════════════════════════════════════════════════════════

// Circuito registral. Cada entrada lista las transiciones habilitadas.
const WORKFLOW_EXPEDIENTE = {
  BORRADOR:             { orden: 1,  siguiente: ['MESA_ENTRADA'],                       requierePrecalificacion: false },
  MESA_ENTRADA:         { orden: 2,  siguiente: ['ASIGNADO', 'RECHAZADO'],              requierePrecalificacion: true  },
  ASIGNADO:             { orden: 3,  siguiente: ['EN_REVISION'],                       requierePrecalificacion: true  },
  EN_REVISION:          { orden: 4,  siguiente: ['OBSERVADO', 'DICTAMEN'],              requierePrecalificacion: true  },
  OBSERVADO:            { orden: 5,  siguiente: ['REINGRESO'],                         requierePrecalificacion: false },
  REINGRESO:            { orden: 6,  siguiente: ['EN_REVISION'],                       requierePrecalificacion: true  },
  DICTAMEN:             { orden: 7,  siguiente: ['APROBADO_FISCALIZACION', 'OBSERVADO'],requierePrecalificacion: true  },
  APROBADO_FISCALIZACION:{ orden: 8, siguiente: ['FIRMADO_DIRECTOR'],                  requierePrecalificacion: true  },
  FIRMADO_DIRECTOR:     { orden: 9,  siguiente: ['PADRON_ASIGNADO'],                   requierePrecalificacion: true  },
  PADRON_ASIGNADO:      { orden: 10, siguiente: [],                                    requierePrecalificacion: true  },
  RECHAZADO:            { orden: 99, siguiente: ['BORRADOR'],                          requierePrecalificacion: false }
};

function estadoValido(e) { return Object.prototype.hasOwnProperty.call(WORKFLOW_EXPEDIENTE, e); }

function puedeTransitar(desde, hacia) {
  if (!estadoValido(desde) || !estadoValido(hacia)) return false;
  return (WORKFLOW_EXPEDIENTE[desde].siguiente || []).includes(hacia);
}

// Tipo de expediente que exige homologacion municipal de la Junta.
function exigeHomologacion(tipo) {
  const t = String(tipo || '').toUpperCase();
  return t.includes('FRACCIONAMIENTO') || t.includes('LOTEAMIENTO') || t.includes('LOTEO');
}

// Cadena de hash: hash = SHA-256(expediente_id | seq | accion | estado_hacia | diff | hash_prev | created_at)
function calcularHash(entry, hashPrev) {
  const payload = [
    entry.expediente_id,
    entry.seq,
    entry.accion,
    entry.estado_desde || '',
    entry.estado_hacia,
    entry.diff_json || '',
    hashPrev || '',
    entry.created_at
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const expediente_historial = {
  // Inserta una fila enlazada con la anterior.
  // El hash se sella despues del INSERT porque depende del seq real que asigna
  // AUTOINCREMENT (calcularlo con MAX(seq)+1 rompia la cadena, Bug M9-1).
  async append(entry) {
    const prev = await promisifyGet(
      'SELECT hash FROM expediente_historial WHERE expediente_id = ? ORDER BY seq DESC LIMIT 1',
      [entry.expediente_id]
    );
    const hashPrev = prev ? prev.hash : null;
    const createdAt = entry.created_at || new Date().toISOString();
    const nonce = crypto.randomUUID();
    const info = await promisifyRun(
      'INSERT INTO expediente_historial (expediente_id, actor_id, actor_email, accion, estado_desde, estado_hacia, diff_json, hash_prev, hash, created_at, nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [entry.expediente_id, entry.actor_id || null, entry.actor_email || null,
       entry.accion, entry.estado_desde || null, entry.estado_hacia,
       entry.diff_json || null, hashPrev, 'PENDIENTE', createdAt, nonce]
    );
    const seq = Number(info.lastID);
    const hash = calcularHash({
      expediente_id: entry.expediente_id, seq, accion: entry.accion,
      estado_desde: entry.estado_desde, estado_hacia: entry.estado_hacia,
      diff_json: entry.diff_json, created_at: createdAt
    }, hashPrev);
    await promisifyRun(
      'UPDATE expediente_historial SET hash = ? WHERE expediente_id = ? AND nonce = ?',
      [hash, entry.expediente_id, nonce]
    );
    return { seq, hash, hash_prev: hashPrev };
  },

  list(expedienteId) {
    return promisifyQuery(
      'SELECT * FROM expediente_historial WHERE expediente_id = ? ORDER BY seq ASC', [expedienteId]
    );
  },

  // Verifica la integridad de la cadena. Devuelve { ok, total, rotoEn }.
  async verifyChain(expedienteId) {
    const rows = await promisifyQuery(
      'SELECT * FROM expediente_historial WHERE expediente_id = ? ORDER BY seq ASC', [expedienteId]
    );
    let prev = null;
    for (const row of rows) {
      const recalculado = calcularHash({
        expediente_id: row.expediente_id, seq: row.seq, accion: row.accion,
        estado_desde: row.estado_desde, estado_hacia: row.estado_hacia,
        diff_json: row.diff_json, created_at: row.created_at
      }, prev);
      if (recalculado !== row.hash || (prev !== null && row.hash_prev !== prev)) {
        return { ok: false, total: rows.length, rotoEn: row.seq, esperado: recalculado, obtenido: row.hash };
      }
      prev = row.hash;
    }
    return { ok: true, total: rows.length, rotoEn: null };
  }
};

// Transicion de estado con bitacora. Serializa las escrituras para no pisar
// la cadena de hash cuando llegan peticiones concurrentes.
let _chainQueue = Promise.resolve();
function conChain(fn) {
  const next = _chainQueue.then(fn, fn);
  _chainQueue = next.catch(() => {});
  return next;
}

async function transicionarExpediente(expedienteId, hacia, actor, opciones = {}) {
  return conChain(async () => {
    const row = await promisifyGet('SELECT estado, name FROM expedientes WHERE id = ?', [expedienteId]);
    if (!row) { const e = new Error('Expediente no encontrado'); e.code = 'NOT_FOUND'; throw e; }
    // NULL/undefined se normalizan a BORRADOR (el default real de la columna).
    // Un estado vacio o desconocido NO se normaliza: se deja tal cual y la
    // validacion de abajo lo rechaza. Usar `|| 'BORRADOR'` convertiria '' en
    // 'BORRADOR' y saltaria la validacion (Bug M9-2).
    const estadoActual = (row.estado === null || row.estado === undefined)
      ? 'BORRADOR'
      : String(row.estado);
    if (!puedeTransitar(estadoActual, hacia)) {
      const e = new Error(`Transicion invalida: ${estadoActual} -> ${hacia}`);
      e.code = 'TRANSICION_INVALIDA'; e.desde = estadoActual; e.hacia = hacia; throw e;
    }
    const accion = opciones.accion || `TRANSICION_${estadoActual}_A_${hacia}`;
    const createdAt = new Date().toISOString();
    const diff = opciones.diff !== undefined ? JSON.stringify(opciones.diff) : null;

    const prev = await promisifyGet(
      'SELECT hash FROM expediente_historial WHERE expediente_id = ? ORDER BY seq DESC LIMIT 1',
      [expedienteId]
    );
    const hashPrev = prev ? prev.hash : null;

    // 1. Persistir el nuevo estado del expediente.
    await promisifyRun('UPDATE expedientes SET estado = ?, updated_at = ? WHERE id = ?', [hacia, createdAt, expedienteId]);

    // 2. Insertar la fila de bitacora con hash temporal y sellarla con el seq real.
    const nonce = crypto.randomUUID();
    const info = await promisifyRun(
      'INSERT INTO expediente_historial (expediente_id, actor_id, actor_email, accion, estado_desde, estado_hacia, diff_json, hash_prev, hash, created_at, nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [expedienteId, actor?.id || null, actor?.email || null, accion, estadoActual, hacia, diff, hashPrev, 'PENDIENTE', createdAt, nonce]
    );
    // El seq real lo asigna AUTOINCREMENT; el hash depende de ese seq, asi que
    // se inserta primero y se sella despues. Antes se calculaba con MAX(seq)+1
    // (Bug M9-1): si el expediente no era el primero en la bitacora, el seq
    // guardado no coincidia con el usado en el hash y verifyChain lo detectaba.
    const seq = Number(info.lastID);
    const hash = calcularHash({
      expediente_id: expedienteId, seq, accion,
      estado_desde: estadoActual, estado_hacia: hacia, diff_json: diff, created_at: createdAt
    }, hashPrev);
    await promisifyRun(
      'UPDATE expediente_historial SET hash = ? WHERE expediente_id = ? AND nonce = ?',
      [hash, expedienteId, nonce]
    );
    return { ok: true, desde: estadoActual, hacia, accion, seq, hash };
  });
}

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
  },
  // Fix P1-2 (2026-10-19): lookup por provider_id (cobro de Red Ticket).
  findByProviderId(providerId) {
    return promisifyGet('SELECT * FROM payments WHERE provider_id = ?', [providerId]);
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

// Fix P1-3 (2026-10-19): contrato temp_projects (tabla real en la DB).
const temp_projects = {
  insert(project) {
    const sql = 'INSERT INTO temp_projects (id, user_id, name, expedientes_json, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [project.id, project.user_id, project.name, project.expedientes_json ? JSON.stringify(project.expedientes_json) : null, project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString(), project.expires_at || null]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM temp_projects WHERE id = ?', [id]).then(row => {
      if (!row) return null;
      try { row.expedientes = JSON.parse(row.expedientes_json || '[]'); } catch { row.expedientes = []; }
      return row;
    });
  },
  deleteById(id) {
    return promisifyRun('DELETE FROM temp_projects WHERE id = ?', [id]);
  }
};

// Fix P1-4 (2026-10-19): contrato admin_audit_log (tabla real en la DB).
// El test lo accede como dbAPI.admin_audit (no admin_audit_log).
const admin_audit = {
  insert(entry) {
    const sql = 'INSERT INTO admin_audit_log (id, admin_user_id, action, target_type, target_id, old_value, new_value, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return promisifyRun(sql, [entry.id || crypto.randomUUID(), entry.admin_user_id, entry.action, entry.target_type, entry.target_id, entry.old_value ? JSON.stringify(entry.old_value) : null, entry.new_value ? JSON.stringify(entry.new_value) : null, entry.ip || null, entry.created_at || new Date().toISOString()]);
  },
  list({ limit = 50 } = {}) {
    return promisifyQuery('SELECT * FROM admin_audit_log ORDER BY datetime(created_at) DESC LIMIT ?', [Number(limit) || 50]).then(rows => rows.map(row => {
      for (const k of ['old_value', 'new_value']) {
        try { row[k] = row[k] ? JSON.parse(row[k]) : null; } catch { /* dejar string */ }
      }
      return row;
    }));
  }
};
// Alias por nombre completo de tabla.
const admin_audit_log = admin_audit;

// Fix P0-2 (2026-10-19): sonda real de salud de la DB (no solo timestamps).
// Se declara con `let` porque el test usage-health lo reemplaza en caliente
// (dbAPI.health = async () => ({ok:false})) para simular degradación.
let health = async () => {
  try {
    await promisifyGet('SELECT 1');
    return { ok: true, sqlite: true };
  } catch (e) {
    return { ok: false, sqlite: false, error: String(e && e.message || e) };
  }
};
health.check = health;

// Fix P1-5 (2026-10-19): transacción con rollback real.
function transaction(fn) {
  return new Promise((resolve, reject) => {
    db.run('BEGIN', (beginErr) => {
      if (beginErr) return reject(beginErr);
      let result;
      try {
        result = fn(api);
      } catch (syncErr) {
        return db.run('ROLLBACK', () => reject(syncErr));
      }
      Promise.resolve(result).then(
        value => db.run('COMMIT', (cErr) => cErr ? reject(cErr) : resolve(value)),
        err => db.run('ROLLBACK', () => reject(err))
      );
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Fase 11 (auditoria estrategica de modelo de datos, 2026-10-23):
// parcelas / cuenta_catastral / personas / parcela_propietario /
// matriculas / parcel_lineage. Ver docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md
// ═══════════════════════════════════════════════════════════════════

function extractFeatureProp(props, upperKey, lowerKey) {
  const value = props?.[upperKey] ?? props?.[lowerKey];
  return (value === undefined || value === null || value === '') ? null : value;
}

// Identificador de Cuenta Corriente Catastral. No hay un formato oficial SNC
// todavia (ver auditoria estrategica, punto 1): se arma con los campos
// territoriales disponibles + un sufijo de la parcela para garantizar unicidad
// aunque dos features compartan departamento/distrito/zona/manzana/lote/padron.
function buildCodigoCcc(parcela) {
  const norm = (v) => (v === null || v === undefined || String(v).trim() === '')
    ? '0' : String(v).trim().replace(/[^A-Za-z0-9]/g, '');
  const partes = [parcela.departamento, parcela.distrito, parcela.zona, parcela.manzana, parcela.lote, parcela.padron].map(norm);
  return `${partes.join('-')}-${String(parcela.id).slice(0, 8)}`;
}

const parcelas = {
  // Una fila por feature del GeoJSON de un expediente. Upsert por
  // (expediente_id, feature_index): nunca se borran filas aunque un feature
  // desaparezca de una edicion posterior (principio catastral "nunca eliminar
  // parcelas" — ver auditoria estrategica, punto 3), y se preserva el `id`
  // entre resguardos para no romper cuenta_catastral/matriculas/propietarios
  // ya enganchados a esa parcela.
  upsertFromFeature(expedienteId, featureIndex, props = {}) {
    const now = new Date().toISOString();
    const codigo = extractFeatureProp(props, 'CODIGO', 'codigo');
    const padron = extractFeatureProp(props, 'PADRON', 'padron');
    const departamento = extractFeatureProp(props, 'DEPARTAMEN', 'departamento');
    const distrito = extractFeatureProp(props, 'DISTRITO', 'distrito');
    const zona = extractFeatureProp(props, 'ZONA', 'zona');
    const manzana = extractFeatureProp(props, 'MANZANA', 'manzana');
    const lote = extractFeatureProp(props, 'LOTE', 'lote');
    const propietarioRaw = extractFeatureProp(props, 'PROPIETARIO', 'propietario');
    const fincaRaw = extractFeatureProp(props, 'FINCA', 'finca');
    const matriculaRaw = extractFeatureProp(props, 'MATRICULA', 'matricula');
    const supSigMRaw = extractFeatureProp(props, 'SUP_SIG_M', 'sup_sig_m');
    const supLegalRaw = extractFeatureProp(props, 'SUP_LEGAL', 'sup_legal');
    const supSigM = supSigMRaw === null ? NaN : Number(supSigMRaw);
    const supLegal = supLegalRaw === null ? NaN : Number(supLegalRaw);
    const sql = `INSERT INTO parcelas (
        id, expediente_id, feature_index, codigo, padron, departamento, distrito, zona, manzana, lote,
        propietario_raw, finca_raw, matricula_raw, sup_sig_m, sup_legal, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(expediente_id, feature_index) DO UPDATE SET
        codigo = excluded.codigo, padron = excluded.padron, departamento = excluded.departamento,
        distrito = excluded.distrito, zona = excluded.zona, manzana = excluded.manzana, lote = excluded.lote,
        propietario_raw = excluded.propietario_raw, finca_raw = excluded.finca_raw,
        matricula_raw = excluded.matricula_raw, sup_sig_m = excluded.sup_sig_m,
        sup_legal = excluded.sup_legal, updated_at = excluded.updated_at`;
    return promisifyRun(sql, [
      crypto.randomUUID(), expedienteId, featureIndex, codigo, padron, departamento, distrito, zona, manzana, lote,
      propietarioRaw, fincaRaw, matriculaRaw,
      Number.isFinite(supSigM) ? supSigM : null, Number.isFinite(supLegal) ? supLegal : null,
      now, now
    ]).then(() => this.findByExpedienteAndIndex(expedienteId, featureIndex));
  },
  findByExpedienteAndIndex(expedienteId, featureIndex) {
    return promisifyGet('SELECT * FROM parcelas WHERE expediente_id = ? AND feature_index = ?', [expedienteId, featureIndex]);
  },
  listByExpediente(expedienteId) {
    return promisifyQuery('SELECT * FROM parcelas WHERE expediente_id = ? ORDER BY feature_index ASC', [expedienteId]);
  },
  findById(id) {
    return promisifyGet('SELECT * FROM parcelas WHERE id = ?', [id]);
  }
};

const cuentaCatastral = {
  // Crea la CCC una sola vez por parcela; no la vuelve a tocar (es
  // inmutable una vez asignada, aunque la geometria/atributos se editen despues).
  ensureForParcela(parcela) {
    return this.findByParcela(parcela.id).then(existing => {
      if (existing) return existing;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const codigoCcc = buildCodigoCcc(parcela);
      return promisifyRun(
        `INSERT INTO cuenta_catastral (id, parcela_id, codigo_ccc, departamento, distrito, zona, manzana, lote, padron_nro, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, parcela.id, codigoCcc, parcela.departamento, parcela.distrito, parcela.zona, parcela.manzana, parcela.lote, parcela.padron, now, now]
      ).then(() => promisifyGet('SELECT * FROM cuenta_catastral WHERE id = ?', [id]));
    });
  },
  findByParcela(parcelaId) {
    return promisifyGet('SELECT * FROM cuenta_catastral WHERE parcela_id = ?', [parcelaId]);
  },
  findByCodigo(codigoCcc) {
    return promisifyGet('SELECT * FROM cuenta_catastral WHERE codigo_ccc = ?', [codigoCcc]);
  }
};

const personas = {
  // No se migra automaticamente desde el string PROPIETARIO del GeoJSON: no
  // hay cedula en ese dato, y la cedula es la clave unica de esta tabla (ver
  // auditoria estrategica, punto 2). El alta es explicita, vía el endpoint
  // POST /api/parcelas/:id/propietarios.
  findOrCreateByCedula({ cedula, nombre, apellido, fecha_nacimiento, telefono, correo }) {
    const ced = String(cedula || '').trim();
    if (!ced) return Promise.reject(new Error('cedula requerida'));
    return this.findByCedula(ced).then(existing => {
      if (existing) return existing;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      return promisifyRun(
        `INSERT INTO personas (id, cedula, nombre, apellido, fecha_nacimiento, telefono, correo, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [id, ced, nombre || null, apellido || null, fecha_nacimiento || null, telefono || null, correo || null, now, now]
      ).then(() => promisifyGet('SELECT * FROM personas WHERE id = ?', [id]));
    });
  },
  findByCedula(cedula) {
    return promisifyGet('SELECT * FROM personas WHERE cedula = ?', [String(cedula || '').trim()]);
  }
};

const parcelaPropietario = {
  // Relacion N:M con historial: la misma persona puede tener mas de una
  // relacion sobre la misma parcela (p. ej. PROPIETARIO y luego HEREDERO),
  // pero (parcela, persona, tipo_relacion) es unico — reintentar el mismo
  // alta actualiza porcentaje/fechas en vez de duplicar fila.
  upsert({ parcela_id, persona_id, tipo_relacion = 'PROPIETARIO', porcentaje = null, fecha_desde = null, fecha_hasta = null }) {
    const sql = `INSERT INTO parcela_propietario (id, parcela_id, persona_id, tipo_relacion, porcentaje, fecha_desde, fecha_hasta, created_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(parcela_id, persona_id, tipo_relacion) DO UPDATE SET
        porcentaje = excluded.porcentaje, fecha_desde = excluded.fecha_desde, fecha_hasta = excluded.fecha_hasta`;
    return promisifyRun(sql, [crypto.randomUUID(), parcela_id, persona_id, tipo_relacion, porcentaje, fecha_desde, fecha_hasta, new Date().toISOString()])
      .then(() => this.listByParcela(parcela_id));
  },
  listByParcela(parcelaId) {
    return promisifyQuery(
      `SELECT pp.*, p.cedula, p.nombre, p.apellido
       FROM parcela_propietario pp JOIN personas p ON p.id = pp.persona_id
       WHERE pp.parcela_id = ? ORDER BY datetime(pp.created_at) ASC`,
      [parcelaId]
    );
  }
};

const matriculas = {
  // Sincroniza finca/matricula desde el GeoJSON SOLO mientras la fila sigue
  // 'SIN_VERIFICAR'. En cuanto un escribano la verifica/corrige (estado !=
  // SIN_VERIFICAR via update()), una resincronizacion por edicion de geometria
  // ya no pisa ese trabajo.
  ensureForParcela(parcela) {
    if (!parcela.finca_raw && !parcela.matricula_raw) return this.findByParcela(parcela.id);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sql = `INSERT INTO matriculas (id, parcela_id, matricula, finca, created_at, updated_at)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(parcela_id) DO UPDATE SET
        matricula = CASE WHEN estado = 'SIN_VERIFICAR' THEN excluded.matricula ELSE matricula END,
        finca = CASE WHEN estado = 'SIN_VERIFICAR' THEN excluded.finca ELSE finca END,
        updated_at = CASE WHEN estado = 'SIN_VERIFICAR' THEN excluded.updated_at ELSE updated_at END`;
    return promisifyRun(sql, [id, parcela.id, parcela.matricula_raw, parcela.finca_raw, now, now])
      .then(() => this.findByParcela(parcela.id));
  },
  findByParcela(parcelaId) {
    return promisifyGet('SELECT * FROM matriculas WHERE parcela_id = ?', [parcelaId]);
  },
  update(id, fields = {}) {
    const sets = []; const params = [];
    for (const key of ['matricula', 'finca', 'folio', 'protocolo', 'escribano', 'estado']) {
      if (fields[key] !== undefined) { sets.push(`${key} = ?`); params.push(fields[key]); }
    }
    if (!sets.length) return Promise.resolve({ changes: 0 });
    sets.push('updated_at = ?'); params.push(new Date().toISOString());
    params.push(id);
    return promisifyRun(`UPDATE matriculas SET ${sets.join(', ')} WHERE id = ?`, params);
  }
};

const parcelLineage = {
  // Version server-side de js/state.js `parcelLineage` (hasta ahora solo en
  // localStorage, ver AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md P-08).
  append(entry) {
    const id = crypto.randomUUID();
    const sql = `INSERT INTO parcel_lineage (id, expediente_id, codigo_origen, codigo_destino, tipo_evento, fecha, meta_json, created_at)
      VALUES (?,?,?,?,?,?,?,?)`;
    return promisifyRun(sql, [
      id, entry.expediente_id, entry.codigo_origen || null, entry.codigo_destino || null,
      entry.tipo_evento, entry.fecha || new Date().toISOString(),
      entry.meta ? JSON.stringify(entry.meta) : null, new Date().toISOString()
    ]).then(() => promisifyGet('SELECT * FROM parcel_lineage WHERE id = ?', [id]));
  },
  listByExpediente(expedienteId) {
    return promisifyQuery('SELECT * FROM parcel_lineage WHERE expediente_id = ? ORDER BY datetime(created_at) ASC', [expedienteId])
      .then(rows => rows.map(r => {
        try { r.meta = r.meta_json ? JSON.parse(r.meta_json) : null; } catch { r.meta = null; }
        return r;
      }));
  }
};

// Orquesta la sincronizacion completa para un expediente: una parcela por
// feature + su CCC + su matricula (si trae FINCA/MATRICULA). Se llama con el
// OBJETO geojson ya sanitizado (no releido de state_json, para no depender
// de como quede codificada esa columna — ver nota en server-api.js).
async function syncParcelasFromGeojson(expedienteId, geojson) {
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const resultados = [];
  for (let i = 0; i < features.length; i++) {
    const props = features[i]?.properties || {};
    const parcela = await parcelas.upsertFromFeature(expedienteId, i, props);
    const ccc = await cuentaCatastral.ensureForParcela(parcela);
    const matricula = await matriculas.ensureForParcela(parcela);
    resultados.push({ parcela, cuenta_catastral: ccc, matricula });
  }
  return resultados;
}

const api = { users, plans, projects, expedientes, payments, usage, public_reports, recovery, temp_projects, admin_audit, admin_audit_log, parcelas, cuentaCatastral, personas, parcelaPropietario, matriculas, parcelLineage };
const dbAPI = { ...api, health, transaction };

// Migraciones JSON legacy: el esquema actual ya se crea con CREATE TABLE IF NOT EXISTS.
function migrateFromJson() {
  return Promise.resolve();
}

function runJsonMigration() {
  return Promise.resolve();
}

// Normaliza files_json antes de persistarlo.
// Acepta array (lo serializa), string ya serializado (lo pasa tal cual) o
// string con doble encoding (lo re-parsea y re-serializa a la forma canónica).
// Sin esto, el endpoint POST /files serializaba dos veces y el GET devolvia
// un string en lugar de un array.
function files_json_value(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    // Si ya es JSON valido de un array, dejarlo canonico
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      if (typeof parsed === 'string') {
        // Doble encoding: re-parsear una vez mas
        const inner = JSON.parse(parsed);
        return JSON.stringify(inner);
      }
      return JSON.stringify(parsed);
    } catch {
      return s;
    }
  }
  return JSON.stringify(value);
}

// Normaliza files_json leido de la DB. Devuelve siempre un array.
// Repara filas historicas con doble encoding.
function normalizeFilesJson(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  return Array.isArray(parsed) ? parsed : [];
}

module.exports = {
  dbAPI, migrateFromJson, runJsonMigration, files_json_value, normalizeFilesJson,
  // Modulo 9 — mesa de entrada
  WORKFLOW_EXPEDIENTE, estadoValido, puedeTransitar, exigeHomologacion,
  expediente_historial, transicionarExpediente,
  // Fase 11 — parcela como entidad direccionable (CCC, personas, matriculas, linaje)
  syncParcelasFromGeojson
};
