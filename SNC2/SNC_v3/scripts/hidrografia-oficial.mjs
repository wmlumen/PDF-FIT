/**
 * Complementa la capa OSM (scripts/osm-hidrografia.mjs) con la hidrografia oficial del pais
 * (data/1.Paraguay/02.Hidrografia, SHP en UTM 21S — ver convertir.cmd ahi mismo para la conversion a WGS84).
 * No reemplaza OSM: cada feature queda marcado "fuente":"oficial" para distinguirlo en el visor/API.
 * Clasifica por el prefijo de NOMBRE (rio/arroyo/canal/laguna/embalse; "arroyo_no_identificado" si no
 * tiene nombre (cauce real, detectado, sin nombre oficial registrado); "otro" solo si tiene nombre pero
 * no coincide con ningun tipo conocido.
 * Entrada: hidro_oficial_2012.geojson (nacional, 42.764 lineas), hidro_oficial_2002.geojson (nacional,
 * 106.313 lineas, mas detallado — se suma sin reemplazar al 2012 a pedido del usuario; sin deduplicar
 * geometria, puede haber lineas repetidas entre ambos anios), hidro_oficial_poly.geojson (rios
 * principales, 1.071 poligonos), hidro_oficial_ga.geojson (Gran Asuncion, detalle, 1.450 lineas, sin
 * atributos), hidro_oficial_rios2012_sin_nombre.geojson (4.582 arroyos/cauces menores sin atributos,
 * "Rios principales poligonos"/rios_paraguay_2012.shp).
 * Las areas (poligonos) no tienen NOMBRE propio en el SHP (solo un Id numerico): se les asigna tipo
 * "laguna"/"embalse" por cercania (bbox) a una linea ya clasificada como tal; si no hay ninguna cerca
 * quedan como "ribera" (faja/franja de rio, no un cuerpo de agua propio).
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
  if (!n) return 'arroyo_no_identificado';
  if (/^r[ií]o\b/.test(n)) return 'rio';
  if (/^(arroyo|ao\b|riachuelo|riacho|ca[nñ]ada|canad[oó]n|brazo)/.test(n)) return 'arroyo';
  if (/^canal\b/.test(n)) return 'canal';
  if (/^(lago|laguna|estero)\b/.test(n)) return 'laguna';
  if (/^(represa|embalse)\b/.test(n)) return 'embalse';
  return 'otro';
}

function cajaDeGeometria(g) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const rec = v => { if (typeof v[0] === 'number') { if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0]; if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1]; } else v.forEach(rec); };
  rec(g.coordinates);
  return [minX, minY, maxX, maxY];
}
const seSolapan = (a, b, margen) => a[0] - margen <= b[2] && a[2] + margen >= b[0] && a[1] - margen <= b[3] && a[3] + margen >= b[1];

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
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: null, tipo: 'arroyo_no_identificado', fuente: 'oficial', detalle: 'gran_asuncion' } });
  resumenLineas.arroyo_no_identificado = (resumenLineas.arroyo_no_identificado || 0) + 1; ga++;
}
let sinNombre2012 = 0;
for (const f of leer('hidro_oficial_rios2012_sin_nombre.geojson')) {
  if (!f.geometry) continue;
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: null, tipo: 'arroyo_no_identificado', fuente: 'oficial', detalle: 'rios_2012_sin_atributos' } });
  resumenLineas.arroyo_no_identificado = (resumenLineas.arroyo_no_identificado || 0) + 1; sinNombre2012++;
}
let n2002 = 0;
for (const f of leer('hidro_oficial_2002.geojson')) {
  if (!f.geometry) continue;
  const nombre = f.properties.NOMBRE || null, tipo = tipoDeNombre(nombre);
  lineas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre, tipo, fuente: 'oficial', detalle: 'nacional_2002' } });
  resumenLineas[tipo] = (resumenLineas[tipo] || 0) + 1; n2002++;
}

// Lineas ya clasificadas como laguna/embalse (con nombre): usadas para reclasificar poligonos cercanos.
const lineasAgua = lineas.filter(l => l.properties.tipo === 'laguna' || l.properties.tipo === 'embalse')
  .map(l => ({ tipo: l.properties.tipo, nombre: l.properties.nombre, caja: cajaDeGeometria(l.geometry) }));

const areas = [];
let areasAgua = 0;
for (const f of leer('hidro_oficial_poly.geojson')) {
  if (!f.geometry) continue;
  const cajaPoly = cajaDeGeometria(f.geometry);
  // Margen ~0.01 grados (~1 km) para tolerar que el poligono y la linea con nombre no coincidan exacto.
  const cercana = lineasAgua.find(l => seSolapan(cajaPoly, l.caja, 0.01));
  if (cercana) {
    areas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: cercana.nombre, tipo: cercana.tipo, fuente: 'oficial', detalle: 'rios_principales' } });
    areasAgua++;
  } else {
    areas.push({ type: 'Feature', geometry: f.geometry, properties: { nombre: null, tipo: 'ribera', fuente: 'oficial', detalle: 'rios_principales' } });
  }
}

const fuente = 'Hidrografia oficial del pais (STP/IGM, SHP en data/1.Paraguay/02.Hidrografia) — complementa la capa OSM';
writeFileSync(join(SAL, 'lineas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: lineas }));
writeFileSync(join(SAL, 'areas.geojson'), JSON.stringify({ type: 'FeatureCollection', fuente, features: areas }));
const nacional2012 = lineas.length - ga - sinNombre2012 - n2002;
writeFileSync(join(SAL, 'resumen.json'), JSON.stringify({ generado: new Date().toISOString(), lineas: { total: lineas.length, nacional_2012: nacional2012, nacional_2002: n2002, gran_asuncion: ga, rios_2012_sin_atributos: sinNombre2012, por_tipo: resumenLineas }, areas: { total: areas.length, reclasificadas_laguna_embalse: areasAgua, ribera: areas.length - areasAgua } }, null, 1));
console.log(`lineas: ${lineas.length} (nacional 2012: ${nacional2012} + nacional 2002: ${n2002} + Gran Asuncion ${ga} + sin atributos 2012 ${sinNombre2012}) por tipo: ${JSON.stringify(resumenLineas)} · areas: ${areas.length} (${areasAgua} reclasificadas laguna/embalse, ${areas.length - areasAgua} ribera)`);
