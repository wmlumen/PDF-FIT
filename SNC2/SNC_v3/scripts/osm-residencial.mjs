/**
 * Zonas residenciales de OpenStreetMap (landuse=residential, gris en el mapa) vinculadas a:
 *  - distrito SNC (por el punto interior de la zona),
 *  - barrio (punto place=suburb/neighbourhood/quarter de OSM dentro de la zona o el más cercano a ≤1,5 km),
 *  - parcelas SNC cuyo centro cae dentro de la zona → Cta. Cte. urbanas y padrones rurales con su impuesto DNIT.
 * Entrada: data/osm/residencial_py.geojson y barrios_osm.geojson (UTM 21S, ver data/osm/residencial.cmd).
 * Salida: data/osm/residencial/<dpto>_<dist>.geojson (UTM 21S) y data/osm/residencial/resumen.json.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAL = join(RAIZ, 'data/osm/residencial');
mkdirSync(SAL, { recursive: true });
const leer = f => JSON.parse(readFileSync(join(RAIZ, f), 'utf8')).features;
const caja = g => { let c = [Infinity, Infinity, -Infinity, -Infinity]; const rec = v => { if (typeof v[0] === 'number') c = [Math.min(c[0], v[0]), Math.min(c[1], v[1]), Math.max(c[2], v[0]), Math.max(c[3], v[1])]; else v.forEach(rec); }; rec(g.coordinates); return c; };
const enAnillo = ([x, y], r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
const pols = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const enPol = (p, g) => pols(g).some(pol => enAnillo(p, pol[0]) && !pol.slice(1).some(h => enAnillo(p, h)));
const areaAnillo = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
const area = g => pols(g).reduce((s, pol) => s + areaAnillo(pol[0]) - pol.slice(1).reduce((h, r) => h + areaAnillo(r), 0), 0);
const dentro = (c, p) => p[0] >= c[0] && p[0] <= c[2] && p[1] >= c[1] && p[1] <= c[3];
const toca = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
/** Punto interior aproximado: centro del recuadro si cae dentro; si no, cruce horizontal por el centro. */
function puntoInterior(g, c) {
  const m = [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
  if (enPol(m, g)) return m;
  const xs = []; for (const pol of pols(g)) { const r = pol[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > m[1]) !== (yj > m[1])) xs.push(xi + (m[1] - yi) * (xj - xi) / (yj - yi)); } }
  xs.sort((a, b) => a - b);
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, m[1]] : pols(g)[0][0][0];
}

const limites = leer('data/snc_estadisticas/ly_dist_utm.geojson').filter(f => f.geometry).map(f => ({ d: f.properties.cod_dpto, n: Number(f.properties.cod_dist), nombre: f.properties.nom_dist || f.properties.nombre || '', g: f.geometry, c: caja(f.geometry) }));
const barrios = leer('data/osm/barrios_osm.geojson').filter(f => f.properties.name && f.geometry?.type === 'Point').map(f => ({ nombre: f.properties.name, p: f.geometry.coordinates }));

// 1) Zonas → distrito
const porDist = new Map(); let fuera = 0;
for (const f of leer('data/osm/residencial_py.geojson')) {
  if (!f.geometry) continue;
  const c = caja(f.geometry), pi = puntoInterior(f.geometry, c);
  const l = limites.find(x => dentro(x.c, pi) && enPol(pi, x.g));
  if (!l) { fuera++; continue; }
  const k = `${l.d}_${l.n}`;
  if (!porDist.has(k)) porDist.set(k, { l, zonas: [] });
  const b = barrios.filter(x => dentro(c, x.p) && enPol(x.p, f.geometry));
  let barrio = b[0]?.nombre || null, origen = barrio ? 'dentro' : null;
  if (!barrio) { let mejor = 1500; for (const x of barrios) { const dd = Math.hypot(x.p[0] - pi[0], x.p[1] - pi[1]); if (dd < mejor) { mejor = dd; barrio = x.nombre; origen = 'cercano'; } } }
  porDist.get(k).zonas.push({ f, c, pi, barrio, origen, otros_barrios: b.slice(1).map(x => x.nombre) });
}

// 2) Parcelas de cada distrito (y de los vecinos que toca) → cuentas por zona
const resumen = {}; let i = 0, totZonas = 0, totParc = 0;
const cacheParc = new Map();
const parcelasDe = k => {
  if (cacheParc.has(k)) return cacheParc.get(k);
  const f = join(RAIZ, 'data/parcelario', `${k}.geojson`);
  const v = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).features.filter(x => x.geometry).map(x => { const c = caja(x.geometry); return { c, m: [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2], p: x.properties }; }) : [];
  cacheParc.set(k, v); if (cacheParc.size > 6) cacheParc.delete(cacheParc.keys().next().value);
  return v;
};
for (const [k, { l, zonas }] of porDist) {
  i++;
  const cajaZonas = zonas.reduce((a, z) => [Math.min(a[0], z.c[0]), Math.min(a[1], z.c[1]), Math.max(a[2], z.c[2]), Math.max(a[3], z.c[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  const parc = limites.filter(x => toca(x.c, cajaZonas)).flatMap(x => parcelasDe(`${x.d}_${x.n}`));
  const features = zonas.map(z => {
    const ps = parc.filter(p => dentro(z.c, p.m) && enPol(p.m, z.f.geometry));
    const urb = ps.filter(p => p.p.dnit_ctacte), rur = ps.filter(p => !p.p.dnit_ctacte && (p.p.dnit_padron ?? p.p.padron) != null && p.p.vinculo === 'rural');
    const sin = ps.filter(p => !p.p.vinculo || p.p.vinculo === 'sin_dnit' || (!p.p.dnit_ctacte && p.p.dnit_padron == null));
    const ha = area(z.f.geometry) / 10000;
    totParc += ps.length;
    return { type: 'Feature', geometry: z.f.geometry, properties: {
      osm_id: z.f.properties.osm_way_id ? `way/${z.f.properties.osm_way_id}` : `relation/${z.f.properties.osm_id}`,
      nombre: z.f.properties.name || null, barrio: z.barrio, barrio_origen: z.origen, otros_barrios: z.otros_barrios.length ? z.otros_barrios : undefined,
      dpto: l.d, dist: l.n, distrito: l.nombre, area_ha: +ha.toFixed(2),
      parcelas: ps.length, cuentas_urbanas: urb.length, padrones_rurales: rur.length, sin_cuenta_dnit: sin.length,
      densidad_parcelas_ha: ha ? +(ps.length / ha).toFixed(1) : null,
      impuesto_2026: ps.reduce((s, p) => s + (Number(p.p.dnit_impuesto) || 0), 0),
      edif_declarada_m2: Math.round(ps.reduce((s, p) => s + (Number(p.p.dnit_sup_edif_m2 ?? p.p.superficie_edificado) || 0), 0)),
      ctas_ctes: urb.map(p => p.p.dnit_ctacte), padrones: rur.map(p => p.p.dnit_padron ?? p.p.padron),
      sin_parcela_snc: ps.length === 0 } };
  });
  totZonas += features.length;
  writeFileSync(join(SAL, `${k}.geojson`), JSON.stringify({ type: 'FeatureCollection', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::32721' } }, fuente: 'OpenStreetMap landuse=residential (ODbL) + parcelario SNC + DNIT 2026', features }));
  const P = features.map(f => f.properties);
  resumen[k.replace('_', '|')] = { distrito: l.nombre, zonas: P.length, ha: +P.reduce((s, x) => s + x.area_ha, 0).toFixed(1), parcelas: P.reduce((s, x) => s + x.parcelas, 0),
    cuentas_urbanas: P.reduce((s, x) => s + x.cuentas_urbanas, 0), padrones_rurales: P.reduce((s, x) => s + x.padrones_rurales, 0),
    zonas_sin_parcela_snc: P.filter(x => x.sin_parcela_snc).length, ha_sin_parcela_snc: +P.filter(x => x.sin_parcela_snc).reduce((s, x) => s + x.area_ha, 0).toFixed(1),
    barrios: [...new Set(P.map(x => x.barrio).filter(Boolean))].length };
  if (i % 20 === 0) console.log(`${i}/${porDist.size}`);
}
writeFileSync(join(SAL, 'resumen.json'), JSON.stringify({ generado: new Date().toISOString(), distritos: resumen }, null, 1));
const R = Object.values(resumen);
console.log(`zonas: ${totZonas} · fuera de Paraguay: ${fuera} · distritos: ${R.length} · parcelas dentro: ${totParc} · zonas sin parcela SNC: ${R.reduce((s, x) => s + x.zonas_sin_parcela_snc, 0)} (${R.reduce((s, x) => s + x.ha_sin_parcela_snc, 0).toFixed(0)} ha)`);
