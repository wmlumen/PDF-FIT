/**
 * POUT del Área Metropolitana (Capiatá, Fernando de la Mora, Lambaré, Limpio, Luque, Mariano Roque Alonso,
 * San Lorenzo, Villa Elisa): zonificación unificada, afectaciones y vínculo con parcelas SNC.
 * Datos: data/pout_ama/ (scripts/pout-ama.py, pout-ama-parcelas.py). Norma de cada zona: tabla usos_suelo de
 * data/snc.sqlite (catálogo de 13 zonas del AMA, cargado por scripts/import-pout-zonas.mjs).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = dirname(fileURLToPath(import.meta.url));
const DIR = join(RAIZ, 'data', 'pout_ama');
class ErrorPout extends Error { constructor(m, status = 400) { super(m); this.status = status; } }
export const MUNICIPIOS = { 'Capiatá': 'L|2', 'Fernando de la Mora': 'L|3', 'Lambaré': 'L|19', 'Limpio': 'L|7', 'Luque': 'L|8', 'Mariano Roque Alonso': 'L|9', 'San Lorenzo': 'L|13', 'Villa Elisa': 'L|14' };

const cache = {};
function leer(nombre) {
  if (cache[nombre]) return cache[nombre];
  const f = join(DIR, nombre);
  if (!existsSync(f)) throw new ErrorPout(`Falta ${nombre}: ejecute scripts/pout-ama.py y pout-ama-parcelas.py`, 404);
  cache[nombre] = JSON.parse(readFileSync(f, 'utf8'));
  return cache[nombre];
}
const caja = g => { let w = 180, s = 90, e = -180, n = -90; const rec = c => { if (typeof c[0] === 'number') { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); } else c.forEach(rec); }; rec(g.coordinates); return [w, s, e, n]; };
function indice(nombre) {
  const k = `idx:${nombre}`;
  if (cache[k]) return cache[k];
  cache[k] = leer(nombre).features.map(f => ({ f, c: caja(f.geometry) }));
  return cache[k];
}
const enAnillo = ([x, y], r) => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
const enPoligono = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []).some(pol => enAnillo(p, pol[0]) && !pol.slice(1).some(h => enAnillo(p, h)));
// Distancia aproximada (m) de un punto a una línea, para afectaciones lineales (vías a expropiar, cauces).
const M = 111320;
function distLinea(p, g) {
  const lineas = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
  let min = Infinity; const kx = Math.cos(p[1] * Math.PI / 180);
  for (const l of lineas) for (let i = 1; i < l.length; i++) {
    const ax = (l[i - 1][0] - p[0]) * kx * M, ay = (l[i - 1][1] - p[1]) * M, bx = (l[i][0] - p[0]) * kx * M, by = (l[i][1] - p[1]) * M;
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return min;
}

let normas = null;
async function norma(codigo) {
  if (!codigo) return null;
  if (!normas) {
    normas = {};
    try {
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(join(RAIZ, 'data', 'snc.sqlite'), sqlite3.OPEN_READONLY);
      const filas = await new Promise((ok, mal) => db.all('SELECT * FROM usos_suelo', (e, r) => (e ? mal(e) : ok(r))));
      db.close();
      for (const u of filas) normas[u.codigo] = { ...u, uso_permitido: JSON.parse(u.uso_permitido || '[]'), uso_condicionado: JSON.parse(u.uso_condicionado || '[]'), usos_no_permitidos: JSON.parse(u.usos_no_permitidos || '[]') };
    } catch { /* sin catálogo: solo el nombre de la zona */ }
  }
  return normas[codigo] || null;
}
// Código del catálogo de 13 zonas (misma regla conservadora que scripts/pout-ama-importar.py).
const sinTilde = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function codigoCatalogo(zona) {
  const z = sinTilde(zona).replace(/^zona (de |del )?/, '');
  return { 'residencial media': 'ZRM', 'residencial baja': 'ZRB1', 'residencial baja 1': 'ZRB1', 'mixta alta 1': 'ZMA1', 'mixta alta 2': 'ZMA2', 'mixta media': 'ZMM',
    'mixta baja': 'ZMB', 'mixta y logistica': 'ZML', 'industrial tecnologica': 'ZIT', 'costera rio py': 'ZBC' }[z] || null;
}

/** Zona POUT, norma y afectaciones en un punto WGS84. */
export async function enPunto(q) {
  const lat = Number(q.lat), lng = Number(q.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new ErrorPout('Indique lat y lng');
  const p = [lng, lat], dentro = c => p[0] >= c[0] && p[0] <= c[2] && p[1] >= c[1] && p[1] <= c[3];
  const z = indice('zonificacion_ama.geojson').find(x => dentro(x.c) && enPoligono(p, x.f.geometry))?.f.properties || null;
  const af = [];
  for (const x of indice('afectaciones_ama.geojson')) {
    const g = x.f.geometry, tipo = x.f.properties.tipo;
    if (/Polygon/.test(g.type)) { if (dentro(x.c) && enPoligono(p, g)) af.push({ tipo, capa: x.f.properties.capa }); }
    else if (/Line/.test(g.type)) { const margen = 0.0005; if (p[0] >= x.c[0] - margen && p[0] <= x.c[2] + margen && p[1] >= x.c[1] - margen && p[1] <= x.c[3] + margen) { const d = distLinea(p, g); if (d <= 30) af.push({ tipo, capa: x.f.properties.capa, distancia_m: Math.round(d) }); } }
  }
  const unicas = [...new Map(af.map(a => [a.tipo, a])).values()];
  const cod = z ? codigoCatalogo(z.zona) : null;
  return { dentro_pout_ama: !!z, zona: z, codigo: cod, norma: await norma(cod), afectaciones: unicas,
    fuente: 'POUT municipales del Área Metropolitana (shapefiles de trabajo de los planes). Referencial: verificar con la ordenanza vigente.' };
}
/** Zona y afectaciones de una parcela SNC (calculadas por scripts/pout-ama-parcelas.py). */
export async function deParcela(q) {
  const d = String(q.dpto || '').toUpperCase(), n = Number(q.dist), id = String(q.id_parcela || '');
  const f = `parcelas/${d}_${n}.json`;
  if (!existsSync(join(DIR, f))) return { dentro_pout_ama: false };
  const r = leer(f)[id];
  if (!r) return { dentro_pout_ama: false };
  const cod = codigoCatalogo(r[1]);
  return { dentro_pout_ama: true, categoria: r[0], zona: r[1], afectaciones: r[2], codigo: cod, norma: await norma(cod) };
}
/** Capa de zonas (o afectaciones) de un municipio o de todos, para los mapas. */
export function capa(tipo, municipio) {
  const fc = leer(tipo === 'afectaciones' ? 'afectaciones_ama.geojson' : 'zonificacion_ama.geojson');
  if (!municipio) return fc;
  const m = sinTilde(municipio);
  return { type: 'FeatureCollection', features: fc.features.filter(f => sinTilde(f.properties.municipio) === m) };
}
/** Catálogo de normas de uso del suelo (tabla usos_suelo): dato público de las ordenanzas, solo lectura. */
export async function usosSuelo() { await norma('ZRM'); return { usos_suelo: Object.values(normas || {}), fuente: 'Catálogo de zonas POUT del Área Metropolitana (data/snc.sqlite, usos_suelo)' }; }
export function resumen() { return { ...leer('resumen_ama.json'), municipios: MUNICIPIOS }; }
export { ErrorPout };
