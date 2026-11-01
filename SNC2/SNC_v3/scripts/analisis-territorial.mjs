#!/usr/bin/env node
/**
 * Genera AnalisisTerritorial.html: estudio económico por distrito con los datos oficiales de la DNIT
 * (liquidación del Impuesto Inmobiliario 2026, base data/dnit_cuentas.sqlite).
 *
 * El HTML es autónomo (datos incluidos, se abre con doble clic; solo usa Chart.js desde cdnjs) e independiente
 * del servidor del SNC. Regenerar cuando se actualice la base:
 *   node scripts/analisis-territorial.mjs [--salida ../AnalisisTerritorial/AnalisisTerritorial.html]
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { emparejar, normalizar } from './emparejar-distritos.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SALIDA = args.includes('--salida') ? args[args.indexOf('--salida') + 1] : join(RAIZ, '..', 'AnalisisTerritorial', 'AnalisisTerritorial.html');
const PLANTILLA = join(RAIZ, 'scripts', 'analisis-territorial.plantilla.html');

const db = new sqlite3.Database(join(RAIZ, 'data', 'dnit_cuentas.sqlite'), sqlite3.OPEN_READONLY);
const all = (sql, p = []) => new Promise((ok, mal) => db.all(sql, p, (e, r) => e ? mal(e) : ok(r)));

// ─── estadística ────────────────────────────────────────────────────────────────────────────────
const r0 = x => Math.round(x);
const r2 = x => Math.round(x * 100) / 100;
function cuantil(ordenado, q) {
  if (!ordenado.length) return null;
  const pos = (ordenado.length - 1) * q, b = Math.floor(pos);
  return ordenado[b + 1] !== undefined ? ordenado[b] + (pos - b) * (ordenado[b + 1] - ordenado[b]) : ordenado[b];
}
/** Curva de Lorenz (21 puntos), coeficiente de Gini y participación del 10 % y 1 % superior. */
function lorenz(valores) {
  const v = valores.filter(x => x > 0).sort((a, b) => a - b);
  const n = v.length, total = v.reduce((s, x) => s + x, 0);
  if (n < 2 || !total) return { puntos: [], gini: null, top10: null, top1: null };
  let acum = 0, area = 0, prev = 0;
  const acumulado = v.map(x => (acum += x));
  for (const a of acumulado) { area += (prev + a) / 2 / total / n; prev = a; }
  const puntos = [];
  for (let i = 0; i <= 20; i++) { const k = Math.round((i / 20) * n); puntos.push([i * 5, k ? r2((acumulado[k - 1] / total) * 100) : 0]); }
  const partSup = p => { const k = Math.max(1, Math.round(n * p)); return r2((v.slice(n - k).reduce((s, x) => s + x, 0) / total) * 100); };
  return { puntos, gini: Math.round((1 - 2 * area) * 1000) / 1000, top10: partSup(0.10), top1: partSup(0.01) };
}
function bins(valores, limites, peso) {
  const c = new Array(limites.length + 1).fill(0), w = new Array(limites.length + 1).fill(0);
  valores.forEach((x, i) => {
    let k = limites.findIndex(l => x < l);
    if (k < 0) k = limites.length;
    c[k]++; if (peso) w[k] += peso[i];
  });
  return peso ? { conteo: c, peso: w } : { conteo: c };
}

const LIM_IMPUESTO = [50e3, 100e3, 250e3, 500e3, 1e6, 2.5e6, 5e6];
const LIM_LOTE = [200, 360, 600, 1000, 5000];
const LIM_HA = [1, 5, 20, 50, 100, 500, 1000];

const aNumero = v => (typeof v === 'number' ? (Number.isFinite(v) ? v : null) : (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : null));

async function analizarUrbano(dpto, codDist) {
  const crudas = await all(`SELECT zona, piso, salon, superf_tierra_total AS st, superf_edif_total AS se, valor_tierra AS vt, valor_edificado AS ve,
    valor_oficial AS vo, impuesto_total AS it, impuesto_municipal_70 AS im FROM cuentas_urbanas
    WHERE vigente = 1 AND cod_dpto = ? ${codDist == null ? '' : 'AND cod_distrito = ?'}`, codDist == null ? [dpto] : [dpto, codDist]);
  if (!crudas.length) return null;
  // Saneamiento: algunas planillas traen texto (p. ej. nombres y documentos) en columnas numéricas.
  // Esos valores se tratan como faltantes; antes rompían el orden de las medianas (caso Luque).
  const CAMPOS_NUM = ['st', 'se', 'vt', 've', 'vo', 'it', 'im'];
  let celdasTexto = 0;
  const filas = crudas.map(f => { const g = { ...f }; for (const k of CAMPOS_NUM) { const v = aNumero(f[k]); if (f[k] != null && v === null) celdasTexto++; g[k] = v; } return g; });
  const n = filas.length, suma = k => filas.reduce((s, f) => s + (f[k] || 0), 0);
  const edificadas = filas.filter(f => (f.se || 0) > 0).length;
  const conTierra = filas.filter(f => (f.st || 0) > 0 && (f.vt || 0) > 0);
  const vm2 = conTierra.map(f => f.vt / f.st).sort((a, b) => a - b);
  // Lote mínimo: solo lotes propios (sin piso/salón). En propiedad horizontal la superficie es una cuota del terreno común.
  const esPH = f => (Number(f.piso) || 0) > 0 || (Number(f.salon) || 0) > 0;
  const ph = filas.filter(esPH).length;
  const lotes = filas.filter(f => !esPH(f) && (f.st || 0) > 0).map(f => f.st).sort((a, b) => a - b);
  // Superficie catastrada urbana: lotes propios de hasta 100 ha (los mayores son errores de unidad o chacras en el radio urbano).
  const MAX_LOTE_M2 = 1e6;
  const supLotes = lotes.filter(x => x <= MAX_LOTE_M2).reduce((a, b) => a + b, 0), lotesFueraRango = lotes.filter(x => x > MAX_LOTE_M2).length;
  const zonas = new Map();
  for (const f of filas) {
    const z = f.zona ?? 'sin zona';
    if (!zonas.has(z)) zonas.set(z, { n: 0, it: 0, vo: 0, ed: 0, vm2: [], conSup: 0, bajo: 0 });
    const g = zonas.get(z);
    if (!esPH(f) && (f.st || 0) > 0) { g.conSup++; if (f.st < 360) g.bajo++; }
    g.n++; g.it += f.it || 0; g.vo += f.vo || 0; if ((f.se || 0) > 0) g.ed++;
    if ((f.st || 0) > 0 && (f.vt || 0) > 0) g.vm2.push(f.vt / f.st);
  }
  const zonasOut = [...zonas.entries()].map(([z, g]) => {
    g.vm2.sort((a, b) => a - b);
    return { zona: z, conSup: g.conSup, bajo: g.bajo, cuentas: g.n, impuesto: r0(g.it), valor: r0(g.vo), pctEdificado: r2((g.ed / g.n) * 100), vm2Mediana: g.vm2.length ? r0(cuantil(g.vm2, 0.5)) : null };
  }).sort((a, b) => b.impuesto - a.impuesto);
  const imp = filas.filter(f => f.it !== null).map(f => f.it);
  return {
    cuentas: n, edificadas, pctEdificado: r2((edificadas / n) * 100),
    valorFiscal: r0(suma('vo')), valorTierra: r0(suma('vt')), valorEdificado: r0(suma('ve')),
    impuesto: r0(suma('it')), municipal70: r0(suma('im')), superficieM2: r0(suma('st')), superficieEdifM2: r0(suma('se')),
    impuestoMedio: r0(suma('it') / n), impuestoMediana: r0(cuantil([...imp].sort((a, b) => a - b), 0.5)),
    vm2: { p25: r0(cuantil(vm2, 0.25)), mediana: r0(cuantil(vm2, 0.5)), p75: r0(cuantil(vm2, 0.75)) },
    calidad: { celdasTexto, propiedadHorizontal: ph, lotesFueraRango },
    superficieLotesM2: r0(supLotes),
    lote: { mediana: r0(cuantil(lotes, 0.5)), bajoMinimo: lotes.filter(x => x < 360).length, conSuperficie: lotes.length, sinSuperficie: n - ph - lotes.length, propiedadHorizontal: ph,
      p25: r0(cuantil(lotes, 0.25)), muyChicos: lotes.filter(x => x < 200).length },
    // Cumplimiento del lote mínimo por zona catastral (zonas con más lotes bajo 360 m²).
    loteZonas: zonasOut.filter(z => z.conSup > 0).map(z => [z.zona, z.conSup, z.bajo]).sort((a, b) => b[2] - a[2]).slice(0, 15),
    histImpuesto: bins(imp, LIM_IMPUESTO).conteo,
    histLote: bins(lotes, LIM_LOTE).conteo,
    zonas: zonasOut.slice(0, 15), totalZonas: zonasOut.length,
    lorenzValor: lorenz(filas.map(f => f.vo || 0)),
    lorenzSuelo: lorenz(filas.map(f => f.st || 0)),
    impuestoZonas: zonasOut.map(z => z.impuesto),
    vm2Zonas: zonasOut.filter(z => z.cuentas >= 20 && z.vm2Mediana).map(z => [z.zona, z.vm2Mediana]).sort((a, b) => b[1] - a[1]).slice(0, 25)
  };
}

async function analizarRural(dpto, codDist) {
  const filas = await all(`SELECT hectareas AS ha, metros2 AS m2, valor_oficial AS vo, impuesto_total AS it, impuesto_municipal_70 AS im
    FROM cuentas_rurales WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ?`, [dpto, codDist]);
  if (!filas.length) return null;
  // Algunas planillas rurales de la DNIT traen columnas corridas (texto en HAS/MTS2): esas filas no suman superficie.
  const numero = v => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : null));
  // Tope de plausibilidad: un padrón de más de 200.000 ha es un error de la planilla (p. ej. Itacurubí de la Cordillera).
  const MAX_HA = 200000;
  const haDe = f => { const h = numero(f.ha), m = numero(f.m2); if (h === null && m === null) return null; const t = (h || 0) + (m || 0) / 10000; return t > MAX_HA ? null : t; };
  const area = filas.map(f => haDe(f) ?? 0);
  const areaInvalida = filas.filter(f => haDe(f) === null).length;
  const n = filas.length, sumaA = area.reduce((s, x) => s + x, 0);
  const suma = k => filas.reduce((s, f) => s + (aNumero(f[k]) || 0), 0);
  const vha = filas.map((f, i) => (area[i] > 0 ? (aNumero(f.vo) || 0) / area[i] : null)).filter(x => x).sort((a, b) => a - b);
  const clases = bins(area, LIM_HA, area);
  return {
    padrones: n, hectareas: r0(sumaA), areaInvalida, valorFiscal: r0(suma('vo')), impuesto: r0(suma('it')), municipal70: r0(suma('im')),
    haMediana: r2(cuantil([...area].sort((a, b) => a - b), 0.5)), haMedia: r2(sumaA / n),
    valorHaMediana: r0(cuantil(vha, 0.5)),
    clases: { conteo: clases.conteo, hectareas: clases.peso.map(r0) },
    lorenzArea: lorenz(area),
    lorenzValor: lorenz(filas.map(f => aNumero(f.vo) || 0))
  };
}

// ─── principal ──────────────────────────────────────────────────────────────────────────────────
// Distritos por código (dpto + cod_distrito). Algunas planillas no traen el nombre: se toma de la otra planilla
// del mismo distrito o del registro de importación (fuentes.distrito, el nombre que publica la DNIT).
const codigos = await all(`SELECT cod_dpto, cod_distrito, MAX(distrito) AS nombre, MAX(grupo) AS grupo FROM (
    SELECT cod_dpto, cod_distrito, distrito, grupo FROM cuentas_urbanas WHERE vigente = 1 AND cod_dpto BETWEEN 'A' AND 'Z' AND LENGTH(cod_dpto) = 1
    UNION ALL SELECT cod_dpto, cod_distrito, distrito, grupo FROM cuentas_rurales WHERE vigente = 1 AND cod_dpto BETWEEN 'A' AND 'Z' AND LENGTH(cod_dpto) = 1)
  GROUP BY cod_dpto, cod_distrito`);
const nombresDpto = new Map((await all('SELECT DISTINCT cod_dpto, departamento FROM cuentas_urbanas WHERE departamento IS NOT NULL')).map(r => [r.cod_dpto, r.departamento]));
const depFuentes = new Map((await all('SELECT DISTINCT departamento, distrito, tipo FROM fuentes')).map(f => [`${f.departamento}|${f.distrito}|${f.tipo}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(), f]));

// Carga de Índice de Riesgo Climático e Inundación (MHC-PY, Paso B)
const fClima = join(RAIZ, 'Cambio_climatico', 'indice_riesgo_inundacion_distritos.json');
const mapaClima = new Map();
if (existsSync(fClima)) {
  const parsed = JSON.parse(readFileSync(fClima, 'utf8'));
  const lista = Array.isArray(parsed) ? parsed : (parsed.distritos || []);
  for (const item of lista) {
    const kDepDist = `${normalizar(item.depto)}|${normalizar(item.distrito)}`;
    mapaClima.set(kDepDist, item);
    mapaClima.set(normalizar(item.distrito), item);
  }
}

const datos = [];
for (const c of codigos) {
  const f = c.grupo ? depFuentes.get(c.grupo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()) : null;
  const nombre = c.nombre || f?.distrito || `Distrito ${c.cod_distrito}`;
  const departamento = nombresDpto.get(c.cod_dpto) || f?.departamento || c.cod_dpto;
  const urbano = await analizarUrbano(c.cod_dpto, c.cod_distrito);
  const rural = await analizarRural(c.cod_dpto, c.cod_distrito);
  const clima = mapaClima.get(`${normalizar(departamento)}|${normalizar(nombre)}`) || mapaClima.get(normalizar(nombre)) || null;
  datos.push({ id: `${c.cod_dpto}|${c.cod_distrito}`, dpto: c.cod_dpto, codDistrito: c.cod_distrito, departamento: String(departamento).toUpperCase(), distrito: String(nombre).toUpperCase(), urbano, rural, clima });
  process.stdout.write(`\r${datos.length} distritos analizados`);
}
// Asunción: la DNIT la publica en 6 planillas (subdivisiones). Se agrega un total y cada parte apunta a él.
const totales = [];
const partesA = datos.filter(d => d.dpto === 'A');
if (partesA.length > 1) {
  const id = 'A|0';
  for (const p of partesA) p.parteDe = id;
  const climaAsu = mapaClima.get('ASUNCION') || null;
  totales.push({ id, dpto: 'A', codDistrito: 0, departamento: partesA[0].departamento, distrito: 'ASUNCION', total: true,
    subdivisiones: partesA.map(p => p.id), urbano: await analizarUrbano('A', null), rural: null, clima: climaAsu });
}
// Superficie oficial del distrito y de su área urbana (SNC, capas ly_dist y ly_urba; scripts/snc-superficies.py)
// frente a la superficie que figura en la liquidación: lo que falta es territorio sin catastrar o sin liquidar.
let superficies = null;
{
  const ruta = join(RAIZ, 'data', 'snc_estadisticas', 'superficies_distritos.json');
  if (existsSync(ruta)) {
    const S = JSON.parse(readFileSync(ruta, 'utf8')).distritos;
    const calc = (d, s) => {
      const urbCat = d.urbano?.superficieLotesM2 ? d.urbano.superficieLotesM2 / 1e4 : 0;
      const rur = d.rural?.hectareas || 0;
      // Superficie rural poco confiable: planillas con unidades distintas o padrones descartados.
      const rurDudosa = (d.rural?.areaInvalida || 0) > 0 || rur > s.ha_oficial * 1.05;
      const cat = urbCat + (rurDudosa ? 0 : rur);
      const urbOk = urbCat <= s.ha_oficial;
      return { urbanoDudoso: !urbOk, pctUrbanaLotes: s.ha_urbana ? Math.round(urbCat / s.ha_urbana * 1000) / 10 : null, haOficial: s.ha_oficial, haUrbana: s.ha_urbana, haRural: s.ha_urbana != null ? Math.max(0, s.ha_oficial - s.ha_urbana) : null,
        normasUrbanas: s.normas_urbanas, haCatUrbana: Math.round(urbCat * 10) / 10, haCatRural: rurDudosa ? null : Math.round(rur * 10) / 10, rurDudosa,
        haCatastrada: Math.round(cat * 10) / 10, haSinCatastro: rurDudosa ? null : Math.round((s.ha_oficial - cat) * 10) / 10,
        pctCatastrado: rurDudosa || !s.ha_oficial ? null : Math.round(cat / s.ha_oficial * 1000) / 10 };
    };
    let n = 0;
    for (const d of datos) { const s = S[d.id]; if (s) { d.superficie = calc(d, s); n++; } }
    for (const t of totales) {
      const partes = datos.filter(d => d.parteDe === t.id && d.superficie);
      if (partes.length) {
        const sum = k => partes.reduce((a, p) => a + (p.superficie[k] || 0), 0);
        const ofi = sum('haOficial'), urb = partes.some(p => p.superficie.haUrbana != null) ? sum('haUrbana') : null, cat = sum('haCatastrada');
        t.superficie = { haOficial: ofi, haUrbana: urb, haRural: urb != null ? ofi - urb : null, haCatUrbana: sum('haCatUrbana'), haCatRural: 0, rurDudosa: false,
          haCatastrada: cat, haSinCatastro: ofi - cat, pctCatastrado: ofi ? Math.round(cat / ofi * 1000) / 10 : null, normasUrbanas: {} };
      }
    }
    superficies = { fuente: 'SNC, servicio WFS (snc:ly_dist, snc:ly_urba)', distritos: n };
    console.log(`\nSuperficies SNC: ${n} distritos`);
  }
}
// Geometría simplificada para los mapas (scripts/snc-mapa.py).
const rutaMapa = join(RAIZ, 'data', 'snc_estadisticas', 'mapa_distritos.json');
const mapa = existsSync(rutaMapa) ? JSON.parse(readFileSync(rutaMapa, 'utf8')) : null;
// Origen UTM del mapa (esquina superior izquierda) para la grilla de coordenadas: mismos límites SNC (ly_dist).
if (mapa && !mapa.origen) {
  const rl = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  if (existsSync(rl)) {
    let x0 = Infinity, y1 = -Infinity;
    const rec = c => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); y1 = Math.max(y1, c[1]); } else c.forEach(rec); };
    JSON.parse(readFileSync(rl, 'utf8')).features.forEach(f => f.geometry && rec(f.geometry.coordinates));
    mapa.origen = [Math.round(x0), Math.round(y1)];
  }
}
// Nombres oficiales del SNC de todos los distritos del mapa (incluye los que no tienen planilla DNIT, p. ej. Q|7 Boquerón, E|4 Independencia).
if (mapa) {
  const rl = join(RAIZ, 'data', 'snc_estadisticas', 'ly_dist_utm.geojson');
  if (existsSync(rl)) mapa.nombres = Object.fromEntries(JSON.parse(readFileSync(rl, 'utf8')).features.map(f => [`${f.properties.cod_dpto}|${Number(f.properties.cod_dist)}`, f.properties.nom_dist]));
}
const fuentes = await all('SELECT COUNT(*) AS planillas, MAX(importado_en) AS ultima FROM fuentes');
// Evolución por ejercicio fiscal (tabla historico_cuentas; cada año registrado según el título de su planilla).
const evolucion = { ejercicios: [], series: {} };
try {
  const h = await all(`SELECT ejercicio, cod_dpto, cod_distrito, tipo, COUNT(*) AS c, SUM(impuesto_total) AS i, SUM(valor_oficial) AS v, SUM(superficie_m2) AS s
    FROM historico_cuentas WHERE cod_dpto BETWEEN 'A' AND 'Z' AND LENGTH(cod_dpto) = 1 GROUP BY 1, 2, 3, 4`);
  const anios = new Set();
  for (const r of h) {
    anios.add(r.ejercicio);
    const id = `${r.cod_dpto}|${r.cod_distrito}`;
    const e = ((evolucion.series[id] ||= {})[r.ejercicio] ||= { u: null, r: null });
    e[r.tipo === 'urbano' ? 'u' : 'r'] = { c: r.c, i: Math.round(r.i || 0), v: Math.round(r.v || 0), s: Math.round(r.s || 0) };
  }
  evolucion.ejercicios = [...anios].sort();
} catch (e) { console.warn(`\nSin histórico por ejercicio: ${e.message}`); }
// Ejercicios anteriores publicados por el SNC como total por distrito (impuesto + adicionales, urbano + rural).
// Fuente: "Recaudación potencial por municipio del Impuesto Inmobiliario 2024" (PDF del SNC; scripts/snc-potencial.py).
const fuentesEvolucion = {};
for (const anio of [2024]) {
  const ruta = join(RAIZ, 'data', 'snc_estadisticas', `potencial_${anio}.json`);
  if (!existsSync(ruta)) continue;
  const P = JSON.parse(readFileSync(ruta, 'utf8')), C = {};
  for (const [dep, o] of Object.entries(P)) for (const [n, v] of Object.entries(o)) C[`${normalizar(dep).replace(/^PRESIDENTE HAYES$/, 'PTE HAYES')}|${normalizar(n)}`] = v;
  let unidos = 0;
  for (const d of datos) {
    const k = emparejar(d.departamento, d.distrito, C);
    if (!k) continue;
    ((evolucion.series[d.id] ||= {})[anio] = { u: { c: null, i: C[k], v: null, s: null }, r: null, soloTotal: true });
    unidos++;
  }
  if (unidos) { evolucion.ejercicios = [...new Set([...evolucion.ejercicios, anio])].sort(); fuentesEvolucion[anio] = { fuente: 'SNC, Recaudación potencial por municipio del Impuesto Inmobiliario', distritos: unidos }; }
  console.log(`\nSNC ${anio}: ${unidos} distritos`);
}
evolucion.fuentes = fuentesEvolucion;

// Insumos espaciales del potencial (scripts/potencial-territorial.py): zonas residenciales dentro/fuera del casco, sin parcela, por barrio.
let potencialEspacial = null;
{
  const fp = join(RAIZ, 'data', 'snc_estadisticas', 'potencial_distrito.json');
  if (existsSync(fp)) {
    const P = JSON.parse(readFileSync(fp, 'utf8')).distritos;
    let n = 0;
    for (const d of datos) { const x = P[`${d.dpto}|${d.codDistrito}`]; if (x) { d.potencialEspacial = x; n++; } }
    potencialEspacial = { fuente: 'Zonas residenciales OSM × cascos urbanos SNC × barrios DGEEC × parcelario SNC', distritos: n };
    console.log(`Potencial espacial: ${n} distritos`);
  }
}

// Barrios DGEEC frente al casco urbano SNC (scripts/barrios-sin-cascos.py).
let barriosCasco = null;
{
  const fb = join(RAIZ, 'data', 'snc_estadisticas', 'barrios_por_distrito.json');
  if (existsSync(fb)) {
    const B = JSON.parse(readFileSync(fb, 'utf8')).distritos;
    let n = 0;
    for (const d of datos) { const b = B[`${d.dpto}|${d.codDistrito}`]; if (b) { d.barriosCasco = b; n++; } }
    barriosCasco = { fuente: 'DGEEC (barrios y localidades) partidos por los cascos urbanos del SNC', distritos: n };
    console.log(`Barrios × casco: ${n} distritos`);
  }
}

// Edificios de OpenStreetMap vinculados a la parcela y comparados con la liquidación (scripts/osm-edificios-pais.mjs).
let edificacionOsm = null;
{
  const dirE = join(RAIZ, 'data', 'edificios');
  let n = 0;
  for (const d of datos) {
    const fr = join(dirE, `${d.dpto}_${d.codDistrito}_resumen.json`), fc = join(dirE, `${d.dpto}_${d.codDistrito}_comparacion.json`);
    if (!existsSync(fr)) continue;
    try {
      const r = JSON.parse(readFileSync(fr, 'utf8'));
      const comp = existsSync(fc) ? JSON.parse(readFileSync(fc, 'utf8')) : [];
      const est = k => comp.filter(x => x.estado === k);
      const esRural = x => /^padr/i.test(String(x.ctacte || ''));
      const dudoso = x => (Number(x.edificado_dnit_m2) || 0) > 100000 || (Number(x.edificado_dnit_m2) || 0) > 50 * Math.max(1, Number(x.construido_osm_m2) || 0);
      const sumar = (l, c) => Math.round(l.reduce((a, x) => a + (Number(x[c]) || 0), 0));
      const enComparadas = comp.reduce((a, x) => a + (x.edificios || 0), 0);
      d.edificacionOsm = {
        edificios: r.edificios, huellaM2: Math.round(r.huellaM2 || 0),
        noDeclarada: est('no_declarada').length, liquidaMenos: est('menor_declarada').length, liquidaMas: est('mayor_declarada').length,
        coincide: est('coincide').length, sinHuella: est('sin_huella').length,
        asignarMano: r.pendientes || 0, sinParcela: r.sinParcela || 0, sinParcelaM2: Math.round(r.sinParcelaM2 || 0),
        enParcelaSinDif: Math.max(0, (r.auto || 0) + (r.manual || 0) - enComparadas),
        m2NoDeclarados: sumar(est('no_declarada'), 'm2_a_completar'), m2ACompletar: sumar(est('menor_declarada'), 'm2_a_completar'),
        // Diferencias con m² DNIT imposibles (más de 100.000 m² o 50 veces lo del mapa) se cuentan aparte como dato dudoso.
        m2LiquidaMas: Math.round(est('mayor_declarada').filter(x => !dudoso(x)).reduce((a, x) => a + Math.max(0, (Number(x.edificado_dnit_m2) || 0) - (Number(x.construido_osm_m2) || 0)), 0)),
        liquidaMasDudoso: est('mayor_declarada').filter(dudoso).length,
        // Separado por tipo de cuenta: Cta. Cte. = casco urbano actual; padrón = zona rural (poblada fuera del casco).
        m2NoDeclUrb: sumar(est('no_declarada').filter(x => !esRural(x)), 'm2_a_completar'), m2NoDeclRur: sumar(est('no_declarada').filter(esRural), 'm2_a_completar'),
        m2CompletarUrb: sumar(est('menor_declarada').filter(x => !esRural(x)), 'm2_a_completar'), m2CompletarRur: sumar(est('menor_declarada').filter(esRural), 'm2_a_completar'),
        noDeclUrb: est('no_declarada').filter(x => !esRural(x)).length, noDeclRur: est('no_declarada').filter(esRural).length,
        // «Liquida más que el mapa»: el mapa casi nunca trae los pisos. Se separa lo que se explica por altura o por varias unidades.
        ...(() => {
          const mas = est('mayor_declarada').filter(x => !dudoso(x));
          const razon = x => (Number(x.edificado_dnit_m2) || 0) / Math.max(1, Number(x.construido_osm_m2) || 0);
          const ph = mas.filter(x => /\/\d{2}-(?!000)\d{3}$/.test(String(x.ctacte || '')));
          const resto = mas.filter(x => !ph.includes(x));
          const altura = resto.filter(x => razon(x) >= 1.5 && razon(x) <= 8), menor = resto.filter(x => razon(x) < 1.5), otros = resto.filter(x => razon(x) > 8);
          const pisos = altura.map(x => Math.round(razon(x)));
          return { masPH: ph.length, masAltura: altura.length, masMenor: menor.length, masOtros: otros.length,
            masAlturaPisosMediana: pisos.length ? pisos.sort((a, b) => a - b)[Math.floor(pisos.length / 2)] : null };
        })()
      };
      n++;
    } catch (e) { console.warn('edificación OSM', d.id, e.message); }
  }
  if (n) edificacionOsm = { fuente: 'OpenStreetMap (ODbL), Geofabrik 2026; vínculo con parcelas SNC y liquidación DNIT 2026', distritos: n };
  console.log(`Edificación OSM: ${n} distritos`);
}

const paquete = {
  generado: new Date().toISOString(), ultimaImportacion: fuentes[0].ultima,
  evolucion,
  totales,
  superficies,
  edificacionOsm,
  barriosCasco,
  potencialEspacial,
  mapa,
  limites: { impuesto: LIM_IMPUESTO, lote: LIM_LOTE, hectareas: LIM_HA },
  distritos: datos.sort((a, b) => (a.departamento + a.distrito).localeCompare(b.departamento + b.distrito, 'es'))
};
const html = readFileSync(PLANTILLA, 'utf8').replace('/*__DATOS__*/null', JSON.stringify(paquete).replace(/</g, '\\u003c'));
mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, html);
// Copia que publica el SNC en /analisis-territorial (data/analisis/, fuera de git).
// El SNC aplica una CSP sin 'unsafe-inline': se separan estilos, código y datos en archivos propios.
const DIR_SNC = join(RAIZ, 'data', 'analisis');
mkdirSync(DIR_SNC, { recursive: true });
const plantilla = readFileSync(PLANTILLA, 'utf8');
const css = plantilla.match(/<style>([\s\S]*?)<\/style>/)[1];
const codigo = plantilla.match(/<script>\n?([\s\S]*?)<\/script>\s*<\/body>/)[1].replace('const DATOS = /*__DATOS__*/null;', 'const DATOS = window.DATOS_ANALISIS;');
const htmlSnc = plantilla
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>\n?/, '')
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/analisis-territorial/analisis.css">')
  .replace('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', '/analisis-territorial/chart.umd.min.js')
  .replace(/<script>\n?[\s\S]*?<\/script>(\s*<\/body>)/, '<script src="/analisis-territorial/analisis-datos.js"></script>\n<script src="/analisis-territorial/analisis-app.js"></script>$1');
writeFileSync(join(DIR_SNC, 'AnalisisTerritorial.html'), htmlSnc);
writeFileSync(join(DIR_SNC, 'analisis.css'), css);
writeFileSync(join(DIR_SNC, 'analisis-app.js'), codigo);
writeFileSync(join(DIR_SNC, 'analisis-datos.js'), 'window.DATOS_ANALISIS = ' + JSON.stringify(paquete) + ';\n');
// Chart.js 4.4.1 local (scripts/vendor): el informe servido por el SNC funciona sin internet.
writeFileSync(join(DIR_SNC, 'chart.umd.min.js'), readFileSync(join(RAIZ, 'scripts', 'vendor', 'chart.umd.min.js')));
console.log(`\n${SALIDA} (${(html.length / 1024).toFixed(0)} KB, ${datos.length} distritos)`);
db.close();
