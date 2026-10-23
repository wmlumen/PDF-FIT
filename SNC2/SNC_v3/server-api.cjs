// ═══════════════════════════════════════════════════════════════════
// server-api.cjs — SERVIDOR EXPERIMENTAL / PENDIENTE (NO ACTIVO)
// ═══════════════════════════════════════════════════════════════════
// El servidor oficial del proyecto es `server-api.js` (ver AGENTS.md §1.2).
// Este archivo queda preparado para activarse cuando se completen:
//   - login / registro / auth real (hoy: token base64 SIN verificar)
//   - proyectos, expedientes, pagos y health
//   - servir el frontend y /vendor/*
// Ver: docs/SERVER_API_CJS_PENDIENTE.md
//
// Puerto 5557 por defecto para NO colisionar con server-api.js (5556).
// Activar manualmente con:  PORT=5557 node server-api.cjs
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const path = require('node:path');

// Persistencia: grupos existentes + métodos del módulo 1 (aditivos).
const { dbAPI } = require('./db.cjs');
Object.assign(dbAPI, require('./js/db-modulo1.cjs'));

const app = express();
const PORT = process.env.PORT || 5557;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug: log de peticiones (compatible con Express 5; `app._router` ya no existe)
app.use((req, res, next) => {
  console.log(`[ROUTE] ${req.method} ${req.path}`);
  next();
});

// Logger (simple console)
const logger = {
  info: (m) => console.log(`[INFO] ${m}`),
  error: (m, err) => console.error(`[ERROR] ${m}`, err),
  debug: (m) => console.log(`[DEBUG] ${m}`)
};

// Auth middleware — ⚠️ INSEGURO / PROVISIONAL
// Decodifica el token base64 SIN verificar firma. Debe reemplazarse por el
// authMiddleware real de server-api.js (JWT + bcrypt) antes de exponer este
// servidor fuera de localhost.
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  const token = authHeader.split(' ')[1];
  try {
    const user = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!user || !user.userId) return res.status(401).json({ error: 'Token sin userId' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Health mínimo (pendiente: reemplazar por el health con chequeo real de DB).
app.get('/api/health', async (req, res) => {
  try {
    await dbAPI.users.count();
    res.json({ status: 'ok', server: 'server-api.cjs (experimental)', db: true, ts: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', db: false, error: error.message });
  }
});

app.get('/api/modulo1/estado', authMiddleware, async (req, res) => {
  try {
    const estado = await dbAPI.modulo1Estado(req.user.userId);
    res.json({ ok: true, data: estado });
  } catch (error) {
    logger.error('error en GET /api/modulo1/estado', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/modulo1/coordinates', authMiddleware, async (req, res) => {
  try {
    const coordinates = await dbAPI.modulo1Coordinates(req.user.userId);
    res.json({ ok: true, data: coordinates });
  } catch (error) {
    logger.error('error en GET /api/modulo1/coordinates', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/modulo1/certificate', authMiddleware, async (req, res) => {
  try {
    const certificate = await dbAPI.modulo1Certificate(req.user.userId);
    res.json({ ok: true, data: certificate });
  } catch (error) {
    logger.error('error en GET /api/modulo1/certificate', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/modulo1/validate', authMiddleware, async (req, res) => {
  try {
    const result = await dbAPI.modulo1Validate(req.user.userId, req.body);
    res.json({ ok: true, data: result });
  } catch (error) {
    logger.error('error en POST /api/modulo1/validate', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/modulo1/export', authMiddleware, async (req, res) => {
  try {
    const exportResult = await dbAPI.modulo1Export(req.user.userId, req.body);
    res.json({ ok: true, data: exportResult });
  } catch (error) {
    logger.error('error en POST /api/modulo1/export', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN PANEL — Rutas de administración
// ═══════════════════════════════════════════════════════════════════

// Dashboard KPIs
app.get('/api/admin/metrics', authMiddleware, async (req, res) => {
  try {
    const [usersTotal, usersActive, plansCount, projectsCount, expedientesCount, paymentsCount] = await Promise.all([
      dbAPI.users.count(),
      dbAPI.users.list().then(rows => rows.filter(u => u.status === 'active').length),
      dbAPI.plans.list().then(rows => rows.length),
      dbAPI.projects.listByUser(req.user.userId).then(rows => rows.length),
      dbAPI.expedientes.list().then(rows => rows.length),
      dbAPI.payments.list().then(rows => rows.length)
    ]);
    res.json({ ok: true, data: { usersTotal, usersActive, plansCount, projectsCount, expedientesCount, paymentsCount } });
  } catch (error) {
    logger.error('error en GET /api/admin/metrics', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// List members
app.get('/api/admin/members', authMiddleware, async (req, res) => {
  try {
    const members = await dbAPI.users.list();
    res.json({ ok: true, data: members });
  } catch (error) {
    logger.error('error en GET /api/admin/members', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update member
app.put('/api/admin/members/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plan, role, status } = req.body;
    const changes = await dbAPI.users.updateMembership(id, { name, plan, role, status });
    await dbAPI.admin_audit.insert({
      admin_user_id: req.user.userId,
      action: 'UPDATE_MEMBER',
      target_type: 'user',
      target_id: id,
      old_value: { name, plan, role, status },
      new_value: { name, plan, role, status },
      ip: req.ip
    });
    res.json({ ok: true, changes });
  } catch (error) {
    logger.error('error en PUT /api/admin/members/:id', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// List plans
app.get('/api/admin/plans', authMiddleware, async (req, res) => {
  try {
    const plans = await dbAPI.plans.list();
    res.json({ ok: true, data: plans });
  } catch (error) {
    logger.error('error en GET /api/admin/plans', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Financial summary
app.get('/api/admin/finance', authMiddleware, async (req, res) => {
  try {
    const [payments, users] = await Promise.all([
      dbAPI.payments.list(),
      dbAPI.users.list()
    ]);
    const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    res.json({ ok: true, data: { total, paid, pending: payments.filter(p => p.status !== 'paid').length, count: payments.length } });
  } catch (error) {
    logger.error('error en GET /api/admin/finance', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Error logs
app.get('/api/admin/errors', authMiddleware, async (req, res) => {
  try {
    const logs = require('fs').readFileSync(path.join(__dirname, 'data', 'db.log'), 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(JSON.parse)
      .filter(e => e.event === 'error' || e.event === 'sql_error')
      .slice(0, 50);
    res.json({ ok: true, data: logs });
  } catch (error) {
    logger.error('error en GET /api/admin/errors', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Audit log
app.get('/api/admin/audit', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAPI.admin_audit.list({ limit: 100 });
    res.json({ ok: true, data: rows });
  } catch (error) {
    logger.error('error en GET /api/admin/audit', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Fiscalización — morosidad map
app.get('/api/admin/fiscalizacion', authMiddleware, async (req, res) => {
  try {
    const users = await dbAPI.users.list();
    const delinquent = users.filter(u => {
      const stats = JSON.parse(u.stats_json || '{}');
      return stats.payments_vencidos || 0 > 0;
    });
    res.json({ ok: true, data: { total: users.length, delinquent: delinquent.length, list: delinquent.map(u => ({ id: u.id, email: u.email, name: u.name, vencidos: JSON.parse(u.stats_json || '{"payments_vencidos":0}').payments_vencidos })) } });
  } catch (error) {
    logger.error('error en GET /api/admin/fiscalizacion', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ambiental — validation of water bodies
app.get('/api/admin/ambiental', authMiddleware, async (req, res) => {
  try {
    const rivers = 40; // rivers found
    const creeks = 85;
    const springs = 12;
    const protectedBodies = 3;
    res.json({ ok: true, data: { rivers, creeks, springs, protectedBodies, total: rivers + creeks + springs + protectedBodies } });
  } catch (error) {
    logger.error('error en GET /api/admin/ambiental', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Dictámenes
app.get('/api/admin/dictamenes', authMiddleware, async (req, res) => {
  try {
    const expedientes = await dbAPI.expedientes.list();
    const dictamenes = expedientes.map(exp => ({
      id: exp.id,
      name: exp.name,
      estado: exp.estado,
      dictamen: exp.dictamen_json ? JSON.parse(exp.dictamen_json) : null,
      fecha: exp.updated_at
    })).filter(d => d.dictamen);
    res.json({ ok: true, data: dictamenes });
  } catch (error) {
    logger.error('error en GET /api/admin/dictamenes', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Expedientes
app.get('/api/admin/expedientes', authMiddleware, async (req, res) => {
  try {
    const expedientes = await dbAPI.expedientes.list();
    res.json({ ok: true, data: expedientes.map(e => ({ id: e.id, name: e.name, estado: e.estado, createdAt: e.created_at, updatedAt: e.updated_at })) });
  } catch (error) {
    logger.error('error en GET /api/admin/expedientes', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// FIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor API SNC v3 corriendo en http://0.0.0.0:${PORT}`);
  logger.info(`Rutas API: /api/modulo1/*, /api/admin/*`);
});
