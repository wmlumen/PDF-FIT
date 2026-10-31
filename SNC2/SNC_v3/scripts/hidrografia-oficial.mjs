/**
 * Complementa la capa OSM (scripts/osm-hidrografia.mjs) con la hidrografia oficial del pais
 * (data/1.Paraguay/02.Hidrografia, SHP en UTM 21S — ver convertir.cmd ahi mismo para la conversion a WGS84).
 * No reemplaza OSM: cada feature queda marcado "fuente":"oficial" para distinguirlo en el visor/API.
 * Clasifica por el prefijo de NOMBRE (rio/arroyo/canal/laguna/embalse; "otro" si no se reconoce o no tiene nombre).
 * Entrada: hidro_oficial_2012.geojson (nacional, 42.764 lineas), hidro_oficial_poly.geojson (rios
 * principales, 1.071 poligonos), hidro_oficial_ga.geojson (Gran Asuncion, detalle, 1.450 lineas, sin atributos).
 * Salida: data/1.Paraguay/02.Hidrografia/hidrografia_oficial/{lineas,areas}.geojson + resumen.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(RAIZ, 'data/1.Paraguay/02.Hidrografia');
const SAL = join(BASE, 'hidrografia_oficial');
mkdirSync(SAL, { recursive: true });
const leer = f => JSON.parse(readFileSync(join(BASE, f), 'utf8')).features;

function tipoDeNombre(nombre) {
  const n = (nombre || '').trim().toLowerCase();
  if (!n) return 'otro';
  if (/^r[ií]o\b/.test(n)) return 'rio';
  if (/^(arroyo|ao\b|riachuelo|riacho|ca[nñ]ada|brazo)/.test(n)) return 'arroyo';
  if (/^canal\b/.test(n)) return 'canal';
  if (/^(lago|laguna|estero)\b/.test(n)) return 'laguna';
  if (/^(represa|embalse)\b/.test(n)) return 'embalse';
  return 'otro';
}

const lineas = [], resumenLineas = {};
for (const f of leer('hidro_oficial_2012.geojson')) {
  if (!f.geometry) continue;
  const nombre = f.properties.NOMBRE || null, tipo = tipoDeNombre(nombre);
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre, tipo, fuente: 'oficial', detalle: 'nacional', tipo_l: f.properties.TIPO_L ?? null, cod_digest: f.properties.COD_DIGEST || null } });
  resumenLineas[tipo] = (resumenLineas[tipo] || 0) + 1;
}
let ga = 0;
for (const f of leer('hidro_oficial_ga.geojson')) {
  if (!f.geometry) continue;
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: null, tipo: 'otro', fuente: 'oficial', detalle: 'gran_asuncion' } });
  resumenLineas.otro = (resumenLineas.otro || 0) + 1; ga++;
}

const areas = [];
for (const f of leer('hidro_oficial_poly.geojson')) {
  if (!f.geometry) continue;
  areas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: null, tipo: 'ribera', fuente: 'oficial', detalle: 'rios_principales' } });
}

const fuente = 'Hidrografia oficial del pais (STP/IGM, SHP en data/1.Paraguay/02.Hidrografia) — complementa la capa OSM';
writeFileSync(join(SAL, 'lineas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: lineas }));
writeFileSync(join(SAL, 'areas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: areas }));
writeFileSync(join(SAL, 'resumen.json'), JSON.stringify({ generado: new Date().toISOString(), lineas: { total: lineas.length, nacional: lineas.length - ga, gran_asuncion: ga, por_tipo: resumenLineas }, areas: { total: areas.length, tipo: 'ribera (rios principales, poligono)' } }, null, 1));
console.log(`lineas: ${lineas.length} (nacional ${lineas.length - ga} + Gran Asuncion ${ga}) por tipo: ${JSON.stringify(resumenLineas)} · areas: ${areas.length}`);
