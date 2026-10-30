/**
 * Descarga y vincula el parcelario de todos los distritos (usa scripts/snc-parcelario.mjs uno por uno).
 * Retoma: salta los distritos que ya tienen <DPTO>_<DIST>_resumen.json (use --rehacer para repetirlos).
 * Al terminar escribe data/parcelario/resumen_pais.json y resumen_pais.csv.
 * Uso: node scripts/snc-parcelario-pais.mjs [--dpto D] [--rehacer]
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'data', 'parcelario');
mkdirSync(DIR, { recursive: true });
const args = process.argv.slice(2);
const soloDpto = args.includes('--dpto') ? args[args.indexOf('--dpto') + 1].toUpperCase() : null;
const rehacer = args.includes('--rehacer');
const sup = JSON.parse(readFileSync(join(RAIZ, 'data', 'snc_estadisticas', 'superficies_distritos.json'), 'utf8')).distritos;
const lista = Object.entries(sup).map(([k, v]) => ({ dpto: k.split('|')[0], dist: Number(k.split('|')[1]), nombre: v.nombre }))
  .filter(d => !soloDpto || d.dpto === soloDpto).sort((a, b) => a.dpto.localeCompare(b.dpto) || a.dist - b.dist);
const log = join(DIR, 'progreso.log');
const t0 = Date.now();
let hechos = 0, errores = 0;
for (const [i, d] of lista.entries()) {
  const base = join(DIR, `${d.dpto}_${d.dist}`);
  if (!rehacer && existsSync(`${base}_resumen.json`)) { hechos++; continue; }
  const ini = Date.now();
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts', 'snc-parcelario.mjs'), '--dpto', d.dpto, '--dist', String(d.dist)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0 && existsSync(`${base}_resumen.json`);
  ok ? hechos++ : errores++;
  const linea = `${new Date().toISOString()} ${i + 1}/${lista.length} ${d.dpto}|${d.dist} ${d.nombre} ${ok ? 'ok' : 'ERROR ' + String(r.stderr || r.stdout).slice(-300).replace(/\s+/g, ' ')} ${Math.round((Date.now() - ini) / 1000)} s`;
  appendFileSync(log, linea + '\n'); console.log(linea);
}
// Resumen nacional
const filas = [];
for (const d of lista) {
  const f = join(DIR, `${d.dpto}_${d.dist}_resumen.json`);
  if (existsSync(f)) filas.push({ nombre: d.nombre, ...JSON.parse(readFileSync(f, 'utf8')) });
}
const suma = k => filas.reduce((a, x) => a + (x[k] || 0), 0);
const tot = { distritos: filas.length, de: lista.length, errores, parcelas: suma('parcelas'), urbanas: suma('urbanas'), urbanasConCuenta: suma('urbanasConCuenta'),
  rurales: suma('rurales'), ruralesConCuenta: suma('ruralesConCuenta'), sinClave: suma('sinClave'), cuentasUrbanasDnit: suma('cuentasUrbanasDnit'),
  cuentasUrbanasSinParcela: suma('cuentasUrbanasSinParcela'), padronesDnit: suma('padronesDnit'), padronesSinParcela: suma('padronesSinParcela'),
  impuestoSinParcela: suma('impuestoSinParcela'), minutos: Math.round((Date.now() - t0) / 60000) };
writeFileSync(join(DIR, 'resumen_pais.json'), JSON.stringify({ fecha: new Date().toISOString(), total: tot, distritos: filas }, null, 2));
const cols = ['dpto', 'dist', 'nombre', 'parcelas', 'urbanas', 'urbanasConCuenta', 'rurales', 'ruralesConCuenta', 'sinClave', 'cuentasUrbanasDnit', 'cuentasUrbanasSinParcela', 'padronesDnit', 'padronesSinParcela', 'impuestoSinParcela'];
writeFileSync(join(DIR, 'resumen_pais.csv'), cols.join(',') + '\n' + filas.map(x => cols.map(c => JSON.stringify(x[c] ?? '')).join(',')).join('\n') + '\n');
console.log('TOTAL', JSON.stringify(tot));
