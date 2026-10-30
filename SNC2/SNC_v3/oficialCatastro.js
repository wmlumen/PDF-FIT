/**
 * Conector al catastro oficial abierto (PM-35) y geocodificador de direcciones (PM-38).
 * Ver docs/PLAN_MEJORA_PRODUCTO_2026-10-27.md.
 *
 * Fuente: GeoServer público de catastro.gov.py (WFS 2.0). Las capas se piden en su sistema nativo
 * (EPSG:32721, UTM 21S) y se reproyectan aquí a WGS84: si se pide srsName=EPSG:4326 el servidor redondea
 * a 4 decimales (~10 m de error).
 *
 * En los datos oficiales `ccatastral`, `padron` y `nro_matricula` suelen venir vacíos (verificado
 * 2026-10-27, objectid 1109243): las búsquedas aceptan también la clave compuesta
 * dpto|dist|#|zona|mz|lote|#|# (`clave_comparacion`), la finca y zona/mz/lote.
 *
 * Módulo de backend (Node). No importar desde js/ (AGENTS.md §1).
 */
import proj4 from 'proj4';

export const WFS_URL = process.env.CATASTRO_WFS_URL || 'https://www.catastro.gov.py/geoserver/ows';
export const FUENTE = 'Catastro nacional — GeoServer público de catastro.gov.py (WFS). Datos referenciales.';
const UTM21S = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const AGENTE = 'CatastroPYPro/3 (SNC v3; uso técnico de apoyo)';

/** Capas oficiales permitidas (lista cerrada: nunca se arma el typeName con texto del usuario). */
export const CAPAS = {
  parcelas: 'snc:parcelas_activas',
  departamentos: 'snc:ly_dpto',
  distritos: 'snc:ly_dist',
  ejido_urbano: 'snc:ly_urba',
  seguridad_fronteriza: 'snc:area_afectada'
};

const CAMPOS_PARCELA = ['id', 'objectid', 'dpto', 'dist', 'zona', 'mz', 'lote', 'finca', 'ccatastral', 'padron',
  'nro_matricula', 'mz_agr', 'lote_agr', 'tipo_cuenta', 'referencia', 'clave_comparacion', 'superficie_edificado'];

/** Área máxima de un pedido por recuadro, en grados² (~1,2 km × 1,2 km) para no descargar miles de parcelas. */
export const MAX_AREA_BBOX = 0.00012;
export const MAX_ENTIDADES = 2000;

// ─── validación (todo valor que entra en un filtro CQL pasa por aquí) ───────────────────────────────

export function entero(v, nombre, { min = 0, max = 999999999 } = {}) {
  if (v === undefined || v === null || v === '') return null;
  if (!/^\d{1,9}$/.test(String(v).trim())) throw new ErrorValidacion(`${nombre} debe ser un número entero`);
  const n = Number(v);
  if (n < min || n > max) throw new ErrorValidacion(`${nombre} fuera de rango`);
  return n;
}

export function letraDpto(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toUpperCase();
  if (!/^[A-Z]$/.test(s)) throw new ErrorValidacion('dpto debe ser una letra de departamento (A a Z)');
  return s;
}

export function textoSeguro(v, nombre, re = /^[0-9A-Za-z.\-/ ]{1,30}$/) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim();
  if (!re.test(s)) throw new ErrorValidacion(`${nombre} tiene caracteres no permitidos`);
  return s.replace(/'/g, "''");
}

export class ErrorValidacion extends Error {
  constructor(m) { super(m); this.name = 'ErrorValidacion'; this.status = 400; }
}

export function validarBbox({ minX, minY, maxX, maxY }, maxArea = MAX_AREA_BBOX) {
  const b = [minX, minY, maxX, maxY].map(Number);
  if (b.some(x => !Number.isFinite(x))) throw new ErrorValidacion('Faltan o son inválidos minX, minY, maxX, maxY (WGS84)');
  const [x1, y1, x2, y2] = b;
  if (x1 >= x2 || y1 >= y2) throw new ErrorValidacion('Recuadro inválido');
  if (x1 < -63 || x2 > -54 || y1 < -28 || y2 > -19) throw new ErrorValidacion('El recuadro debe estar dentro de Paraguay');
  if ((x2 - x1) * (y2 - y1) > maxArea) throw new ErrorValidacion('Recuadro demasiado grande: acerque el mapa (zoom 16 o más)');
  return b;
}

/** Filtro CQL para buscar parcelas por Cta. Cte., clave compuesta, finca o zona/mz/lote. */
export function filtroBusqueda(q = {}) {
  const partes = [];
  const ccc = textoSeguro(q.ccatastral, 'ccatastral');
  if (ccc) partes.push(`ccatastral='${ccc}'`);
  const clave = textoSeguro(q.clave, 'clave', /^[A-Za-z]\|\d{1,4}\|[#\d]{1,4}\|\d{1,4}\|\d{1,5}\|\d{1,5}\|[#\d]{1,5}\|[#\d]{1,5}$/);
  if (clave) partes.push(`clave_comparacion='${clave.toUpperCase()}'`);
  const dpto = letraDpto(q.dpto);
  if (dpto) partes.push(`dpto='${dpto}'`);
  for (const campo of ['dist', 'zona', 'mz', 'lote', 'finca']) {
    const n = entero(q[campo], campo);
    if (n !== null) partes.push(`${campo}=${n}`);
  }
  if (!partes.length) throw new ErrorValidacion('Indique ccatastral, clave, finca o dpto/dist/zona/mz/lote');
  const soloUbicacion = !ccc && !clave && !q.finca;
  if (soloUbicacion && partes.length < 3) throw new ErrorValidacion('Para buscar sin finca ni Cta. Cte. indique al menos dpto, dist y zona/mz/lote');
  return partes.join(' AND ');
}

/** Interpreta lo que escribe una persona: "finca 15783", "A|5|#|14|885|20|#|#", "D-12-19-58-5" (dpto-dist-zona-mz-lote). */
export function interpretarConsultaCatastral(texto) {
  const t = String(texto || '').trim();
  let m = t.match(/^finca\s*(?:n[°º.]?\s*)?(\d{1,9})(?:\s+(?:dist(?:rito)?\s*)?(\d{1,4}))?$/i);
  if (m) return { finca: m[1], ...(m[2] ? { dist: m[2] } : {}) };
  if (/^[A-Za-z]\|/.test(t)) return { clave: t };
  m = t.match(/^([A-Za-z])[-\s/](\d{1,4})[-\s/](\d{1,4})[-\s/](\d{1,5})[-\s/](\d{1,5})$/);
  if (m) return { dpto: m[1], dist: m[2], zona: m[3], mz: m[4], lote: m[5] };
  // Zona-manzana-lote sin departamento ni distrito: 27-2815-18, 27/2815/18, 27 2815 18, 27.2815.18
  // y la forma de la Cta. Cte. urbana 272815-18 (o 272815-18/00-000). Se busca en todo el país.
  m = t.match(/^(\d{1,4})\s*[-/.\s]\s*(\d{1,5})\s*[-/.\s]\s*(\d{1,5})$/);
  if (m) return { zona: String(Number(m[1])), mz: String(Number(m[2])), lote: String(Number(m[3])) };
  m = t.match(/^(\d{2})(\d{4})\s*-\s*(\d{1,3})(?:\s*\/\s*\d{1,2}\s*-\s*\d{1,3})?$/);
  if (m) return { zona: String(Number(m[1])), mz: String(Number(m[2])), lote: String(Number(m[3])) };
  m = t.match(/^(?:cta\.?\s*cte\.?|ccc|cuenta)\s*[:#]?\s*([0-9A-Za-z.\-/]{3,30})$/i);
  if (m) return { ccatastral: m[1] };
  return null;
}

// ─── geometría ──────────────────────────────────────────────────────────────────────────────────

export function aUtm(lng, lat) { return proj4('EPSG:4326', UTM21S, [lng, lat]); }
function aGeo([x, y]) { const [lng, lat] = proj4(UTM21S, 'EPSG:4326', [x, y]); return [+lng.toFixed(8), +lat.toFixed(8)]; }

function reproyectar(c) { return typeof c[0] === 'number' ? aGeo(c) : c.map(reproyectar); }

function areaAnillo(r) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a) / 2;
}

/** Superficie en m² de una geometría en UTM (polígonos con huecos). */
export function superficieUtm(g) {
  if (!g) return null;
  const pols = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  if (!pols.length) return null;
  return pols.reduce((s, p) => s + areaAnillo(p[0]) - p.slice(1).reduce((h, r) => h + areaAnillo(r), 0), 0);
}

/** Convierte la respuesta WFS (UTM 21S) a GeoJSON WGS84 con propiedades acotadas y superficie calculada. */
export function normalizar(fc, capa = 'parcelas', consultado = new Date().toISOString()) {
  const features = (fc?.features || []).map(f => {
    const p = f.properties || {};
    const props = capa === 'parcelas'
      ? Object.fromEntries(CAMPOS_PARCELA.filter(k => k in p).map(k => [k, typeof p[k] === 'string' ? p[k].trim() : p[k]]))
      : Object.fromEntries(Object.entries(p).filter(([k, v]) => k !== 'shape' && (v === null || typeof v !== 'object')));
    const sup = superficieUtm(f.geometry);
    if (sup !== null) props.superficie_m2 = Math.round(sup * 10) / 10;
    return {
      type: 'Feature', id: p.objectid ?? f.id,
      properties: props,
      geometry: f.geometry ? { type: f.geometry.type, coordinates: reproyectar(f.geometry.coordinates) } : null
    };
  });
  return { type: 'FeatureCollection', features, count: features.length, total: fc?.numberMatched ?? null, fuente: FUENTE, consultado };
}

// ─── WFS ────────────────────────────────────────────────────────────────────────────────────────

export function urlWfs({ capa = 'parcelas', cql, bboxUtm, count = MAX_ENTIDADES }) {
  const typeName = CAPAS[capa];
  if (!typeName) throw new ErrorValidacion('Capa desconocida');
  const q = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: typeName,
    outputFormat: 'application/json', count: String(Math.min(count, MAX_ENTIDADES))
  });
  if (bboxUtm) q.set('bbox', `${bboxUtm.map(v => v.toFixed(2)).join(',')},EPSG:32721`);
  if (cql) q.set('cql_filter', cql);
  return `${WFS_URL}?${q.toString()}`;
}

/** Caché en memoria con vencimiento (los datos oficiales cambian poco). */
export class Cache {
  constructor(max = 500, ttlMs = 6 * 3600 * 1000) { this.max = max; this.ttl = ttlMs; this.m = new Map(); }
  get(k) {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (Date.now() - e.t > this.ttl) { this.m.delete(k); return undefined; }
    this.m.delete(k); this.m.set(k, e);
    return e.v;
  }
  set(k, v) {
    this.m.set(k, { v, t: Date.now() });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value);
  }
}

const cacheWfs = new Cache();

async function pedirWfs(url, fetchImpl = fetch) {
  const enCache = cacheWfs.get(url);
  if (enCache) return enCache;
  const r = await fetchImpl(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw Object.assign(new Error(`El catastro oficial respondió ${r.status}`), { status: 502 });
  const texto = await r.text();
  let json;
  try { json = JSON.parse(texto); } catch { throw Object.assign(new Error('Respuesta no válida del catastro oficial'), { status: 502 }); }
  cacheWfs.set(url, json);
  return json;
}

function bboxAUtm([x1, y1, x2, y2]) {
  const a = aUtm(x1, y1), b = aUtm(x2, y2);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

export async function parcelasEnRecuadro(params, fetchImpl) {
  const b = validarBbox(params);
  return normalizar(await pedirWfs(urlWfs({ capa: 'parcelas', bboxUtm: bboxAUtm(b) }), fetchImpl));
}

export async function capaEnRecuadro(capa, params, fetchImpl) {
  if (!CAPAS[capa] || capa === 'parcelas') throw new ErrorValidacion('Capa desconocida');
  const b = validarBbox(params, 4);   // capas de referencia: hasta ~2° × 2°
  return normalizar(await pedirWfs(urlWfs({ capa, bboxUtm: bboxAUtm(b), count: 200 }), fetchImpl), capa);
}

export async function parcelaEnPunto({ lat, lng }, fetchImpl) {
  const la = Number(lat), lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -28 || la > -19 || lo < -63 || lo > -54) {
    throw new ErrorValidacion('Coordenadas inválidas o fuera de Paraguay');
  }
  const [x, y] = aUtm(lo, la);
  const cql = `INTERSECTS(shape,POINT(${x.toFixed(2)} ${y.toFixed(2)}))`;
  return normalizar(await pedirWfs(urlWfs({ capa: 'parcelas', cql, count: 5 }), fetchImpl));
}

/** Radio aceptado para buscar parcelas alrededor de un punto (precisión del GPS), en metros. */
export function radioGps(r) {
  const n = Number(r);
  if (!Number.isFinite(n) || n <= 0) throw new ErrorValidacion('radio inválido');
  return Math.min(300, Math.max(15, Math.round(n)));
}

/** Parcelas oficiales que tocan el círculo de radio r (m) alrededor de un punto. */
export async function parcelasEnRadio({ lat, lng, radio }, fetchImpl) {
  const la = Number(lat), lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -28 || la > -19 || lo < -63 || lo > -54) {
    throw new ErrorValidacion('Coordenadas inválidas o fuera de Paraguay');
  }
  const r = radioGps(radio);
  const [x, y] = aUtm(lo, la);
  const cql = `DWITHIN(shape,POINT(${x.toFixed(2)} ${y.toFixed(2)}),${r},meters)`;
  const fc = normalizar(await pedirWfs(urlWfs({ capa: 'parcelas', cql, count: 400 }), fetchImpl));
  fc.radio = r;
  return fc;
}

export async function buscarParcela(query, fetchImpl) {
  const cql = filtroBusqueda(query);
  return normalizar(await pedirWfs(urlWfs({ capa: 'parcelas', cql, count: 50 }), fetchImpl));
}

// ─── Geocodificador (PM-38) ─────────────────────────────────────────────────────────────────────
// Nominatim (OpenStreetMap) por defecto: máximo 1 consulta por segundo, User-Agent identificable, caché y
// atribución obligatoria. Con GEOCODER_URL apuntando a un Photon propio se usa ese en su lugar.

export const GEOCODER = {
  nominatim: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search',
  photon: process.env.GEOCODER_URL || '',
  contacto: process.env.NOMINATIM_CONTACTO || '',
  atribucion: 'Búsqueda de direcciones © OpenStreetMap (ODbL)'
};

const cacheGeo = new Cache(1000, 7 * 24 * 3600 * 1000);
let ultimaConsulta = 0;
let cola = Promise.resolve();

/** Serializa las llamadas y deja al menos `ms` entre una y otra. */
export function conIntervalo(fn, ms = 1100, ahora = () => Date.now(), dormir = t => new Promise(r => setTimeout(r, t))) {
  const tarea = cola.then(async () => {
    const espera = ultimaConsulta + ms - ahora();
    if (espera > 0) await dormir(espera);
    ultimaConsulta = ahora();
    return fn();
  });
  cola = tarea.catch(() => {});
  return tarea;
}

export function textoDireccion(q) {
  const s = String(q || '').replace(/\s+/g, ' ').trim();
  if (s.length < 3) throw new ErrorValidacion('Escriba al menos 3 caracteres');
  if (s.length > 120) throw new ErrorValidacion('Búsqueda demasiado larga');
  return s;
}

export function parseNominatim(lista) {
  return (Array.isArray(lista) ? lista : []).map(r => ({
    nombre: r.display_name, lat: Number(r.lat), lng: Number(r.lon), tipo: r.type || r.category || '',
    bbox: Array.isArray(r.boundingbox) ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])] : null
  })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

export function parsePhoton(fc) {
  return (fc?.features || []).map(f => {
    const p = f.properties || {};
    const nombre = [p.name, p.street && [p.street, p.housenumber].filter(Boolean).join(' '), p.city || p.district, p.state].filter(Boolean).join(', ');
    return { nombre, lat: f.geometry?.coordinates?.[1], lng: f.geometry?.coordinates?.[0], tipo: p.osm_value || '', bbox: p.extent || null };
  }).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

export async function geocodificar(q, fetchImpl = fetch) {
  const texto = textoDireccion(q);
  const clave = texto.toLowerCase();
  const enCache = cacheGeo.get(clave);
  if (enCache) return enCache;
  let resultados;
  if (GEOCODER.photon) {
    const u = `${GEOCODER.photon}?${new URLSearchParams({ q: texto, limit: '6', bbox: '-62.7,-27.7,-54.2,-19.2', lang: 'es' })}`;
    const r = await fetchImpl(u, { signal: AbortSignal.timeout(15000) });
    resultados = parsePhoton(await r.json());
  } else {
    const params = { q: texto, format: 'jsonv2', countrycodes: 'py', limit: '6', 'accept-language': 'es' };
    if (GEOCODER.contacto) params.email = GEOCODER.contacto;
    const u = `${GEOCODER.nominatim}?${new URLSearchParams(params)}`;
    resultados = await conIntervalo(async () => {
      const r = await fetchImpl(u, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw Object.assign(new Error(`El servicio de direcciones respondió ${r.status}`), { status: 502 });
      return parseNominatim(await r.json());
    });
  }
  const res = { resultados, atribucion: GEOCODER.atribucion };
  cacheGeo.set(clave, res);
  return res;
}
