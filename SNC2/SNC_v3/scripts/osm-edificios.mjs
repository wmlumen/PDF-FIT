/**
 * Descarga las huellas de edificios de OpenStreetMap de un distrito (Overpass API), calcula su superficie,
 * las vincula con las parcelas oficiales del SNC (data/parcelario/<DPTO>_<DIST>.geojson) y compara con la
 * superficie edificada que liquida la DNIT. Ver edificiosServicio.js.
 * Uso: node scripts/osm-edificios.mjs --dpto D --dist 12
 * Salida (data/edificios/): <D>_<N>_edificios.geojson (WGS84, para el visor), _comparacion.json, _comparacion.csv,
 *   _parcelas_ref.json (atributos de parcelas para recalcular al asignar a mano).
 * Datos © colaboradores de OpenStreetMap, licencia ODbL: citar al publicar.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import * as turf from '@turf/turf';
import geojsonRbush from '@turf/geojson-rbush';
import { DIR_EDIF, perimetroGeom, cubiertaDesdeTecho, areaGeom, asignarEdificio, resumenPorParcela, aplicarResumen, asignacionesManuales, compararEdificacion } from '../edificiosServicio.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
const DPTO = String(opt('dpto') || '').toUpperCase(), DIST = Number(opt('dist'));
if (!/^[A-Z]$/.test(DPTO) || !Number.isInteger(DIST)) { console.error('Uso: node scripts/osm-edificios.mjs --dpto D --dist 12'); process.exit(1); }
const UTM = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const aGeo = ([x, y]) => proj4(UTM, 'EPSG:4326', [x, y]), aUtm = ([lng, lat]) => proj4('EPSG:4326', UTM, [lng, lat]);
const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

const fParc = join(RAIZ, 'data', 'parcelario', `${DPTO}_${DIST}.geojson`);
if (!existsSync(fParc)) { console.error(`Falta el parcelario: node scripts/snc-parcelario.mjs --dpto ${DPTO} --dist ${DIST}`); process.exit(1); }
const parcelas = JSON.parse(readFileSync(fParc, 'utf8')).features.filter(f => f.geometry);
console.log(`Parcelas: ${parcelas.length}`);
const [minX, minY, maxX, maxY] = turf.bbox({ type: 'FeatureCollection', features: parcelas });
const [w, s] = aGeo([minX, minY]), [e, n] = aGeo([maxX, maxY]);

const edificios = [];
const FGB = opt('fgb');   // extracto nacional (data/osm/edificios_py.fgb, EPSG:32721) en lugar de Overpass
const OGR = process.env.OGR2OGR || 'C:\\Program Files\\QGIS 3.44.15\\bin\\ogr2ogr.exe';
if (FGB) {
  const tmp = join(tmpdir(), `edif_${DPTO}_${DIST}_${process.pid}.geojson`);
  execFileSync(OGR, ['-f', 'GeoJSONSeq', tmp, FGB, '-spat', String(minX), String(minY), String(maxX), String(maxY)], { stdio: 'ignore', env: { ...process.env, PROJ_LIB: process.env.PROJ_LIB || 'C:\\Program Files\\QGIS 3.44.15\\share\\proj' } });
  // GeoJSONSeq leído por líneas: distritos con recuadro grande (p. ej. Mbaracayú) superan el tamaño máximo de texto de Node.
  const { createInterface } = await import('node:readline'), { createReadStream } = await import('node:fs');
  const fc = { features: [] };
  for await (const linea of createInterface({ input: createReadStream(tmp, 'utf8'), crlfDelay: Infinity })) { const t = linea.replace(/^\x1e/, '').trim(); if (t) fc.features.push(JSON.parse(t)); }
  rmSync(tmp, { force: true });
  for (const f of fc.features) {
    const g = f.geometry; if (!g) continue;
    const p = f.properties || {};
    const nv = parseInt((String(p.other_tags || '').match(/"building:levels"=>"(\d+)/) || [])[1], 10);
    const m2 = areaGeom(g);
    // Aspecto 3D (como F4Map): altura en metros, colores y material si el mapa los tiene.
    const tag = k => (String(p.other_tags || '').match(new RegExp(`"${k}"=>"([^"]*)"`)) || [])[1];
    const alt = parseFloat(String(tag('height') || '').replace(',', '.'));
    const aspecto = { altura_m: Number.isFinite(alt) && alt > 1 && alt < 400 ? Math.round(alt * 10) / 10 : undefined,
      color: tag('building:colour') || undefined, techo_color: tag('roof:colour') || undefined, techo_forma: tag('roof:shape') || undefined, material: tag('building:material') || undefined };
    if (m2 < 4) continue;
    edificios.push({ type: 'Feature', geometry: g, properties: { osm_id: p.osm_way_id ? `way/${p.osm_way_id}` : `relation/${p.osm_id}`, tipo: p.building || 'yes',
      niveles: Number.isFinite(nv) && nv > 0 && nv < 60 ? nv : 1, niveles_informados: Number.isFinite(nv), m2: Math.round(m2 * 10) / 10,
      perimetro_m: Math.round(perimetroGeom(g) * 10) / 10, m2_cubierta: Math.round(cubiertaDesdeTecho(m2, perimetroGeom(g)) * 10) / 10, ...aspecto } });
  }
} else {
const q = `[out:json][timeout:300];way["building"](${s.toFixed(6)},${w.toFixed(6)},${n.toFixed(6)},${e.toFixed(6)});out geom tags;`;
const r = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CatastroPYPro/3 (SNC v3; edificios por distrito)' }, signal: AbortSignal.timeout(400000) });
if (!r.ok) { console.error(`Overpass respondió ${r.status}`); process.exit(1); }
const osm = await r.json();
for (const el of osm.elements || []) {
  const g = el.geometry;
  if (!g || g.length < 4 || g[0].lat !== g[g.length - 1].lat || g[0].lon !== g[g.length - 1].lon) continue;
  const anillo = g.map(p => aUtm([p.lon, p.lat]));
  const geom = { type: 'Polygon', coordinates: [anillo] };
  const m2 = areaGeom(geom);
  if (m2 < 4) continue;   // restos de dibujo
  const nv = parseInt(el.tags?.['building:levels'], 10);
  edificios.push({ type: 'Feature', geometry: geom, properties: { osm_id: `way/${el.id}`, tipo: el.tags?.building || 'yes', niveles: Number.isFinite(nv) && nv > 0 && nv < 60 ? nv : 1, niveles_informados: Number.isFinite(nv), m2: Math.round(m2 * 10) / 10,
      perimetro_m: Math.round(perimetroGeom(g) * 10) / 10, m2_cubierta: Math.round(cubiertaDesdeTecho(m2, perimetroGeom(g)) * 10) / 10 } });
}
}
console.log(`Edificios OSM en el recuadro: ${edificios.length}`);
// Pertenencia al distrito por el límite oficial del SNC (centroide del edificio dentro del polígono del distrito).
const limites = JSON.parse(readFileSync(join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson'), 'utf8'));
const limite = limites.features.find(f => f.properties.cod_dpto === DPTO && Number(f.properties.cod_dist) === DIST);
const delDistrito = limite ? edificios.filter(e => turf.booleanPointInPolygon(turf.centroid(e), limite)) : edificios;
console.log(`Edificios dentro del límite del distrito: ${delDistrito.length}`);

// Índice espacial de parcelas (en metros, plano) e intersección de cada edificio.
const indice = geojsonRbush(); indice.load(parcelas);
const intersectar = (a, b) => { try { const x = turf.intersect(turf.featureCollection([turf.feature(a), turf.feature(b)])); return x?.geometry || null; } catch { return null; } };
const manuales = await asignacionesManuales(DPTO, DIST);
let i = 0;
for (const ed of delDistrito) {
  const cand = indice.search(ed).features;
  const a = asignarEdificio(ed, cand, intersectar);
  Object.assign(ed.properties, { estado: a.estado, id_parcela: a.id_parcela ?? null, candidatas: a.candidatas });
  const m = manuales.get(ed.properties.osm_id);
  if (m && a.candidatas.some(c => c.id_parcela === m.id_parcela)) Object.assign(ed.properties, { estado: 'manual', id_parcela: m.id_parcela, asignado_por: m.usuario });
  if (++i % 2000 === 0) process.stdout.write(`\r  ${i} edificios vinculados`);
}
const enDistrito = delDistrito.filter(e => e.properties.estado !== 'sin_parcela');
const sinParcela = delDistrito.filter(e => e.properties.estado === 'sin_parcela');
const porId = new Map(parcelas.map(p => [p.properties.id_parcela, p]));
const resumen = resumenPorParcela(enDistrito, porId);
// Los edificios sin parcela también van al mapa: son construcciones fuera del catastro.
const fc = { type: 'FeatureCollection', fuente: 'Edificios © colaboradores de OpenStreetMap (ODbL); parcelas SNC; edificación DNIT 2026', features: [...enDistrito, ...sinParcela] };
aplicarResumen(fc, resumen);
// Al visor va en WGS84.
// Polígono o multipolígono (el extracto de GDAL trae multipolígonos): se reproyecta cada vértice.
const aGeoProf = c => (typeof c[0] === 'number' ? aGeo(c).map(v => Math.round(v * 1e7) / 1e7) : c.map(aGeoProf));
for (const f of fc.features) f.geometry = { type: f.geometry.type, coordinates: aGeoProf(f.geometry.coordinates) };
mkdirSync(DIR_EDIF, { recursive: true });
const base = join(DIR_EDIF, `${DPTO}_${DIST}`);
writeFileSync(`${base}_edificios.geojson`, JSON.stringify(fc));
writeFileSync(`${base}_comparacion.json`, JSON.stringify(resumen));
writeFileSync(`${base}_parcelas_ref.json`, JSON.stringify(parcelas.map(p => ({ properties: { id_parcela: p.properties.id_parcela, zona: p.properties.zona, mz: p.properties.mz, lote: p.properties.lote, padron: p.properties.padron, dnit_ctacte: p.properties.dnit_ctacte, dnit_sup_edif_m2: p.properties.dnit_sup_edif_m2 } }))));
const difs = resumen.filter(x => x.estado !== 'coincide' && x.estado !== 'sin_edificacion');
writeFileSync(`${base}_comparacion.csv`, 'ctacte,id_parcela,edificios,m2_techo,m2_cubierta,construido_cubierta_x_pisos_m2,edificado_dnit_m2,m2_a_completar,estado,detalle\n' +
  difs.map(x => [x.ctacte, x.id_parcela, x.edificios, x.techo_m2, x.cubierta_m2, x.construido_osm_m2, x.edificado_dnit_m2 ?? '', x.m2_a_completar, x.estado, `"${x.etiqueta}"`].join(',')).join('\n') + '\n');
const cuenta = k => fc.features.filter(f => f.properties.estado === k).length;
const resumenDistrito = { dpto: DPTO, dist: DIST, edificios: fc.features.length, auto: cuenta('auto'), manual: cuenta('manual'), pendientes: cuenta('pendiente'),
  sinParcela: sinParcela.length, sinParcelaM2: Math.round(sinParcela.reduce((a, e) => a + e.properties.m2, 0)), huellaM2: Math.round(fc.features.reduce((a, e) => a + e.properties.m2, 0)),
  parcelasComparadas: resumen.length, porEstado: fc.resumen };
writeFileSync(`${base}_resumen.json`, JSON.stringify(resumenDistrito, null, 2));
console.log('\n' + JSON.stringify(resumenDistrito, null, 2));
void compararEdificacion;
