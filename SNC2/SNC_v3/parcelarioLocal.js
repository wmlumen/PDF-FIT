/**
 * Parcelas oficiales servidas desde el parcelario descargado (data/parcelario/<DPTO>_<DIST>.geojson, EPSG:32721,
 * ya vinculado con la liquidación DNIT por scripts/snc-parcelario.mjs). Mucho más rápido que consultar el WFS del SNC.
 *   - parcelasEnVista(bbox WGS84): lo que se ve en pantalla (primero).
 *   - parcelasDeDistrito(dpto, dist, pagina): el resto del distrito por páginas (después, en segundo plano).
 * Distritos en memoria con caché LRU; cada parcela se reproyecta a WGS84 una sola vez. Módulo de backend (Node).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DIR = join(RAIZ, 'data', 'parcelario');
const UTM = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const aGeo = c => (typeof c[0] === 'number' ? proj4(UTM, 'EPSG:4326', c).map(v => Math.round(v * 1e7) / 1e7) : c.map(aGeo));
const aUtm = (lng, lat) => proj4('EPSG:4326', UTM, [lng, lat]);
export const MAX_VISTA = 4000, PAGINA = 4000, MAX_DISTRITOS_EN_MEMORIA = 12;

class ErrorParcelario extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

// Recuadro (UTM) de cada distrito, para saber qué archivos tocan la vista.
let limites = null;
function limitesDistritos() {
  if (limites) return limites;
  const f = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  limites = [];
  if (!existsSync(f)) return limites;
  for (const d of JSON.parse(readFileSync(f, 'utf8')).features) {
    if (!d.geometry) continue;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    const rec = c => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]); } else c.forEach(rec); };
    rec(d.geometry.coordinates);
    limites.push({ dpto: d.properties.cod_dpto, dist: Number(d.properties.cod_dist), caja: [x0, y0, x1, y1] });
  }
  return limites;
}

const cache = new Map();   // "D|12" → { parcelas: [{caja, f, geo}] }
function distrito(dpto, dist) {
  const k = `${dpto}|${dist}`;
  if (cache.has(k)) { const v = cache.get(k); cache.delete(k); cache.set(k, v); return v; }
  const f = join(DIR, `${dpto}_${dist}.geojson`);
  if (!existsSync(f)) return null;
  const fc = JSON.parse(readFileSync(f, 'utf8'));
  const parcelas = fc.features.filter(x => x.geometry).map(x => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    const rec = c => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]); } else c.forEach(rec); };
    rec(x.geometry.coordinates);
    return { caja: [x0, y0, x1, y1], f: x, geo: null };
  });
  const v = { parcelas };
  cache.set(k, v);
  while (cache.size > MAX_DISTRITOS_EN_MEMORIA) cache.delete(cache.keys().next().value);
  return v;
}

/** Propiedades como las del WFS (para la ficha y el informe) más el vínculo DNIT ya calculado. */
function aFeature(p) {
  if (!p.geo) {
    const x = p.f.properties;
    const sup = (Number(x.hectareas) || 0) * 10000 + (Number(x.superficie_tierra) || 0);
    p.geo = { type: 'Feature', id: x.id_parcela, geometry: { type: p.f.geometry.type, coordinates: aGeo(p.f.geometry.coordinates) },
      properties: { ...x, objectid: x.id_parcela, superficie_m2: sup || null,
        clave_comparacion: x.zona != null ? `${x.dpto}|${x.dist}|#|${x.zona}|${x.mz}|${x.lote}|#|#` : x.padron != null ? `${x.dpto}|${x.dist}|${x.padron}|#|#|#` : null } };
  }
  return p.geo;
}

export function validarBbox(q) {
  const [minX, minY, maxX, maxY] = ['minX', 'minY', 'maxX', 'maxY'].map(k => Number(q[k]));
  if (![minX, minY, maxX, maxY].every(Number.isFinite) || minX >= maxX || minY >= maxY) throw new ErrorParcelario('Recuadro inválido');
  if ((maxX - minX) * (maxY - minY) > 0.0025) throw new ErrorParcelario('Recuadro demasiado grande: acerque el mapa');   // ~5 × 5 km
  return { minX, minY, maxX, maxY };
}

/** Distritos (con su código) cuyo recuadro toca la vista WGS84. Lo usan parcelas y edificios. */
export function distritosEnVista(q) {
  const b = validarBbox(q);
  const [x0, y0] = aUtm(b.minX, b.minY), [x1, y1] = aUtm(b.maxX, b.maxY);
  const amb = ambito(q);
  return limitesDistritos().filter(d => d.caja[0] <= x1 && d.caja[2] >= x0 && d.caja[1] <= y1 && d.caja[3] >= y0 && (!amb || (d.dpto === amb.dpto && d.dist === amb.dist)));
}

/** Ámbito del cliente (municipalidad): ?dpto=P&dist=1 restringe todo a ese distrito. */
export function ambito(q = {}) {
  if (q.dpto == null || q.dist == null || q.dpto === '' || q.dist === '') return null;
  const dpto = String(q.dpto).toUpperCase(), dist = Number(q.dist);
  if (!/^[A-Z]$/.test(dpto) || !Number.isInteger(dist)) throw new ErrorParcelario('Ámbito inválido (dpto, dist)');
  return { dpto, dist };
}

/** Límite oficial del distrito en WGS84 (para encuadrar y marcar el municipio del cliente). */
export function limiteDistrito(q) {
  const a = ambito(q);
  if (!a) throw new ErrorParcelario('Indique dpto y dist');
  const f = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  const d = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).features.find(x => x.properties.cod_dpto === a.dpto && Number(x.properties.cod_dist) === a.dist) : null;
  if (!d) throw new ErrorParcelario('Distrito sin límite oficial', 404);
  return { type: 'Feature', properties: { dpto: a.dpto, dist: a.dist, nombre: d.properties.nom_dist, area_km2: d.properties.area_km2 }, geometry: { type: d.geometry.type, coordinates: aGeo(d.geometry.coordinates) } };
}

/** Parcelas que tocan la vista. `local: false` si ningún distrito de la vista está descargado (el cliente usa el WFS). */
export function parcelasEnVista(q) {
  const b = validarBbox(q);
  const [x0, y0] = aUtm(b.minX, b.minY), [x1, y1] = aUtm(b.maxX, b.maxY);
  const toca = c => c[0] <= x1 && c[2] >= x0 && c[1] <= y1 && c[3] >= y0;
  const amb = ambito(q);
  const distritos = limitesDistritos().filter(d => toca(d.caja) && (!amb || (d.dpto === amb.dpto && d.dist === amb.dist)));
  const features = [], cubiertos = [];
  let faltan = false;
  for (const d of distritos) {
    const v = distrito(d.dpto, d.dist);
    if (!v) { faltan = true; continue; }
    cubiertos.push(`${d.dpto}|${d.dist}`);
    for (const p of v.parcelas) { if (toca(p.caja)) { features.push(aFeature(p)); if (features.length >= MAX_VISTA) break; } }
    if (features.length >= MAX_VISTA) break;
  }
  return { type: 'FeatureCollection', features, count: features.length, local: cubiertos.length > 0 && !faltan, distritos: cubiertos, fuente: 'Parcelario SNC descargado (data/parcelario)' };
}

/** Una página de las parcelas del distrito (para completar la caché del navegador en segundo plano). */
export function parcelasDeDistrito({ dpto, dist, pagina = 0 }) {
  const d = String(dpto || '').toUpperCase(), n = Number(dist), pg = Math.max(0, Number(pagina) || 0);
  if (!/^[A-Z]$/.test(d) || !Number.isInteger(n)) throw new ErrorParcelario('Indique dpto y dist');
  const v = distrito(d, n);
  if (!v) throw new ErrorParcelario('Distrito sin parcelario descargado', 404);
  const trozo = v.parcelas.slice(pg * PAGINA, (pg + 1) * PAGINA).map(aFeature);
  return { type: 'FeatureCollection', features: trozo, count: trozo.length, total: v.parcelas.length, pagina: pg, paginas: Math.ceil(v.parcelas.length / PAGINA) };
}
