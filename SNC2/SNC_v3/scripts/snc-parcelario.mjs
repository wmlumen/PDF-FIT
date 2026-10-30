/**
 * Descarga el parcelario oficial del SNC (WFS snc:parcelas_activas) de un distrito y lo vincula con la
 * liquidación DNIT importada en data/dnit_cuentas.sqlite.
 *   urbano: dpto + distrito + zona + manzana + lote      rural: dpto + distrito + padrón
 * Salida (data/parcelario/):
 *   <DPTO>_<DIST>.geojson        parcelas (EPSG:32721) con los datos de su cuenta DNIT
 *   <DPTO>_<DIST>_resumen.json   cuántas parcelas tienen cuenta y cuántas cuentas no tienen parcela
 *   <DPTO>_<DIST>_sin_parcela.csv  cuentas liquidadas sin polígono en el parcelario
 * Uso: node scripts/snc-parcelario.mjs --dpto D --dist 12
 * Descarga por páginas de 2.000 con pausa de 1 s para no cargar el servidor del SNC.
 */
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
const DPTO = String(opt('dpto') || '').toUpperCase(), DIST = Number(opt('dist'));
if (!/^[A-Z]$/.test(DPTO) || !Number.isInteger(DIST)) { console.error('Uso: node scripts/snc-parcelario.mjs --dpto D --dist 12'); process.exit(1); }
const WFS = process.env.CATASTRO_WFS_URL || 'https://www.catastro.gov.py/geoserver/ows';
const CAMPOS = ['id_parcela', 'dpto', 'dist', 'padron', 'zona', 'mz', 'lote', 'finca', 'ccatastral', 'nro_matricula', 'tipo_cuenta', 'hectareas',
  'superficie_tierra', 'superficie_edificado', 'valor_tierra', 'valor_edificado', 'obs', 'shape'];
// Algunos textos del SNC llegan con doble codificación ("N°" llega con un carácter "Â" de más delante del signo): se reparan al guardar.
export const reparar = t => (typeof t === 'string' && /[ÃÂ][\u0080-\u00ff]/.test(t) ? (() => { const r = Buffer.from(t, 'latin1').toString('utf8'); return r.includes('\ufffd') ? t : r; })() : t);
const PAGINA = 2000, esperar = ms => new Promise(r => setTimeout(r, ms));
const AGENTE = 'CatastroPYPro/3 (SNC v3; parcelario por distrito)';

async function pagina(inicio) {
  const q = new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'snc:parcelas_activas', outputFormat: 'application/json',
    srsName: 'EPSG:32721', count: String(PAGINA), startIndex: String(inicio), sortBy: 'id_parcela', propertyName: CAMPOS.join(','), CQL_FILTER: `dpto='${DPTO}' AND dist=${DIST}` });
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(`${WFS}?${q}`, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (intento >= 4) throw e; console.warn(`  reintento ${intento}: ${e.message}`); await esperar(5000 * intento); }
  }
}

const db = new sqlite3.Database(join(RAIZ, 'data', 'dnit_cuentas.sqlite'), sqlite3.OPEN_READONLY);
const all = (sql, p = []) => new Promise((ok, mal) => db.all(sql, p, (e, r) => e ? mal(e) : ok(r)));
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : null));

const urb = await all(`SELECT ctacte, zona, manzana, lote, piso, salon, superf_tierra_total, superf_edif_total, valor_tierra, valor_edificado, valor_oficial, impuesto_total
  FROM cuentas_urbanas WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ?`, [DPTO, DIST]);
const rur = await all(`SELECT padron, hectareas, metros2, valor_oficial, impuesto_total FROM cuentas_rurales WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ?`, [DPTO, DIST]);
// Cuentas urbanas por lote: un lote puede tener varias cuentas (propiedad horizontal: pisos y salones).
const porLote = new Map();
for (const c of urb) { const k = `${c.zona}|${c.manzana}|${c.lote}`; if (!porLote.has(k)) porLote.set(k, []); porLote.get(k).push(c); }
const porPadron = new Map(rur.map(c => [Number(c.padron), c]));
console.log(`DNIT: ${urb.length} cuentas urbanas en ${porLote.size} lotes, ${rur.length} padrones rurales`);

const salida = join(RAIZ, 'data', 'parcelario');
mkdirSync(salida, { recursive: true });
const base = join(salida, `${DPTO}_${DIST}`);
const geo = createWriteStream(`${base}.geojson`, 'utf8');
geo.write('{"type":"FeatureCollection","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::32721"}},"features":[\n');
let total = 0, primero = true;
const usadosLote = new Set(), usadosPadron = new Set();
const res = { urbanas: 0, urbanasConCuenta: 0, rurales: 0, ruralesConCuenta: 0, sinClave: 0, difSuperficieMayor10: 0 };
for (let inicio = 0; ; inicio += PAGINA) {
  const d = await pagina(inicio);
  const fs = d.features || [];
  for (const f of fs) {
    const p = f.properties || {};
    const g = f.geometry || p.shape; delete p.shape;
    for (const k of Object.keys(p)) p[k] = reparar(p[k]);
    const out = { ...p };
    if (p.zona != null && p.mz != null && p.lote != null) {
      res.urbanas++;
      const k = `${p.zona}|${p.mz}|${p.lote}`, cs = porLote.get(k);
      if (cs) {
        res.urbanasConCuenta++; usadosLote.add(k);
        const propia = cs.find(c => !(Number(c.piso) > 0 || Number(c.salon) > 0)) || cs[0];
        const sum = campo => cs.reduce((a, c) => a + (num(c[campo]) || 0), 0);
        Object.assign(out, { vinculo: 'urbano', dnit_ctacte: propia.ctacte, dnit_cuentas: cs.length, dnit_sup_tierra_m2: num(propia.superf_tierra_total),
          dnit_sup_edif_m2: sum('superf_edif_total'), dnit_valor_oficial: sum('valor_oficial'), dnit_impuesto: sum('impuesto_total') });
      } else out.vinculo = 'sin_cuenta';
    } else if (p.padron != null) {
      res.rurales++;
      const c = porPadron.get(Number(p.padron));
      if (c) {
        res.ruralesConCuenta++; usadosPadron.add(Number(p.padron));
        const haDnit = (num(c.hectareas) || 0) + (num(c.metros2) || 0) / 10000;
        Object.assign(out, { vinculo: 'rural', dnit_padron: c.padron, dnit_ha: Math.round(haDnit * 10000) / 10000, dnit_valor_oficial: num(c.valor_oficial), dnit_impuesto: num(c.impuesto_total) });
      } else out.vinculo = 'sin_cuenta';
    } else { res.sinClave++; out.vinculo = 'sin_clave'; }
    // Superficie: la del SNC (hectareas + m²) frente a la que liquida la DNIT.
    const supSnc = (num(p.hectareas) || 0) * 10000 + (num(p.superficie_tierra) || 0);
    out.snc_sup_m2 = supSnc || null;
    const supDnit = out.dnit_sup_tierra_m2 ?? (out.dnit_ha != null ? out.dnit_ha * 10000 : null);
    if (supSnc && supDnit) { out.dif_superficie_pct = Math.round((supDnit - supSnc) / supSnc * 1000) / 10; if (Math.abs(out.dif_superficie_pct) > 10) res.difSuperficieMayor10++; }
    geo.write((primero ? '' : ',\n') + JSON.stringify({ type: 'Feature', geometry: g, properties: out }));
    primero = false; total++;
  }
  process.stdout.write(`\r  ${total} parcelas descargadas`);
  if (fs.length < PAGINA) break;
  await esperar(1000);
}
geo.write('\n]}\n'); geo.end();

const sinParcelaUrb = urb.filter(c => !usadosLote.has(`${c.zona}|${c.manzana}|${c.lote}`));
const sinParcelaRur = rur.filter(c => !usadosPadron.has(Number(c.padron)));
writeFileSync(`${base}_sin_parcela.csv`, 'tipo,cuenta,valor_oficial,impuesto_total\n'
  + sinParcelaUrb.map(c => `urbano,${c.ctacte},${num(c.valor_oficial) ?? ''},${num(c.impuesto_total) ?? ''}`).join('\n') + '\n'
  + sinParcelaRur.map(c => `rural,${c.padron},${num(c.valor_oficial) ?? ''},${num(c.impuesto_total) ?? ''}`).join('\n') + '\n');
const resumen = { dpto: DPTO, dist: DIST, fecha: new Date().toISOString(), fuente: `${WFS} (snc:parcelas_activas)`, parcelas: total, ...res,
  cuentasUrbanasDnit: urb.length, cuentasUrbanasSinParcela: sinParcelaUrb.length, padronesDnit: rur.length, padronesSinParcela: sinParcelaRur.length,
  impuestoSinParcela: Math.round([...sinParcelaUrb, ...sinParcelaRur].reduce((a, c) => a + (num(c.impuesto_total) || 0), 0)) };
writeFileSync(`${base}_resumen.json`, JSON.stringify(resumen, null, 2));
console.log('\n' + JSON.stringify(resumen, null, 2));
db.close();
