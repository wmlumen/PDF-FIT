/**
 * Red hidrica nacional de OpenStreetMap: cauces (rios, arroyos, canales, drenes) y cuerpos de agua
 * (lagunas, embalses, humedales, riberas). Entrada: data/osm/hidro_lineas.geojson + hidro_areas.geojson
 * (WGS84, ver data/osm/hidrografia.cmd). Clasifica por tipo y limpia los "other_tags" de OSM.
 * Salida: data/osm/hidrografia/hidrografia_lineas.geojson + hidrografia_areas.geojson (WGS84) y resumen.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAL = join(RAIZ, 'data/osm/hidrografia');
mkdirSync(SAL, { recursive: true });
const leer = f => JSON.parse(readFileSync(join(RAIZ, f), 'utf8')).features;

/** "water"=>"reservoir","ref"=>"X" -> {water:'reservoir', ref:'X'} */
function otrosTags(s) {
  const o = {};
  if (!s) return o;
  for (const m of s.matchAll(/"([^"]+)"=>"((?:[^"\\]|\\.)*)"/g)) o[m[1]] = m[2].replace(/\\(.)/g, '$1');
  return o;
}

const TIPO_LINEA = { river: 'rio', stream: 'arroyo', canal: 'canal', drain: 'dren', ditch: 'dren', tidal_channel: 'canal' };
const TIPO_AGUA = { reservoir: 'embalse', basin: 'cuenca_retencion', lake: 'laguna', pond: 'laguna', lagoon: 'laguna', oxbow: 'laguna', lock: 'canal' };

const lineas = [], resumenLineas = {};
for (const f of leer('data/osm/hidro_lineas.geojson')) {
  if (!f.geometry) continue;
  const p = f.properties, tipo = TIPO_LINEA[p.waterway] || 'otro';
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { osm_id: `way/${p.osm_id}`, nombre: p.name || null, tipo } });
  resumenLineas[tipo] = (resumenLineas[tipo] || 0) + 1;
}

const areas = [], resumenAreas = {};
for (const f of leer('data/osm/hidro_areas.geojson')) {
  if (!f.geometry) continue;
  const p = f.properties, ot = otrosTags(p.other_tags);
  let tipo;
  if (p.natural === 'wetland') tipo = 'humedal';
  else if (p.landuse === 'reservoir') tipo = 'embalse';
  else if (p.landuse === 'basin') tipo = 'cuenca_retencion';
  else if (ot.waterway === 'riverbank') tipo = 'ribera';
  else tipo = TIPO_AGUA[ot.water] || 'laguna';
  const osm_id = p.osm_way_id ? `way/${p.osm_way_id}` : `relation/${p.osm_id}`;
  areas.push({ type: 'Feature', geometry: f.geometry, properties: { osm_id, nombre: p.name || null, tipo } });
  resumenAreas[tipo] = (resumenAreas[tipo] || 0) + 1;
}

const fuente = 'OpenStreetMap (ODbL) — waterway=river|stream|canal|drain|ditch + natural=water|wetland + landuse=reservoir|basin';
writeFileSync(join(SAL, 'hidrografia_lineas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: lineas }));
writeFileSync(join(SAL, 'hidrografia_areas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: areas }));
writeFileSync(join(SAL, 'resumen.json'), JSON.stringify({ generado: new Date().toISOString(), lineas: { total: lineas.length, por_tipo: resumenLineas }, areas: { total: areas.length, por_tipo: resumenAreas } }, null, 1));
console.log(`lineas: ${lineas.length} (${JSON.stringify(resumenLineas)}) · areas: ${areas.length} (${JSON.stringify(resumenAreas)})`);
