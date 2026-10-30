/**
 * Une los usos extraídos de OSM (data/osm/usos_puntos.geojson + usos_areas.geojson, ver data/osm/usos.cmd),
 * los clasifica por sector (usosOsm.js) y les asigna departamento|distrito (límites SNC, UTM 21S).
 * Luego busca la parcela SNC que contiene cada uso (data/parcelario/<dpto>_<dist>.geojson) y copia su cuenta DNIT.
 * Salida: data/osm/usos_py.json  { generado, sectores, resumen: {"D|12": {sector: n}}, usos: [[id,nombre,sector,tipo,lng,lat,dpto,dist,cuenta,id_parcela,impuesto,edif_m2]] }
 * cuenta = Cta. Cte. urbana DNIT, "P<padrón>" rural, o null si el punto no cae en una parcela.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { clasificar, SECTORES } from '../usosOsm.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const UTM = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const leer = f => JSON.parse(readFileSync(join(RAIZ, f), 'utf8')).features;
const enAnillo = ([x, y], r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
const enPol = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some(pol => enAnillo(p, pol[0]) && !pol.slice(1).some(h => enAnillo(p, h)));

const limites = leer('data/snc_estadisticas/ly_dist_utm.geojson').map(f => {
  let c = [Infinity, Infinity, -Infinity, -Infinity];
  const rec = v => { if (typeof v[0] === 'number') c = [Math.min(c[0], v[0]), Math.min(c[1], v[1]), Math.max(c[2], v[0]), Math.max(c[3], v[1])]; else v.forEach(rec); };
  rec(f.geometry.coordinates);
  return { d: f.properties.cod_dpto, n: Number(f.properties.cod_dist), g: f.geometry, c };
});
const distrito = xy => limites.find(l => xy[0] >= l.c[0] && xy[0] <= l.c[2] && xy[1] >= l.c[1] && xy[1] <= l.c[3] && enPol(xy, l.g));

const usos = [], resumen = {}, vistos = new Set();
let fuera = 0, sinUso = 0;
for (const [archivo, area] of [['data/osm/usos_puntos.geojson', false], ['data/osm/usos_areas.geojson', true]]) {
  for (const f of leer(archivo)) {
    if (f.geometry?.type !== 'Point') continue;
    const p = f.properties, c = clasificar(p);
    if (!c) { sinUso++; continue; }
    const id = area ? (p.osm_way_id ? `way/${p.osm_way_id}` : `relation/${p.osm_id}`) : `node/${p.osm_id}`;
    if (vistos.has(id)) continue; vistos.add(id);
    const [lng, lat] = f.geometry.coordinates, dd = distrito(proj4('EPSG:4326', UTM, [lng, lat]));
    if (!dd) { fuera++; continue; }
    usos.push([id, p.name || '', c.sector, c.tipo, +lng.toFixed(6), +lat.toFixed(6), dd.d, dd.n]);
    const k = `${dd.d}|${dd.n}`; (resumen[k] ||= {})[c.sector] = (resumen[k][c.sector] || 0) + 1;
  }
}
// Vínculo con la parcela y la cuenta DNIT, distrito por distrito.
const porDist = new Map(); usos.forEach(u => { const k = `${u[6]}_${u[7]}`; if (!porDist.has(k)) porDist.set(k, []); porDist.get(k).push(u); });
let conParcela = 0, i = 0;
for (const [k, lista] of porDist) {
  i++;
  const f = join(RAIZ, 'data/parcelario', `${k}.geojson`);
  if (!existsSync(f)) { lista.forEach(u => u.push(null, null, null, null)); continue; }
  const parcelas = JSON.parse(readFileSync(f, 'utf8')).features.filter(x => x.geometry).map(x => {
    let c = [Infinity, Infinity, -Infinity, -Infinity];
    const rec = v => { if (typeof v[0] === 'number') c = [Math.min(c[0], v[0]), Math.min(c[1], v[1]), Math.max(c[2], v[0]), Math.max(c[3], v[1])]; else v.forEach(rec); };
    rec(x.geometry.coordinates); return { c, x };
  });
  for (const u of lista) {
    const xy = proj4('EPSG:4326', UTM, [u[4], u[5]]);
    const p = parcelas.find(({ c, x }) => xy[0] >= c[0] && xy[0] <= c[2] && xy[1] >= c[1] && xy[1] <= c[3] && enPol(xy, x.geometry))?.x.properties;
    if (!p) { u.push(null, null, null, null); continue; }
    conParcela++;
    const cuenta = p.dnit_ctacte || p.ccatastral || (p.dnit_padron ?? p.padron ? `P${p.dnit_padron ?? p.padron}` : null);
    u.push(cuenta, p.id_parcela ?? null, p.dnit_impuesto ?? null, p.dnit_sup_edif_m2 ?? p.superficie_edificado ?? null);
  }
  if (i % 20 === 0) console.log(`parcelas ${i}/${porDist.size}`);
}
console.log(`con parcela: ${conParcela} de ${usos.length}`);
writeFileSync(join(RAIZ, 'data/osm/usos_py.json'), JSON.stringify({ generado: new Date().toISOString(), fuente: 'OpenStreetMap (ODbL), Geofabrik paraguay-latest', sectores: SECTORES, resumen, usos }));
const porSector = {}; usos.forEach(u => { porSector[u[2]] = (porSector[u[2]] || 0) + 1; });
console.log(`usos: ${usos.length} · fuera de Paraguay: ${fuera} · sin actividad: ${sinUso} · distritos: ${Object.keys(resumen).length}`);
console.log(porSector);
