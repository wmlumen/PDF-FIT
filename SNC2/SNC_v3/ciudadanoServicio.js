/**
 * Cuenta del ciudadano / propietario: vincula su teléfono a una Cta. Cte. catastral (o padrón) para recibir avisos.
 * - Alta con consentimiento expreso y código de verificación de 6 dígitos (se guarda solo su huella; 5 intentos).
 * - Los avisos (cambios en la liquidación, inspecciones, vencimiento de patente) van a una bandeja de salida.
 *   El envío real por SMS/WhatsApp necesita un proveedor contratado (NOTIF_PROVEEDOR); sin él quedan pendientes.
 * Base propia data/ciudadano.sqlite. Módulo de backend (Node).
 */
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = process.env.CIUDADANO_DB || join(RAIZ, 'data', 'ciudadano.sqlite');
const MAX_INTENTOS = 5, VIGENCIA_CODIGO_MIN = 15;
class ErrorCiudadano extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

let db = null, listo = null;
const abrir = () => { if (!db) { mkdirSync(dirname(RUTA_DB), { recursive: true }); db = new (require('sqlite3').Database)(RUTA_DB); } return db; };
const run = (sql, p = []) => new Promise((ok, mal) => abrir().run(sql, p, function (e) { e ? mal(e) : ok(this); }));
const all = (sql, p = []) => new Promise((ok, mal) => abrir().all(sql, p, (e, r) => (e ? mal(e) : ok(r))));
export function iniciar() {
  if (listo) return listo;
  listo = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS suscripciones (id TEXT PRIMARY KEY, dpto TEXT NOT NULL, dist INTEGER NOT NULL, cuenta TEXT NOT NULL, telefono TEXT NOT NULL, canal TEXT NOT NULL,
      codigo_hash TEXT, codigo_vence TEXT, intentos INTEGER NOT NULL DEFAULT 0, verificado INTEGER NOT NULL DEFAULT 0, consentimiento_en TEXT NOT NULL, baja_en TEXT, alta_en TEXT DEFAULT (datetime('now')))`);
    await run('CREATE INDEX IF NOT EXISTS idx_susc_cuenta ON suscripciones(dpto, dist, cuenta)');
    await run(`CREATE TABLE IF NOT EXISTS notificaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, suscripcion_id TEXT, telefono TEXT, canal TEXT, tipo TEXT, mensaje TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente_envio', creada_en TEXT DEFAULT (datetime('now')), enviada_en TEXT, clave TEXT UNIQUE)`);
  })();
  return listo;
}

/** Teléfono paraguayo a formato internacional (+595…). Acepta 0981 123 456, 981123456 o +595 981 123 456. */
export function normalizarTelefono(t) {
  let d = String(t || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+595')) d = d.slice(4); else if (d.startsWith('595')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (!/^9\d{8}$/.test(d)) throw new ErrorCiudadano('Teléfono celular paraguayo inválido (ej.: 0981 123 456)');
  return `+595${d}`;
}
/** Cuenta a vincular: Cta. Cte. urbana (190073-08/00-000 o 190073-08) o padrón rural (número). */
export function normalizarCuenta(c) {
  const t = String(c || '').trim();
  let m = t.match(/^(\d{6})-(\d{2,4})(?:\/(\d{2})-(\d{3}))?$/);
  if (m) return `${m[1]}-${m[2]}/${m[3] || '00'}-${m[4] || '000'}`;
  m = t.match(/^(?:padr[oó]n\s*)?(\d{1,9})$/i);
  if (m) return `P${Number(m[1])}`;
  throw new ErrorCiudadano('Cuenta inválida: Cta. Cte. (190073-08/00-000) o número de padrón');
}
const huella = c => crypto.createHash('sha256').update(String(c)).digest('hex');
const enmascarar = t => `${t.slice(0, 7)}***${t.slice(-3)}`;

/** Paso 1: el ciudadano pide vincular su teléfono; se genera un código y se encola el mensaje. */
export async function vincular(b) {
  await iniciar();
  if (b.acepto !== true && b.acepto !== 'true') throw new ErrorCiudadano('Debe aceptar recibir avisos y el tratamiento de su número');
  const dpto = String(b.dpto || '').toUpperCase(), dist = Number(b.dist);
  if (!/^[A-Z]$/.test(dpto) || !Number.isInteger(dist)) throw new ErrorCiudadano('Indique el distrito de la cuenta');
  const cuenta = normalizarCuenta(b.cuenta), telefono = normalizarTelefono(b.telefono);
  const canal = b.canal === 'sms' ? 'sms' : 'whatsapp';
  const ya = await all('SELECT COUNT(*) AS n FROM suscripciones WHERE telefono = ? AND baja_en IS NULL AND alta_en > datetime(\'now\', \'-1 day\')', [telefono]);
  if (ya[0].n >= 10) throw new ErrorCiudadano('Demasiadas solicitudes para ese número hoy', 429);
  const id = crypto.randomUUID(), codigo = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  const vence = new Date(Date.now() + VIGENCIA_CODIGO_MIN * 60000).toISOString();
  await run('INSERT INTO suscripciones (id, dpto, dist, cuenta, telefono, canal, codigo_hash, codigo_vence, consentimiento_en) VALUES (?,?,?,?,?,?,?,?,datetime(\'now\'))',
    [id, dpto, dist, cuenta, telefono, canal, huella(codigo), vence]);
  await run('INSERT INTO notificaciones (suscripcion_id, telefono, canal, tipo, mensaje) VALUES (?,?,?,?,?)',
    [id, telefono, canal, 'codigo', `SNC: su código para recibir avisos de la cuenta ${cuenta.replace(/^P/, 'padrón ')} es ${codigo}. Vence en ${VIGENCIA_CODIGO_MIN} minutos.`]);
  const proveedor = !!process.env.NOTIF_PROVEEDOR;
  return { ok: true, id, telefono: enmascarar(telefono), canal, envio: proveedor ? 'enviado' : 'pendiente',
    aviso: proveedor ? 'Le enviamos un código.' : 'El envío de mensajes todavía no está habilitado en este servidor: el código quedó en la bandeja de salida del municipio.',
    ...(process.env.NOTIF_DEV_MOSTRAR_CODIGO === '1' ? { codigo_dev: codigo } : {}) };
}
/** Paso 2: el ciudadano ingresa el código. */
export async function verificar(id, codigo) {
  await iniciar();
  const [s] = await all('SELECT * FROM suscripciones WHERE id = ?', [String(id)]);
  if (!s || s.baja_en) throw new ErrorCiudadano('Solicitud no encontrada', 404);
  if (s.verificado) return { ok: true, verificado: true };
  if (s.intentos >= MAX_INTENTOS) throw new ErrorCiudadano('Demasiados intentos: pida un código nuevo', 429);
  if (new Date(s.codigo_vence) < new Date()) throw new ErrorCiudadano('El código venció: pida uno nuevo');
  if (huella(String(codigo || '').trim()) !== s.codigo_hash) { await run('UPDATE suscripciones SET intentos = intentos + 1 WHERE id = ?', [s.id]); throw new ErrorCiudadano('Código incorrecto'); }
  await run('UPDATE suscripciones SET verificado = 1, codigo_hash = NULL WHERE id = ?', [s.id]);
  return { ok: true, verificado: true };
}
export async function baja(id) {
  await iniciar();
  const r = await run(`UPDATE suscripciones SET baja_en = datetime('now') WHERE id = ? AND baja_en IS NULL`, [String(id)]);
  if (!r.changes) throw new ErrorCiudadano('Suscripción no encontrada', 404);
  return { ok: true };
}
/** Encola un aviso para todos los suscriptos verificados de una cuenta (clave evita duplicados). */
export async function avisar({ dpto, dist, cuenta, tipo, mensaje, clave }) {
  await iniciar();
  const subs = await all('SELECT * FROM suscripciones WHERE dpto = ? AND dist = ? AND cuenta = ? AND verificado = 1 AND baja_en IS NULL', [dpto, Number(dist), cuenta]);
  let n = 0;
  for (const s of subs) {
    const r = await run('INSERT OR IGNORE INTO notificaciones (suscripcion_id, telefono, canal, tipo, mensaje, clave) VALUES (?,?,?,?,?,?)', [s.id, s.telefono, s.canal, tipo, mensaje, clave ? `${clave}|${s.id}` : null]);
    n += r.changes;
  }
  return n;
}
/** Resumen de la bandeja de salida de un distrito (para el municipio). */
export async function bandeja(dpto, dist) {
  await iniciar();
  const susc = await all('SELECT COUNT(*) AS n, SUM(verificado) AS v FROM suscripciones WHERE dpto = ? AND dist = ? AND baja_en IS NULL', [dpto, Number(dist)]);
  const notif = await all(`SELECT n.estado, COUNT(*) AS n FROM notificaciones n JOIN suscripciones s ON s.id = n.suscripcion_id WHERE s.dpto = ? AND s.dist = ? GROUP BY n.estado`, [dpto, Number(dist)]);
  return { suscriptos: susc[0].n || 0, verificados: susc[0].v || 0, notificaciones: Object.fromEntries(notif.map(x => [x.estado, x.n])), proveedor: !!process.env.NOTIF_PROVEEDOR };
}
