/**
 * Edificios de OpenStreetMap (huellas de construcción) vinculados con las parcelas oficiales del SNC y
 * comparados con la superficie edificada de la liquidación DNIT.
 *
 * - Cada edificio se asigna a la parcela que contiene al menos el 80 % de su huella ("auto").
 * - Si queda repartido entre varias parcelas, queda "pendiente" con sus candidatas para asignarlo a mano ("manual").
 * - Por parcela: m² de huella × niveles (building:levels, 1 si falta) frente a m² edificados que liquida la DNIT.
 * Coordenadas de trabajo: UTM 21S (EPSG:32721), en metros. Módulo de backend (Node).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = dirname(fileURLToPath(import.meta.url));
export const DIR_EDIF = join(RAIZ, 'data', 'edificios');
export const UMBRAL_AUTO = 0.8, UMBRAL_CANDIDATA = 0.05;

/** Área plana (m²) de un anillo [[x,y],...] por la fórmula del polígono. */
export function areaAnillo(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}
export function areaGeom(g) {
  if (!g) return 0;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
  return polys.reduce((s, p) => s + areaAnillo(p[0]) - p.slice(1).reduce((h, r) => h + areaAnillo(r), 0), 0);
}

/** Perímetro (m) del anillo exterior. */
export function perimetroGeom(g) {
  if (!g) return 0;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
  return polys.reduce((s, p) => { const r = p[0]; let l = 0; for (let i = 1; i < r.length; i++) l += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return s + l; }, 0);
}

/**
 * Techo y área cubierta no son lo mismo: el techo (lo que se ve en la imagen y dibuja OpenStreetMap) incluye los aleros;
 * el área cubierta es la construcción entre paredes, que es lo que liquida la DNIT.
 * Con un alero de ancho d alrededor de todo el perímetro P: cubierta ≈ techo − P·d + 4·d² (y al revés para pasar de cubierta a techo).
 */
export const ALERO_M = 0.6;
export function cubiertaDesdeTecho(techo, perimetro, alero = ALERO_M) { return Math.max(0, techo - perimetro * alero + 4 * alero * alero); }
export function techoDesdeCubierta(cubierta, perimetro, alero = ALERO_M) { return cubierta + perimetro * alero + 4 * alero * alero; }
/** m² que faltan declarar: construido (cubierta × pisos) menos lo liquidado; 0 si se declaró igual o más. */
export function m2ACompletar(construidoM2, declaradoM2) { return Math.max(0, Math.round(((Number(construidoM2) || 0) - (Number(declaradoM2) || 0)) * 10) / 10); }

/** Clasifica la diferencia entre lo que se ve construido (OSM) y lo que se liquida (DNIT). */
export function compararEdificacion(osmM2, dnitM2) {
  const o = Number(osmM2) || 0, d = Number(dnitM2) || 0;
  if (o <= 0 && d <= 0) return { estado: 'sin_edificacion', etiqueta: 'Sin edificación' };
  if (o > 0 && d <= 0) return { estado: 'no_declarada', etiqueta: 'Construcción no declarada en la liquidación' };
  if (o <= 0 && d > 0) return { estado: 'sin_huella', etiqueta: 'Edificación liquidada sin huella en el mapa' };
  const r = d / o;
  if (r < 0.7) return { estado: 'menor_declarada', etiqueta: `Se liquida menos de lo construido (${Math.round(r * 100)} %)`, razon: r };
  if (r > 1.5) return { estado: 'mayor_declarada', etiqueta: `Se liquida más de lo que muestra el mapa (${Math.round(r * 100)} %)`, razon: r };
  return { estado: 'coincide', etiqueta: 'Coincide (±30 % / +50 %)', razon: r };
}

/** Parte de la huella de un edificio que cae en cada parcela; asigna si una parcela tiene ≥ 80 %. */
export function asignarEdificio(edif, parcelas, intersectar) {
  const total = areaGeom(edif.geometry);
  if (!total) return { estado: 'sin_parcela', candidatas: [] };
  const candidatas = [];
  for (const p of parcelas) {
    const inter = intersectar(edif.geometry, p.geometry);
    const a = inter ? areaGeom(inter) : 0;
    if (a / total >= UMBRAL_CANDIDATA) candidatas.push({ id_parcela: p.properties.id_parcela, ctacte: etiquetaParcela(p.properties), pct: Math.round(a / total * 1000) / 10 });
  }
  candidatas.sort((a, b) => b.pct - a.pct);
  if (!candidatas.length) return { estado: 'sin_parcela', candidatas };
  const [p1, p2] = [candidatas[0].pct / 100, (candidatas[1]?.pct || 0) / 100];
  // Automática: una parcela con ≥ 80 %, o con ≥ 60 % y al menos el doble que la segunda (corrimientos de dibujo de pocos metros).
  if (p1 >= UMBRAL_AUTO || (p1 >= 0.6 && p1 >= 2 * p2)) return { estado: 'auto', id_parcela: candidatas[0].id_parcela, candidatas };
  return { estado: 'pendiente', candidatas };
}

export function etiquetaParcela(p = {}) {
  if (p.dnit_ctacte) return p.dnit_ctacte;
  if (p.zona != null && p.mz != null && p.lote != null) return `${String(p.zona).padStart(2, '0')}${String(p.mz).padStart(4, '0')}-${String(p.lote).padStart(2, '0')}`;
  return p.padron != null ? `Padrón ${p.padron}` : `Parcela ${p.id_parcela}`;
}

/** Recalcula el resumen por parcela a partir de los edificios asignados (auto o manual). */
export function resumenPorParcela(edificios, parcelasPorId) {
  const acc = new Map();
  for (const e of edificios) {
    const p = e.properties;
    if (!(p.estado === 'auto' || p.estado === 'manual') || p.id_parcela == null) continue;
    const a = acc.get(p.id_parcela) || { huella_m2: 0, cubierta_m2: 0, construido_m2: 0, edificios: 0 };
    // La huella del mapa es techo: se compara el área cubierta estimada (sin aleros) por la cantidad de pisos.
    const cub = p.m2_cubierta ?? cubiertaDesdeTecho(p.m2, p.perimetro_m || 0);
    a.huella_m2 += p.m2; a.cubierta_m2 += cub; a.construido_m2 += cub * (p.niveles || 1); a.edificios++;
    acc.set(p.id_parcela, a);
  }
  const salida = [];
  for (const [id, par] of parcelasPorId) {
    const a = acc.get(id) || { huella_m2: 0, cubierta_m2: 0, construido_m2: 0, edificios: 0 };
    const dnit = par.properties.dnit_sup_edif_m2 ?? null;
    if (!a.edificios && !(dnit > 0)) continue;
    const c = compararEdificacion(a.construido_m2, dnit);
    salida.push({ id_parcela: id, ctacte: etiquetaParcela(par.properties), edificios: a.edificios, huella_m2: Math.round(a.huella_m2 * 10) / 10,
      techo_m2: Math.round(a.huella_m2 * 10) / 10, cubierta_m2: Math.round(a.cubierta_m2 * 10) / 10,
      construido_osm_m2: Math.round(a.construido_m2 * 10) / 10, edificado_dnit_m2: dnit, m2_a_completar: m2ACompletar(a.construido_m2, dnit), ...c });
  }
  return salida;
}

// ─── archivos y asignación manual ───────────────────────────────────────────────────────────────
const ruta = (dpto, dist, sufijo) => join(DIR_EDIF, `${dpto}_${dist}_${sufijo}`);
export function validarDistrito(dpto, dist) {
  const d = String(dpto || '').toUpperCase(), n = Number(dist);
  if (!/^[A-Z]$/.test(d) || !Number.isInteger(n) || n < 0 || n > 99) throw Object.assign(new Error('Indique dpto (letra) y dist (número)'), { status: 400 });
  return [d, n];
}
export function leerEdificios(dpto, dist) {
  const [d, n] = validarDistrito(dpto, dist);
  const f = ruta(d, n, 'edificios.geojson');
  if (!existsSync(f)) throw Object.assign(new Error(`Sin edificios descargados para ${d}|${n} (node scripts/osm-edificios.mjs --dpto ${d} --dist ${n})`), { status: 404 });
  return JSON.parse(readFileSync(f, 'utf8'));
}
const sqlite = () => { const s = require('sqlite3'); mkdirSync(DIR_EDIF, { recursive: true }); return new s.Database(join(DIR_EDIF, 'asignaciones.sqlite')); };
const ejecutar = (db, sql, p = []) => new Promise((ok, mal) => db.run(sql, p, e => (e ? mal(e) : ok())));
const todas = (db, sql, p = []) => new Promise((ok, mal) => db.all(sql, p, (e, r) => (e ? mal(e) : ok(r))));
export async function asignacionesManuales(dpto, dist) {
  const db = sqlite();
  try {
    await ejecutar(db, `CREATE TABLE IF NOT EXISTS asignaciones (dpto TEXT, dist INTEGER, osm_id TEXT, id_parcela INTEGER, usuario TEXT, fecha TEXT DEFAULT (datetime('now')), PRIMARY KEY (dpto, dist, osm_id))`);
    return new Map((await todas(db, 'SELECT osm_id, id_parcela, usuario, fecha FROM asignaciones WHERE dpto = ? AND dist = ?', [dpto, dist])).map(r => [r.osm_id, r]));
  } finally { db.close(); }
}
/** Asigna a mano un edificio a una de sus parcelas candidatas y recalcula el resumen del distrito. */
export async function asignarManual({ dpto, dist, osm_id, id_parcela }, usuario = 'anónimo') {
  const [d, n] = validarDistrito(dpto, dist);
  const fc = leerEdificios(d, n);
  const e = fc.features.find(x => String(x.properties.osm_id) === String(osm_id));
  if (!e) throw Object.assign(new Error('Edificio no encontrado'), { status: 404 });
  const idp = Number(id_parcela);
  if (!e.properties.candidatas?.some(c => c.id_parcela === idp)) throw Object.assign(new Error('La parcela elegida no es candidata para ese edificio'), { status: 400 });
  const db = sqlite();
  try {
    await ejecutar(db, `CREATE TABLE IF NOT EXISTS asignaciones (dpto TEXT, dist INTEGER, osm_id TEXT, id_parcela INTEGER, usuario TEXT, fecha TEXT DEFAULT (datetime('now')), PRIMARY KEY (dpto, dist, osm_id))`);
    await ejecutar(db, `INSERT INTO asignaciones (dpto, dist, osm_id, id_parcela, usuario) VALUES (?,?,?,?,?)
      ON CONFLICT(dpto, dist, osm_id) DO UPDATE SET id_parcela = excluded.id_parcela, usuario = excluded.usuario, fecha = datetime('now')`, [d, n, String(osm_id), idp, String(usuario).slice(0, 80)]);
  } finally { db.close(); }
  Object.assign(e.properties, { estado: 'manual', id_parcela: idp, asignado_por: String(usuario).slice(0, 80) });
  const parcelas = JSON.parse(readFileSync(ruta(d, n, 'parcelas_ref.json'), 'utf8'));
  const porId = new Map(parcelas.map(p => [p.properties.id_parcela, p]));
  const resumen = resumenPorParcela(fc.features, porId);
  aplicarResumen(fc, resumen);
  writeFileSync(ruta(d, n, 'edificios.geojson'), JSON.stringify(fc));
  writeFileSync(ruta(d, n, 'comparacion.json'), JSON.stringify(resumen));
  return { ok: true, edificio: e.properties, parcela: resumen.find(r => r.id_parcela === idp) || null };
}
/** Copia a cada edificio el resultado de la comparación de su parcela (para colorear el mapa). */
export function aplicarResumen(fc, resumen) {
  const porId = new Map(resumen.map(r => [r.id_parcela, r]));
  for (const e of fc.features) {
    const r = e.properties.id_parcela != null ? porId.get(e.properties.id_parcela) : null;
    Object.assign(e.properties, { comparacion: r?.estado ?? null, comparacion_texto: r?.etiqueta ?? null, parcela_ctacte: r?.ctacte ?? null,
      parcela_construido_osm_m2: r?.construido_osm_m2 ?? null, parcela_edificado_dnit_m2: r?.edificado_dnit_m2 ?? null, parcela_m2_a_completar: r?.m2_a_completar ?? null });
  }
  fc.resumen = resumen.reduce((a, r) => { a[r.estado] = (a[r.estado] || 0) + 1; return a; }, {});
  fc.pendientes = fc.features.filter(e => e.properties.estado === 'pendiente').length;
}

// ─── Relevamientos dibujados en el visor (construcciones medidas a mano) ─────────────────────────
const CREAR_RELEV = `CREATE TABLE IF NOT EXISTS relevamientos (id INTEGER PRIMARY KEY AUTOINCREMENT, dpto TEXT, dist INTEGER, id_parcela INTEGER, ctacte TEXT,
  trazo TEXT, alero_m REAL, niveles INTEGER, pisos_json TEXT, m2_techo REAL, m2_cubierta REAL, construido_m2 REAL, declarado_m2 REAL, m2_a_completar REAL,
  perimetro_m REAL, lados_json TEXT, geojson TEXT, usuario TEXT, fecha TEXT DEFAULT (datetime('now')))`;
/** Valida y calcula un relevamiento a partir de lo medido en el mapa (los m² los recalcula el servidor). */
export function calcularRelevamiento({ area_m2, perimetro_m, trazo = 'techo', alero_m = ALERO_M, niveles = 1, declarado_m2 = null, pisos_m2 = null }) {
  const A = Number(area_m2), P = Number(perimetro_m), d = Math.min(3, Math.max(0, Number(alero_m))), n = Math.min(60, Math.max(1, Math.round(Number(niveles) || 1)));
  if (!(A > 0 && A < 1e6) || !(P > 0)) throw Object.assign(new Error('Área o perímetro inválidos'), { status: 400 });
  const esTecho = trazo !== 'cubierta';
  const techo = esTecho ? A : techoDesdeCubierta(A, P, d), cubierta = esTecho ? cubiertaDesdeTecho(A, P, d) : A;
  // Edificación en altura: m² de cada piso (planta baja … último). Si no se informan, cada piso = área cubierta.
  let pisos = Array.isArray(pisos_m2) && pisos_m2.length ? pisos_m2.slice(0, 60).map(Number) : null;
  if (pisos && pisos.some(v => !(v >= 0 && v < 1e6))) throw Object.assign(new Error('m² por piso inválidos'), { status: 400 });
  if (!pisos) pisos = Array.from({ length: n }, () => cubierta);
  const construido = pisos.reduce((a, b) => a + b, 0), dec = declarado_m2 == null || declarado_m2 === '' ? null : Number(declarado_m2);
  const r1 = v => Math.round(v * 10) / 10;
  return { trazo: esTecho ? 'techo' : 'cubierta', alero_m: d, niveles: pisos.length, pisos_m2: pisos.map(r1), m2_techo: r1(techo), m2_cubierta: r1(cubierta), construido_m2: r1(construido),
    declarado_m2: dec, m2_a_completar: dec == null ? null : m2ACompletar(construido, dec), perimetro_m: r1(P) };
}
export async function guardarRelevamiento(body = {}, usuario = 'usuario') {
  const [d, n] = validarDistrito(body.dpto, body.dist);
  const c = calcularRelevamiento(body);
  const geo = JSON.stringify(body.geometry || null);
  if (geo.length > 200000) throw Object.assign(new Error('Geometría demasiado grande'), { status: 400 });
  const db = sqlite();
  try {
    await ejecutar(db, CREAR_RELEV);
    const cols = await todas(db, 'PRAGMA table_info(relevamientos)');
    if (!cols.some(c => c.name === 'pisos_json')) await ejecutar(db, 'ALTER TABLE relevamientos ADD COLUMN pisos_json TEXT');
    await ejecutar(db, `INSERT INTO relevamientos (dpto, dist, id_parcela, ctacte, trazo, alero_m, niveles, pisos_json, m2_techo, m2_cubierta, construido_m2, declarado_m2, m2_a_completar, perimetro_m, lados_json, geojson, usuario)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [d, n, body.id_parcela != null ? Number(body.id_parcela) : null, String(body.ctacte || '').slice(0, 40), c.trazo, c.alero_m, c.niveles, JSON.stringify(c.pisos_m2),
      c.m2_techo, c.m2_cubierta, c.construido_m2, c.declarado_m2, c.m2_a_completar, c.perimetro_m, JSON.stringify((body.lados_m || []).slice(0, 200).map(Number)), geo, String(usuario).slice(0, 80)]);
  } finally { db.close(); }
  return { ok: true, ...c };
}
export async function listarRelevamientos(dpto, dist) {
  const [d, n] = validarDistrito(dpto, dist);
  const db = sqlite();
  try {
    await ejecutar(db, CREAR_RELEV);
    const cols = await todas(db, 'PRAGMA table_info(relevamientos)');
    if (!cols.some(c => c.name === 'pisos_json')) await ejecutar(db, 'ALTER TABLE relevamientos ADD COLUMN pisos_json TEXT');
    return await todas(db, `SELECT id, ctacte, trazo, alero_m, niveles, pisos_json, m2_techo, m2_cubierta, construido_m2, declarado_m2, m2_a_completar, perimetro_m, lados_json, usuario, fecha
      FROM relevamientos WHERE dpto = ? AND dist = ? ORDER BY id DESC`, [d, n]);
  } finally { db.close(); }
}

// ─── Edificios por vista (rápido): el distrito queda en memoria y se entrega solo lo visible ─────
const cacheVista = new Map();   // "D|12" → { mtime, resumen, pendientes, items: [{ caja:[w,s,e,n], f }] }
const MAX_EDIF_VISTA = 6000;
function edificiosEnMemoria(dpto, dist) {
  const f = ruta(dpto, dist, 'edificios.geojson');
  if (!existsSync(f)) return null;
  const mtime = statSync(f).mtimeMs, k = `${dpto}|${dist}`;
  const c = cacheVista.get(k);
  if (c && c.mtime === mtime) return c;
  const fc = JSON.parse(readFileSync(f, 'utf8'));
  // Pisos estimados con la liquidación: si la parcela liquida entre 1,5 y 8 veces lo construido en el mapa,
  // es casi seguro un edificio de varios pisos (OpenStreetMap rara vez trae building:levels).
  const pisosDnit = new Map();
  try {
    const fcmp = ruta(dpto, dist, 'comparacion.json');
    if (existsSync(fcmp)) for (const c of JSON.parse(readFileSync(fcmp, 'utf8'))) {
      const r = (Number(c.edificado_dnit_m2) || 0) / Math.max(1, Number(c.construido_osm_m2) || 0);
      if (r >= 1.5 && r <= 8) pisosDnit.set(c.id_parcela, Math.round(r));
    }
  } catch { /* sin comparación: se usan los pisos del mapa */ }
  const items = fc.features.map(x => {
    const pr = x.properties;
    if (!pr.niveles_informados && pisosDnit.has(pr.id_parcela)) { pr.niveles_dnit = pisosDnit.get(pr.id_parcela); }
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    const rec = v => { if (typeof v[0] === 'number') { w = Math.min(w, v[0]); s = Math.min(s, v[1]); e = Math.max(e, v[0]); n = Math.max(n, v[1]); } else v.forEach(rec); };
    rec(x.geometry.coordinates);
    x.properties.dpto = dpto; x.properties.dist = dist;   // para asignar desde el visor sin conocer el distrito
    return { caja: [w, s, e, n], f: x };
  });
  const v = { mtime, resumen: fc.resumen || {}, pendientes: fc.pendientes || 0, total: fc.features.length, items };
  cacheVista.set(k, v);
  while (cacheVista.size > 12) cacheVista.delete(cacheVista.keys().next().value);
  return v;
}
/** Edificios visibles en el recuadro WGS84 { minX, minY, maxX, maxY }, de los distritos que lo tocan. */
export function edificiosEnVista(q, distritos) {
  const [minX, minY, maxX, maxY] = ['minX', 'minY', 'maxX', 'maxY'].map(k => Number(q[k]));
  const features = [], resumen = [];
  for (const d of distritos) {
    const v = edificiosEnMemoria(d.dpto, d.dist);
    if (!v) continue;
    resumen.push({ distrito: `${d.dpto}|${d.dist}`, total: v.total, pendientes: v.pendientes, porEstado: v.resumen });
    for (const it of v.items) {
      const [w, s, e, n] = it.caja;
      if (w <= maxX && e >= minX && s <= maxY && n >= minY) { features.push(it.f); if (features.length >= MAX_EDIF_VISTA) break; }
    }
  }
  return { type: 'FeatureCollection', features, count: features.length, distritos: resumen };
}
