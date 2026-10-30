/**
 * Edificios OSM de todos los distritos (usa scripts/osm-edificios.mjs con el extracto nacional data/osm/edificios_py.fgb).
 * Retoma: salta los distritos que ya tienen data/edificios/<D>_<N>_resumen.json (--rehacer para repetir).
 * Al terminar: data/edificios/resumen_pais.json y resumen_pais.csv.
 * Preparar el extracto: data/osm/extraer.cmd (Geofabrik paraguay-latest.osm.pbf → FlatGeobuf con GDAL de QGIS).
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'data', 'edificios');
mkdirSync(DIR, { recursive: true });
const rehacer = process.argv.includes('--rehacer');
const sup = JSON.parse(readFileSync(join(RAIZ, 'data', 'snc_estadisticas', 'superficies_distritos.json'), 'utf8')).distritos;
const lista = Object.entries(sup).map(([k, v]) => ({ dpto: k.split('|')[0], dist: Number(k.split('|')[1]), nombre: v.nombre }))
  .sort((a, b) => a.dpto.localeCompare(b.dpto) || a.dist - b.dist);
const log = join(DIR, 'progreso.log'), t0 = Date.now();
let errores = 0;
for (const [i, d] of lista.entries()) {
  const base = join(DIR, `${d.dpto}_${d.dist}`);
  if (!rehacer && existsSync(`${base}_resumen.json`)) continue;
  if (!existsSync(join(RAIZ, 'data', 'parcelario', `${d.dpto}_${d.dist}.geojson`))) { appendFileSync(log, `${i + 1}/${lista.length} ${d.dpto}|${d.dist} sin parcelario\n`); continue; }
  const ini = Date.now();
  const r = spawnSync(process.execPath, ['--max-old-space-size=6144', join(RAIZ, 'scripts', 'osm-edificios.mjs'), '--dpto', d.dpto, '--dist', String(d.dist), '--fgb', join(RAIZ, 'data', 'osm', 'edificios_py.fgb')],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0 && existsSync(`${base}_resumen.json`);
  if (!ok) errores++;
  const linea = `${new Date().toISOString()} ${i + 1}/${lista.length} ${d.dpto}|${d.dist} ${d.nombre} ${ok ? 'ok' : 'ERROR ' + String(r.stderr || '').slice(-300).replace(/\s+/g, ' ')} ${Math.round((Date.now() - ini) / 1000)} s`;
  appendFileSync(log, linea + '\n'); console.log(linea);
}
const filas = lista.map(d => { const f = join(DIR, `${d.dpto}_${d.dist}_resumen.json`); return existsSync(f) ? { nombre: d.nombre, ...JSON.parse(readFileSync(f, 'utf8')) } : null; }).filter(Boolean);
const suma = k => filas.reduce((a, x) => a + (x[k] || 0), 0), sumaEstado = k => filas.reduce((a, x) => a + (x.porEstado?.[k] || 0), 0);
const total = { distritos: filas.length, errores, edificios: suma('edificios'), auto: suma('auto'), pendientes: suma('pendientes'), sinParcela: suma('sinParcela'),
  sinParcelaM2: suma('sinParcelaM2'), huellaM2: suma('huellaM2'), parcelas: { no_declarada: sumaEstado('no_declarada'), menor_declarada: sumaEstado('menor_declarada'),
    mayor_declarada: sumaEstado('mayor_declarada'), sin_huella: sumaEstado('sin_huella'), coincide: sumaEstado('coincide') }, minutos: Math.round((Date.now() - t0) / 60000) };
writeFileSync(join(DIR, 'resumen_pais.json'), JSON.stringify({ fecha: new Date().toISOString(), fuente: 'OpenStreetMap (Geofabrik, ODbL), SNC, DNIT 2026', total, distritos: filas }, null, 2));
const cols = ['dpto', 'dist', 'nombre', 'edificios', 'auto', 'pendientes', 'sinParcela', 'sinParcelaM2', 'huellaM2', 'parcelasComparadas'];
writeFileSync(join(DIR, 'resumen_pais.csv'), [...cols, 'no_declarada', 'menor_declarada', 'mayor_declarada', 'sin_huella', 'coincide'].join(',') + '\n' +
  filas.map(x => [...cols.map(c => JSON.stringify(x[c] ?? '')), ...['no_declarada', 'menor_declarada', 'mayor_declarada', 'sin_huella', 'coincide'].map(k => x.porEstado?.[k] || 0)].join(',')).join('\n') + '\n');
console.log('TOTAL', JSON.stringify(total));
