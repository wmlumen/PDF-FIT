/**
 * Coeficiente de escorrentía (C) automático según el punto, para la Sim. hidrológica de visor-3d.html:
 * antes el usuario elegía a mano uno de 3 valores fijos para todo el país ("Suelo / escorrentía").
 * Prioridad: 1) ¿cae en una zona residencial real de OSM (data/osm/residencial/)? → urbano, C=0,68.
 *            2) si no, región por longitud (Chaco húmedo/arcilloso vs. Región Oriental/porosa), igual
 *               partición que estimarCotaParaguay() en js/visor3d.js.
 * No es un estudio de suelos — es una regla simple basada en datos que ya existen en el repo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const UTM = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';

function cajaDe(g) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const rec = c => { if (typeof c[0] === 'number') { if (c[0] < x0) x0 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[0] > x1) x1 = c[0]; if (c[1] > y1) y1 = c[1]; } else c.forEach(rec); };
  rec(g.coordinates);
  return [x0, y0, x1, y1];
}
const enAnillo = ([x, y], r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
const pols = g => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const enGeom = (p, g) => pols(g).some(pol => enAnillo(p, pol[0]) && !pol.slice(1).some(h => enAnillo(p, h)));

let distritos = null;
function cargarDistritos() {
  if (distritos) return distritos;
  const f = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  distritos = existsSync(f)
    ? JSON.parse(readFileSync(f, 'utf8')).features.filter(x => x.geometry).map(x => ({ dpto: x.properties.cod_dpto, dist: Number(x.properties.cod_dist), geom: x.geometry, caja: cajaDe(x.geometry) }))
    : [];
  return distritos;
}

const cacheResidencial = new Map();
function zonasResidenciales(dpto, dist) {
  const k = `${dpto}_${dist}`;
  if (cacheResidencial.has(k)) return cacheResidencial.get(k);
  const f = join(RAIZ, 'data', 'osm', 'residencial', `${k}.geojson`);
  const v = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).features.filter(x => x.geometry).map(x => ({ geom: x.geometry, caja: cajaDe(x.geometry) })) : [];
  cacheResidencial.set(k, v);
  if (cacheResidencial.size > 20) cacheResidencial.delete(cacheResidencial.keys().next().value);
  return v;
}

// Misma partición que estimarCotaParaguay() en js/visor3d.js: Chaco (suelo arcilloso, escurre más) vs.
// Región Oriental (más poroso). No hay un mapa de suelos nacional integrado todavía — ver docs/PLAN_CAMBIO_CLIMATICO.
function regionPorDefecto(lng) {
  return lng < -58.5
    ? { coeficiente: 0.82, categoria: 'chaco_arcilloso', etiqueta: 'Chaco húmedo, arcilloso' }
    : { coeficiente: 0.42, categoria: 'oriental_poroso', etiqueta: 'Región Oriental, porosa' };
}

export function estimarCoeficiente({ lat, lng } = {}) {
  const latitude = Number(lat), longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Parámetros lat/lng requeridos y deben ser números finitos.');
  }
  const [x, y] = proj4('EPSG:4326', UTM, [longitude, latitude]);
  const d = cargarDistritos().find(d => x >= d.caja[0] && x <= d.caja[2] && y >= d.caja[1] && y <= d.caja[3] && enGeom([x, y], d.geom));
  if (d) {
    const urbano = zonasResidenciales(d.dpto, d.dist).some(z => x >= z.caja[0] && x <= z.caja[2] && y >= z.caja[1] && y <= z.caja[3] && enGeom([x, y], z.geom));
    if (urbano) return { coeficiente: 0.68, categoria: 'urbano_residencial', etiqueta: 'Urbano / suelo saturado', dpto: d.dpto, dist: d.dist, fuente: 'osm_landuse_residential' };
  }
  const region = regionPorDefecto(longitude);
  return { ...region, dpto: d?.dpto ?? null, dist: d?.dist ?? null, fuente: 'region_py' };
}
