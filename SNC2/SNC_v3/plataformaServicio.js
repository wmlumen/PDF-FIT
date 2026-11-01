/**
 * Administración de la plataforma SNC v3: clientes (municipalidades, escribanías, profesionales, empresas), planes,
 * módulos habilitados, usuarios de cada cliente y comprobación manual de pagos (comprobantes de transferencia).
 *
 * Módulo nuevo y separado: base propia data/plataforma.sqlite. NO modifica las zonas congeladas por la auditoría
 * (auth/IDOR/pagos de server-api.js, esquema de db.cjs, RedTicket). Las rutas usan authMiddleware/adminMiddleware tal cual.
 */
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = process.env.PLATAFORMA_DB || join(RAIZ, 'data', 'plataforma.sqlite');

/** Catálogo de módulos que se pueden habilitar a un cliente. */
export const MODULOS = {
  visor_premium: 'Visor catastral Premium (capas SNC, cascos, límites)',
  parcelas_dnit: 'Parcelas oficiales con Cta. Cte. y ficha DNIT',
  edificios: 'Edificios del mapa frente a la liquidación',
  relevamiento: 'Dibujo y relevamiento de construcciones (m² a completar)',
  informe_lote: 'Informe municipal del lote según actividad',
  tablero_municipal: 'Tablero de gestión catastral del municipio',
  analisis_territorial: 'Análisis territorial y plan de recaudación',
  listas_trabajo: 'Listas de trabajo (cuentas sin parcela, diferencias) en CSV',
  notarial: 'Portal notarial',
  gps_campo: 'GPS de campo con parcelas del radio'
};
export const TIPOS_CLIENTE = ['municipalidad', 'escribania', 'profesional', 'empresa', 'gobierno'];
export const ROLES_CLIENTE = ['admin_cliente', 'tecnico', 'consulta'];
export const DIAS_GRACIA = 10;
const PLANES_BASE = [
  { id: 'basico', nombre: 'Básico', precio_mensual: 0, modulos: ['visor_premium', 'gps_campo'] },
  { id: 'municipal', nombre: 'Municipal', precio_mensual: 1500000, modulos: ['visor_premium', 'parcelas_dnit', 'informe_lote', 'tablero_municipal', 'gps_campo'] },
  { id: 'municipal_premium', nombre: 'Municipal Premium', precio_mensual: 3500000, modulos: Object.keys(MODULOS).filter(m => m !== 'notarial') },
  { id: 'notarial', nombre: 'Notarial', precio_mensual: 800000, modulos: ['visor_premium', 'parcelas_dnit', 'informe_lote', 'notarial'] },
  { id: 'profesional', nombre: 'Profesional', precio_mensual: 500000, modulos: ['visor_premium', 'parcelas_dnit', 'relevamiento', 'informe_lote', 'gps_campo'] }
];

class ErrorPlataforma extends Error { constructor(m, status = 400) { super(m); this.status = status; } }
let db = null;
const abrir = () => {
  if (db) return db;
  mkdirSync(dirname(RUTA_DB), { recursive: true });
  const s = require('sqlite3');
  db = new s.Database(RUTA_DB);
  return db;
};
const run = (sql, p = []) => new Promise((ok, mal) => abrir().run(sql, p, function (e) { e ? mal(e) : ok(this); }));
const all = (sql, p = []) => new Promise((ok, mal) => abrir().all(sql, p, (e, r) => (e ? mal(e) : ok(r))));
const get = async (sql, p = []) => (await all(sql, p))[0] || null;

let listo = null;
export function iniciar() {
  if (listo) return listo;
  listo = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS planes (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, precio_mensual INTEGER NOT NULL DEFAULT 0, modulos_json TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1)`);
    await run(`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, nombre TEXT NOT NULL, ruc TEXT, contacto_email TEXT, contacto_tel TEXT,
      muni_id TEXT, cod_dpto TEXT, cod_distrito INTEGER, plan_id TEXT REFERENCES planes(id), estado TEXT NOT NULL DEFAULT 'prueba',
      prueba_hasta TEXT, alta_en TEXT DEFAULT (datetime('now')), notas TEXT)`);
    await run(`CREATE TABLE IF NOT EXISTS cliente_modulos (cliente_id TEXT, modulo TEXT, habilitado INTEGER NOT NULL, PRIMARY KEY (cliente_id, modulo))`);
    // Dependencias: divisiones internas de un cliente (p.ej. Catastro, Ambiental, Notarial de una
    // municipalidad). Un cliente "profesional" de uso directo simplemente no tiene ninguna: sus
    // usuarios cuelgan del cliente sin dependencia (dependencia_id NULL).
    await run(`CREATE TABLE IF NOT EXISTS dependencias (id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, nombre TEXT NOT NULL, notas TEXT, alta_en TEXT DEFAULT (datetime('now')))`);
    await run(`CREATE TABLE IF NOT EXISTS usuarios_cliente (email TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, dependencia_id TEXT, rol TEXT NOT NULL, alta_por TEXT, alta_en TEXT DEFAULT (datetime('now')))`);
    // Migración silenciosa: bases creadas antes de que existiera dependencia_id.
    await run(`ALTER TABLE usuarios_cliente ADD COLUMN dependencia_id TEXT`).catch(() => {});
    await run(`CREATE TABLE IF NOT EXISTS pagos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id TEXT NOT NULL, periodo TEXT NOT NULL, monto INTEGER NOT NULL, medio TEXT,
      comprobante TEXT, estado TEXT NOT NULL DEFAULT 'pendiente', cargado_por TEXT, cargado_en TEXT DEFAULT (datetime('now')), verificado_por TEXT, verificado_en TEXT, observacion TEXT)`);
    for (const p of PLANES_BASE) await run('INSERT OR IGNORE INTO planes (id, nombre, precio_mensual, modulos_json) VALUES (?,?,?,?)', [p.id, p.nombre, p.precio_mensual, JSON.stringify(p.modulos)]);
  })();
  return listo;
}

// ─── reglas ─────────────────────────────────────────────────────────────────────────────────────
const periodoDe = (d = new Date()) => d.toISOString().slice(0, 7);
/**
 * Estado de pago: al día si hay un pago verificado del período actual; en gracia los primeros DIAS_GRACIA días del mes
 * si el mes anterior estaba pagado; en prueba hasta `prueba_hasta`; si no, vencido.
 */
export function estadoPago(cliente, pagos, hoy = new Date()) {
  if (cliente.estado === 'suspendido') return { estado: 'suspendido', detalle: 'Cliente suspendido por la administración' };
  if (cliente.estado === 'prueba' && cliente.prueba_hasta && hoy <= new Date(cliente.prueba_hasta + 'T23:59:59')) return { estado: 'prueba', detalle: `Prueba hasta ${cliente.prueba_hasta}` };
  const verificados = new Set(pagos.filter(p => p.estado === 'verificado').map(p => p.periodo));
  const actual = periodoDe(hoy);
  if (verificados.has(actual)) return { estado: 'al_dia', detalle: `Pago ${actual} verificado` };
  const anterior = periodoDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 15)));
  if (verificados.has(anterior) && hoy.getUTCDate() <= DIAS_GRACIA) return { estado: 'gracia', detalle: `Período ${actual} pendiente; gracia hasta el día ${DIAS_GRACIA}` };
  return { estado: 'vencido', detalle: `Sin pago verificado de ${actual}` };
}
/** Módulos efectivos: los del plan, más/menos los ajustes del cliente; si el pago está vencido o suspendido, solo el plan básico. */
export function modulosEfectivos(plan, ajustes, pago) {
  const base = new Set(plan ? JSON.parse(plan.modulos_json) : []);
  for (const a of ajustes) a.habilitado ? base.add(a.modulo) : base.delete(a.modulo);
  if (pago.estado === 'vencido' || pago.estado === 'suspendido') {
    const basico = PLANES_BASE.find(p => p.id === 'basico').modulos;
    return [...base].filter(m => basico.includes(m));
  }
  return [...base].filter(m => MODULOS[m]);
}

// ─── consultas ──────────────────────────────────────────────────────────────────────────────────
async function fichaCliente(c) {
  const [plan, ajustes, pagos, usuarios, dependencias] = await Promise.all([
    get('SELECT * FROM planes WHERE id = ?', [c.plan_id]), all('SELECT modulo, habilitado FROM cliente_modulos WHERE cliente_id = ?', [c.id]),
    all('SELECT * FROM pagos WHERE cliente_id = ? ORDER BY periodo DESC, id DESC', [c.id]),
    all('SELECT email, dependencia_id, rol, alta_por, alta_en FROM usuarios_cliente WHERE cliente_id = ? ORDER BY email', [c.id]),
    all('SELECT * FROM dependencias WHERE cliente_id = ? ORDER BY nombre', [c.id])]);
  const pago = estadoPago(c, pagos);
  const nombreDep = new Map(dependencias.map(d => [d.id, d.nombre]));
  const usuariosConDependencia = usuarios.map(u => ({ ...u, dependencia_nombre: u.dependencia_id ? (nombreDep.get(u.dependencia_id) || null) : null }));
  return { ...c, plan: plan ? { id: plan.id, nombre: plan.nombre, precio_mensual: plan.precio_mensual, modulos: JSON.parse(plan.modulos_json) } : null,
    ajustes, pago, modulos: modulosEfectivos(plan, ajustes, pago), pagos, usuarios: usuariosConDependencia, dependencias };
}
export async function listarClientes() { await iniciar(); return Promise.all((await all('SELECT * FROM clientes ORDER BY nombre')).map(fichaCliente)); }
export async function cliente(id) { await iniciar(); const c = await get('SELECT * FROM clientes WHERE id = ?', [id]); if (!c) throw new ErrorPlataforma('Cliente no encontrado', 404); return fichaCliente(c); }
export async function listarPlanes() { await iniciar(); return (await all('SELECT * FROM planes ORDER BY precio_mensual')).map(p => ({ ...p, modulos: JSON.parse(p.modulos_json) })); }
export async function pagosPendientes() { await iniciar(); return all(`SELECT p.*, c.nombre AS cliente FROM pagos p JOIN clientes c ON c.id = p.cliente_id WHERE p.estado = 'pendiente' ORDER BY p.cargado_en`); }

// ─── validación y escritura ─────────────────────────────────────────────────────────────────────
const texto = (v, max = 160) => (v == null ? null : String(v).trim().slice(0, max) || null);
const email = v => { const e = String(v || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ErrorPlataforma('Email inválido'); return e; };
const idSeguro = v => { const s = String(v || '').trim().toLowerCase(); if (!/^[a-z0-9_-]{2,40}$/.test(s)) throw new ErrorPlataforma('Identificador inválido (letras, números, - o _)'); return s; };

/** Alta o modificación de un cliente (superadmin). */
export async function guardarCliente(b) {
  await iniciar();
  const id = idSeguro(b.id), tipo = String(b.tipo || '');
  if (!TIPOS_CLIENTE.includes(tipo)) throw new ErrorPlataforma(`Tipo: ${TIPOS_CLIENTE.join(', ')}`);
  if (!texto(b.nombre)) throw new ErrorPlataforma('Falta el nombre');
  if (b.plan_id && !(await get('SELECT id FROM planes WHERE id = ?', [b.plan_id]))) throw new ErrorPlataforma('Plan inexistente');
  const estado = b.estado || 'prueba';
  if (!['prueba', 'activo', 'suspendido'].includes(estado)) throw new ErrorPlataforma('Estado: prueba, activo o suspendido');
  const dpto = b.cod_dpto ? String(b.cod_dpto).toUpperCase() : null;
  if (dpto && !/^[A-Z]$/.test(dpto)) throw new ErrorPlataforma('Código de departamento inválido');
  await run(`INSERT INTO clientes (id, tipo, nombre, ruc, contacto_email, contacto_tel, muni_id, cod_dpto, cod_distrito, plan_id, estado, prueba_hasta, notas)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo, nombre=excluded.nombre, ruc=excluded.ruc, contacto_email=excluded.contacto_email,
    contacto_tel=excluded.contacto_tel, muni_id=excluded.muni_id, cod_dpto=excluded.cod_dpto, cod_distrito=excluded.cod_distrito, plan_id=excluded.plan_id,
    estado=excluded.estado, prueba_hasta=excluded.prueba_hasta, notas=excluded.notas`,
  [id, tipo, texto(b.nombre), texto(b.ruc, 20), b.contacto_email ? email(b.contacto_email) : null, texto(b.contacto_tel, 40), b.muni_id ? idSeguro(b.muni_id) : null,
    dpto, b.cod_distrito != null && b.cod_distrito !== '' ? Number(b.cod_distrito) : null, b.plan_id || null, estado,
    b.prueba_hasta && /^\d{4}-\d{2}-\d{2}$/.test(b.prueba_hasta) ? b.prueba_hasta : null, texto(b.notas, 500)]);
  return cliente(id);
}
/** Habilita o quita un módulo a un cliente por encima de su plan. `habilitado: null` vuelve a lo del plan. */
export async function ajustarModulo(clienteId, modulo, habilitado) {
  await iniciar();
  if (!MODULOS[modulo]) throw new ErrorPlataforma('Módulo desconocido');
  await cliente(clienteId);
  if (habilitado == null) await run('DELETE FROM cliente_modulos WHERE cliente_id = ? AND modulo = ?', [clienteId, modulo]);
  else await run('INSERT INTO cliente_modulos VALUES (?,?,?) ON CONFLICT(cliente_id, modulo) DO UPDATE SET habilitado = excluded.habilitado', [clienteId, modulo, habilitado ? 1 : 0]);
  return cliente(clienteId);
}
export async function guardarPlan(b) {
  await iniciar();
  const id = idSeguro(b.id), mods = (b.modulos || []).filter(m => MODULOS[m]);
  if (!texto(b.nombre)) throw new ErrorPlataforma('Falta el nombre del plan');
  await run(`INSERT INTO planes (id, nombre, precio_mensual, modulos_json, activo) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre,
    precio_mensual=excluded.precio_mensual, modulos_json=excluded.modulos_json, activo=excluded.activo`, [id, texto(b.nombre), Math.max(0, Math.round(Number(b.precio_mensual) || 0)), JSON.stringify(mods), b.activo === false ? 0 : 1]);
  return listarPlanes();
}
/** Dependencia (división interna) de un cliente: p.ej. Catastro, Ambiental, Notarial de una municipalidad. */
export async function guardarDependencia(clienteId, b) {
  await iniciar();
  await cliente(clienteId);
  const id = idSeguro(b.id);
  if (!texto(b.nombre)) throw new ErrorPlataforma('Falta el nombre de la dependencia');
  await run(`INSERT INTO dependencias (id, cliente_id, nombre, notas) VALUES (?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, notas = excluded.notas`, [id, clienteId, texto(b.nombre), texto(b.notas, 300)]);
  return cliente(clienteId);
}
/** Quita una dependencia; no se puede si todavía tiene usuarios asignados (hay que reasignarlos o quitarlos antes). */
export async function quitarDependencia(clienteId, dependenciaId) {
  await iniciar();
  const d = await get('SELECT * FROM dependencias WHERE id = ? AND cliente_id = ?', [dependenciaId, clienteId]);
  if (!d) throw new ErrorPlataforma('Dependencia no encontrada', 404);
  const conUsuarios = await get('SELECT COUNT(*) AS n FROM usuarios_cliente WHERE dependencia_id = ?', [dependenciaId]);
  if (conUsuarios.n > 0) throw new ErrorPlataforma('Reasigne o quite primero a los usuarios de esta dependencia', 409);
  await run('DELETE FROM dependencias WHERE id = ?', [dependenciaId]);
  return cliente(clienteId);
}
/** Usuario de un cliente, opcionalmente dentro de una de sus dependencias (si no, queda al nivel del cliente).
 * El admin de un cliente solo puede dar de alta usuarios de su propio cliente y no otros administradores. */
export async function guardarUsuario(clienteId, b, porEmail, esSuperadmin) {
  await iniciar();
  await cliente(clienteId);
  const rol = String(b.rol || 'consulta');
  if (!ROLES_CLIENTE.includes(rol)) throw new ErrorPlataforma(`Rol: ${ROLES_CLIENTE.join(', ')}`);
  if (rol === 'admin_cliente' && !esSuperadmin) throw new ErrorPlataforma('Solo la administración general asigna administradores de cliente', 403);
  let dependenciaId = null;
  if (b.dependencia_id) {
    const dep = await get('SELECT id FROM dependencias WHERE id = ? AND cliente_id = ?', [b.dependencia_id, clienteId]);
    if (!dep) throw new ErrorPlataforma('Esa dependencia no pertenece a este cliente');
    dependenciaId = dep.id;
  }
  const e = email(b.email);
  const otro = await get('SELECT cliente_id FROM usuarios_cliente WHERE email = ?', [e]);
  if (otro && otro.cliente_id !== clienteId) throw new ErrorPlataforma('Ese email ya pertenece a otro cliente', 409);
  await run('INSERT INTO usuarios_cliente (email, cliente_id, dependencia_id, rol, alta_por) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET dependencia_id = excluded.dependencia_id, rol = excluded.rol',
    [e, clienteId, dependenciaId, rol, porEmail]);
  return cliente(clienteId);
}
export async function quitarUsuario(clienteId, mail, esSuperadmin) {
  await iniciar();
  const u = await get('SELECT * FROM usuarios_cliente WHERE email = ? AND cliente_id = ?', [String(mail).toLowerCase(), clienteId]);
  if (!u) throw new ErrorPlataforma('Usuario no encontrado', 404);
  if (u.rol === 'admin_cliente' && !esSuperadmin) throw new ErrorPlataforma('Solo la administración general quita administradores de cliente', 403);
  await run('DELETE FROM usuarios_cliente WHERE email = ?', [u.email]);
  return cliente(clienteId);
}
/** El cliente informa un pago (comprobante de transferencia); queda pendiente de verificación. */
export async function informarPago(clienteId, b, porEmail) {
  await iniciar();
  await cliente(clienteId);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(b.periodo || ''))) throw new ErrorPlataforma('Período AAAA-MM');
  const monto = Math.round(Number(b.monto));
  if (!(monto > 0)) throw new ErrorPlataforma('Monto inválido');
  await run('INSERT INTO pagos (cliente_id, periodo, monto, medio, comprobante, cargado_por) VALUES (?,?,?,?,?,?)', [clienteId, b.periodo, monto, texto(b.medio, 40), texto(b.comprobante, 200), porEmail]);
  return cliente(clienteId);
}
/** La administración general verifica o rechaza un pago informado. */
export async function verificarPago(id, estado, porEmail, observacion) {
  await iniciar();
  if (!['verificado', 'rechazado'].includes(estado)) throw new ErrorPlataforma('Estado: verificado o rechazado');
  const p = await get('SELECT * FROM pagos WHERE id = ?', [Number(id)]);
  if (!p) throw new ErrorPlataforma('Pago no encontrado', 404);
  await run(`UPDATE pagos SET estado = ?, verificado_por = ?, verificado_en = datetime('now'), observacion = ? WHERE id = ?`, [estado, porEmail, texto(observacion, 300), p.id]);
  if (estado === 'verificado') await run(`UPDATE clientes SET estado = 'activo' WHERE id = ? AND estado = 'prueba'`, [p.cliente_id]);
  return cliente(p.cliente_id);
}
/** Acceso del usuario que inició sesión: su cliente, su rol y los módulos habilitados. */
export async function accesoDe(mail) {
  await iniciar();
  const u = mail ? await get('SELECT * FROM usuarios_cliente WHERE email = ?', [String(mail).toLowerCase()]) : null;
  if (!u) return { cliente: null, rol: null, modulos: null };
  const c = await cliente(u.cliente_id);
  const dependencia = u.dependencia_id ? c.dependencias.find(d => d.id === u.dependencia_id) || null : null;
  return { cliente: { id: c.id, nombre: c.nombre, tipo: c.tipo, muni_id: c.muni_id, cod_dpto: c.cod_dpto, cod_distrito: c.cod_distrito, plan: c.plan?.nombre || null },
    dependencia: dependencia ? { id: dependencia.id, nombre: dependencia.nombre } : null,
    rol: u.rol, pago: c.pago, modulos: c.modulos };
}
