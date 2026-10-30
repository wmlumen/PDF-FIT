/**
 * Gestión municipal: locales comerciales y patentes, inspecciones, planificación (POUT) y comercios no declarados.
 * - Estado del local: vigente | vencida | sin_patente | inhabilitada | no_declarada (comercio visible en OpenStreetMap
 *   dentro del distrito sin local registrado cerca).
 * - Base propia data/gestion_municipal.sqlite. Módulo de backend (Node).
 */
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import proj4 from 'proj4';
import { SECTORES, tipoCorto } from './usosOsm.js';

const require = createRequire(import.meta.url);
const RAIZ = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = process.env.GESTION_DB || join(RAIZ, 'data', 'gestion_municipal.sqlite');
const UTM = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
export const ESTADOS_LOCAL = { vigente: 'Patente vigente', vencida: 'Patente vencida', sin_patente: 'Sin patente', inhabilitada: 'Inhabilitada', no_declarada: 'No declarada' };
export const DISTANCIA_MATCH_M = 25;
class ErrorGestion extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

let db = null, listo = null;
const abrir = () => { if (!db) { mkdirSync(dirname(RUTA_DB), { recursive: true }); db = new (require('sqlite3').Database)(RUTA_DB); } return db; };
const run = (sql, p = []) => new Promise((ok, mal) => abrir().run(sql, p, function (e) { e ? mal(e) : ok(this); }));
const all = (sql, p = []) => new Promise((ok, mal) => abrir().all(sql, p, (e, r) => (e ? mal(e) : ok(r))));
export function iniciar() {
  if (listo) return listo;
  listo = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS locales (id INTEGER PRIMARY KEY AUTOINCREMENT, dpto TEXT NOT NULL, dist INTEGER NOT NULL, ctacte TEXT, nombre TEXT NOT NULL,
      rubro TEXT, ruc TEXT, patente_nro TEXT, patente_vence TEXT, inhabilitado INTEGER NOT NULL DEFAULT 0, motivo_inhabilitacion TEXT, lat REAL, lng REAL, osm_id TEXT,
      creado_por TEXT, creado_en TEXT DEFAULT (datetime('now')), actualizado_en TEXT DEFAULT (datetime('now')))`);
    await run(`CREATE TABLE IF NOT EXISTS inspecciones (id INTEGER PRIMARY KEY AUTOINCREMENT, dpto TEXT NOT NULL, dist INTEGER NOT NULL, local_id INTEGER, osm_id TEXT, ctacte TEXT,
      motivo TEXT NOT NULL, inspector TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'asignada', resultado TEXT, observacion TEXT, asignada_por TEXT,
      asignada_en TEXT DEFAULT (datetime('now')), realizada_en TEXT)`);
  })();
  return listo;
}

/** Estado de un local registrado. */
export function estadoLocal(l, hoy = new Date()) {
  if (l.inhabilitado) return 'inhabilitada';
  if (!l.patente_nro) return 'sin_patente';
  if (l.patente_vence && new Date(l.patente_vence + 'T23:59:59') < hoy) return 'vencida';
  return 'vigente';
}

// ─── comercios de OpenStreetMap por distrito ─────────────────────────────────────────────────────
let poi = null, limites = null;
const cachePoi = new Map();
function enPoligono([x, y], g) {
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  return polys.some(p => { let d = false; const r = p[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; });
}
export function rubroOsm(tags = '') {
  const m = String(tags).match(/"(shop|amenity|office|craft|tourism)"=>"([^"]+)"/);
  return m ? `${m[1]}: ${m[2]}` : 'comercio';
}
// ─── Usos de OSM por sector (data/osm/usos_py.json, ver scripts/osm-usos.mjs) ───────────────────────
let usosPais = null;
function cargarUsos() {
  if (usosPais !== null) return usosPais;
  const f = join(RAIZ, 'data', 'osm', 'usos_py.json');
  usosPais = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : false;
  return usosPais;
}
const aUso = u => ({ osm_id: u[0], nombre: u[1] || '(sin nombre en el mapa)', sector: u[2], tipo: u[3], rubro: tipoCorto(u[3]), lng: u[4], lat: u[5],
  cuenta: u[8] ?? null, id_parcela: u[9] ?? null, impuesto: u[10] ?? null, edif_m2: u[11] ?? null });
/** Todos los usos del distrito (comercios por tipo, salud, educación, gobierno…), con la cuenta DNIT de la parcela. */
export function usosDistrito(dpto, dist) {
  const u = cargarUsos();
  if (!u) return null;
  return u.usos.filter(x => x[6] === dpto && x[7] === Number(dist)).map(aUso);
}
/** Resumen por sector + cruces útiles para Habilitación de Comercio y Liquidaciones. */
export async function usos(q) {
  await iniciar();
  const [d, n] = validarDistrito(q.dpto, q.dist);
  const lista = usosDistrito(d, n);
  if (!lista) throw new ErrorGestion('Falta data/osm/usos_py.json (ejecute data/osm/usos.cmd y scripts/osm-usos.mjs)', 404);
  const reg = await all('SELECT osm_id, ctacte, lat, lng FROM locales WHERE dpto = ? AND dist = ?', [d, n]);
  const registrado = x => reg.some(l => (l.osm_id && l.osm_id === x.osm_id) || (l.lat != null && distanciaM(l, x) <= DISTANCIA_MATCH_M));
  const sectores = Object.fromEntries(Object.entries(SECTORES).map(([k, s]) => [k, { ...s, total: 0, sin_habilitar: 0 }]));
  for (const x of lista) {
    x.habilitacion = SECTORES[x.sector]?.habilitacion || false;
    x.registrado = x.habilitacion ? registrado(x) : null;
    x.sin_edificacion_declarada = x.cuenta != null && x.habilitacion && !Number(x.edif_m2);
    sectores[x.sector].total++;
    if (x.habilitacion && !x.registrado) sectores[x.sector].sin_habilitar++;
  }
  return { usos: lista, sectores,
    cruces: { requieren_habilitacion: lista.filter(x => x.habilitacion).length, sin_habilitar: lista.filter(x => x.habilitacion && !x.registrado).length,
      con_cuenta: lista.filter(x => x.cuenta).length, actividad_sin_edificacion_declarada: lista.filter(x => x.sin_edificacion_declarada).length },
    fuente: 'OpenStreetMap (ODbL) + parcelario SNC + liquidación DNIT 2026. Lo del mapa es indicio: verificar en campo.' };
}

// ─── Zonas residenciales de OSM (gris) con barrio y cuentas DNIT (scripts/osm-residencial.mjs) ────
const cacheRes = new Map();
const aWgs = c => typeof c[0] === 'number' ? proj4(UTM, 'EPSG:4326', c).map(v => +v.toFixed(6)) : c.map(aWgs);
export function residencial(q) {
  const [d, n] = validarDistrito(q.dpto, q.dist), k = `${d}_${n}`;
  if (cacheRes.has(k)) return cacheRes.get(k);
  const f = join(RAIZ, 'data', 'osm', 'residencial', `${k}.geojson`);
  if (!existsSync(f)) throw new ErrorGestion('Sin zonas residenciales para este distrito (ejecute data/osm/residencial.cmd y scripts/osm-residencial.mjs)', 404);
  const fc = JSON.parse(readFileSync(f, 'utf8'));
  const features = fc.features.map(x => ({ ...x, geometry: { type: x.geometry.type, coordinates: aWgs(x.geometry.coordinates) } }));
  const P = features.map(x => x.properties);
  const r = { type: 'FeatureCollection', features, fuente: fc.fuente,
    resumen: { zonas: P.length, ha: +P.reduce((s, x) => s + x.area_ha, 0).toFixed(1), parcelas: P.reduce((s, x) => s + x.parcelas, 0),
      cuentas_urbanas: P.reduce((s, x) => s + x.cuentas_urbanas, 0), padrones_rurales: P.reduce((s, x) => s + x.padrones_rurales, 0),
      sin_parcela_snc: P.filter(x => x.sin_parcela_snc).length, impuesto_2026: P.reduce((s, x) => s + x.impuesto_2026, 0) } };
  cacheRes.set(k, r); if (cacheRes.size > 20) cacheRes.delete(cacheRes.keys().next().value);
  return r;
}

export function comerciosOsm(dpto, dist) {
  const k = `${dpto}|${dist}`;
  if (cachePoi.has(k)) return cachePoi.get(k);
  const desdeUsos = usosDistrito(dpto, dist);
  if (desdeUsos) {
    const lista = desdeUsos.filter(x => SECTORES[x.sector]?.habilitacion).map(x => ({ ...x, rubro: `${SECTORES[x.sector].nombre}: ${x.rubro}`, ctacte: x.cuenta }));
    cachePoi.set(k, lista);
    return lista;
  }
  const fp = join(RAIZ, 'data', 'osm', 'comercios_py.geojson'), fl = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  if (!existsSync(fp) || !existsSync(fl)) return [];
  // Los puntos se proyectan una sola vez; se filtran por el recuadro del distrito antes de la prueba punto-en-polígono.
  poi = poi || JSON.parse(readFileSync(fp, 'utf8')).features.filter(f => f.geometry?.type === 'Point').map(f => ({ f, xy: proj4('EPSG:4326', UTM, f.geometry.coordinates) }));
  limites = limites || JSON.parse(readFileSync(fl, 'utf8')).features;
  const lim = limites.find(f => f.properties.cod_dpto === dpto && Number(f.properties.cod_dist) === Number(dist));
  if (!lim) return [];
  if (!lim.$caja) { let c = [Infinity, Infinity, -Infinity, -Infinity]; const rec = v => { if (typeof v[0] === 'number') c = [Math.min(c[0], v[0]), Math.min(c[1], v[1]), Math.max(c[2], v[0]), Math.max(c[3], v[1])]; else v.forEach(rec); }; rec(lim.geometry.coordinates); lim.$caja = c; }
  const [x0, y0, x1, y1] = lim.$caja;
  const lista = poi.filter(({ xy: [x, y] }) => x >= x0 && x <= x1 && y >= y0 && y <= y1).filter(({ xy }) => enPoligono(xy, lim.geometry)).map(({ f }) => f)
    .map(f => ({ osm_id: `node/${f.properties.osm_id}`, nombre: f.properties.name || '(sin nombre en el mapa)', rubro: rubroOsm(f.properties.other_tags), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
  cachePoi.set(k, lista);
  return lista;
}

const distanciaM = (a, b) => { const [x1, y1] = proj4('EPSG:4326', UTM, [a.lng, a.lat]), [x2, y2] = proj4('EPSG:4326', UTM, [b.lng, b.lat]); return Math.hypot(x2 - x1, y2 - y1); };
export function validarDistrito(dpto, dist) {
  const d = String(dpto || '').toUpperCase(), n = Number(dist);
  if (!/^[A-Z]$/.test(d) || !Number.isInteger(n)) throw new ErrorGestion('Indique dpto y dist');
  return [d, n];
}

/** Locales registrados con su estado + comercios del mapa sin registrar (no declarados). */
export async function locales(q) {
  await iniciar();
  const [d, n] = validarDistrito(q.dpto, q.dist);
  const reg = (await all('SELECT * FROM locales WHERE dpto = ? AND dist = ? ORDER BY nombre', [d, n])).map(l => ({ ...l, origen: 'registro', estado: estadoLocal(l) }));
  const osm = comerciosOsm(d, n).filter(p => !reg.some(l => (l.osm_id && l.osm_id === p.osm_id) || (l.lat != null && distanciaM(l, p) <= DISTANCIA_MATCH_M)))
    .map(p => ({ ...p, id: null, origen: 'mapa', estado: 'no_declarada' }));
  const todos = [...reg, ...osm];
  const resumen = Object.fromEntries(Object.keys(ESTADOS_LOCAL).map(k => [k, todos.filter(x => x.estado === k).length]));
  const inspecciones = await all('SELECT * FROM inspecciones WHERE dpto = ? AND dist = ? ORDER BY id DESC', [d, n]);
  return { locales: todos, resumen, inspecciones, estados: ESTADOS_LOCAL, fuente: 'Registro municipal + comercios de OpenStreetMap (ODbL) no registrados' };
}

const txt = (v, m = 160) => (v == null || v === '' ? null : String(v).trim().slice(0, m));
/** Alta o edición de un local (con patente o sin ella). */
export async function guardarLocal(b, usuario) {
  await iniciar();
  const [d, n] = validarDistrito(b.dpto, b.dist);
  if (!txt(b.nombre)) throw new ErrorGestion('Falta el nombre del local');
  if (b.patente_vence && !/^\d{4}-\d{2}-\d{2}$/.test(b.patente_vence)) throw new ErrorGestion('Vencimiento AAAA-MM-DD');
  const lat = b.lat != null && b.lat !== '' ? Number(b.lat) : null, lng = b.lng != null && b.lng !== '' ? Number(b.lng) : null;
  if ((lat != null && !(lat > -28 && lat < -19)) || (lng != null && !(lng > -63 && lng < -54))) throw new ErrorGestion('Coordenadas fuera de Paraguay');
  const v = [txt(b.ctacte, 30), txt(b.nombre), txt(b.rubro, 80), txt(b.ruc, 20), txt(b.patente_nro, 40), b.patente_vence || null, b.inhabilitado ? 1 : 0, txt(b.motivo_inhabilitacion, 200), lat, lng, txt(b.osm_id, 40)];
  if (b.id) {
    const r = await run(`UPDATE locales SET ctacte=?, nombre=?, rubro=?, ruc=?, patente_nro=?, patente_vence=?, inhabilitado=?, motivo_inhabilitacion=?, lat=?, lng=?, osm_id=?, actualizado_en=datetime('now') WHERE id=? AND dpto=? AND dist=?`, [...v, Number(b.id), d, n]);
    if (!r.changes) throw new ErrorGestion('Local no encontrado', 404);
    return { ok: true, id: Number(b.id) };
  }
  const r = await run(`INSERT INTO locales (dpto, dist, ctacte, nombre, rubro, ruc, patente_nro, patente_vence, inhabilitado, motivo_inhabilitacion, lat, lng, osm_id, creado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [d, n, ...v, String(usuario).slice(0, 80)]);
  return { ok: true, id: r.lastID };
}
/** Asigna una inspección a un inspector (local registrado, comercio no declarado o cuenta). */
export async function asignarInspeccion(b, usuario) {
  await iniciar();
  const [d, n] = validarDistrito(b.dpto, b.dist);
  if (!txt(b.motivo)) throw new ErrorGestion('Indique el motivo');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.inspector || ''))) throw new ErrorGestion('Email del inspector inválido');
  const r = await run('INSERT INTO inspecciones (dpto, dist, local_id, osm_id, ctacte, motivo, inspector, asignada_por) VALUES (?,?,?,?,?,?,?,?)',
    [d, n, b.local_id ? Number(b.local_id) : null, txt(b.osm_id, 40), txt(b.ctacte, 30), txt(b.motivo, 200), String(b.inspector).toLowerCase(), String(usuario).slice(0, 80)]);
  return { ok: true, id: r.lastID };
}
/** El inspector registra el resultado de la visita. */
export async function registrarInspeccion(id, b, usuario) {
  await iniciar();
  const resultado = String(b.resultado || '');
  if (!['conforme', 'intimado', 'clausurado', 'no_encontrado'].includes(resultado)) throw new ErrorGestion('Resultado: conforme, intimado, clausurado o no_encontrado');
  const r = await run(`UPDATE inspecciones SET estado='realizada', resultado=?, observacion=?, realizada_en=datetime('now') WHERE id=?`, [resultado, txt(b.observacion, 500), Number(id)]);
  if (!r.changes) throw new ErrorGestion('Inspección no encontrada', 404);
  void usuario;
  return { ok: true };
}

// ─── Planificación (POUT): documentos del municipio descargados del MADES ─────────────────────────
const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
export function documentosPout(nombreDistrito) {
  const f = join(RAIZ, 'data', 'mades_pout', 'manifest.json');
  if (!existsSync(f)) return [];
  const n = norm(nombreDistrito);
  return JSON.parse(readFileSync(f, 'utf8')).map((x, i) => ({ ...x, n: i })).filter(x => n && norm(x.municipio).endsWith(n))
    .map(x => ({ n: x.n, titulo: x.titulo.replace(/\.pdf$/i, ''), bytes: x.bytes, fuente: x.url }));
}
/** Ruta segura del PDF (solo dentro de data/mades_pout). */
export function archivoPout(n) {
  const f = join(RAIZ, 'data', 'mades_pout', 'manifest.json');
  const lista = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
  const x = lista[Number(n)];
  if (!x) throw new ErrorGestion('Documento no encontrado', 404);
  const base = resolve(RAIZ, 'data', 'mades_pout'), ruta = resolve(RAIZ, String(x.archivo).replace(/\\/g, '/'));
  if (!ruta.startsWith(base + sep) || !existsSync(ruta)) throw new ErrorGestion('Documento no disponible', 404);
  return { ruta, titulo: x.titulo };
}
