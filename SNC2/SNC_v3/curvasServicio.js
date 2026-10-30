/**
 * Curvas de nivel y modelo de elevación a partir de los mosaicos Terrarium (AWS, datos SRTM ~30 m).
 * - curvasGeojson(): curvas en WGS84 para el visor 3D (una celda de ~2 km por pedido, con copia en disco).
 * - exportar(): curvas en DXF / SHP (zip) / GeoJSON o el modelo de elevación en GeoTIFF, en UTM 21S (EPSG:32721),
 *   de la vista o de un distrito (recortado a su límite).
 * Usa GDAL del QGIS instalado (gdalwarp, gdal_contour, ogr2ogr, gdal_translate). Precisión: anteproyecto, no relevamiento.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';

const run = promisify(execFile);
const RAIZ = dirname(fileURLToPath(import.meta.url));
const QGIS = process.env.QGIS_DIR || 'C:\\Program Files\\QGIS 3.44.15';
const BIN = n => join(QGIS, 'bin', `${n}.exe`);
const ENV = { ...process.env, PROJ_LIB: process.env.PROJ_LIB || join(QGIS, 'share', 'proj'), GDAL_DATA: process.env.GDAL_DATA || join(QGIS, 'apps', 'gdal', 'share', 'gdal') };
const R = 6378137, ORIGEN = Math.PI * R;
class ErrorCurvas extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

const lon2x = (lon, z) => (lon + 180) / 360 * 2 ** z;
const lat2y = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;

async function teselaDem(z, x, y) {
  const f = join(RAIZ, 'data', 'teselas', 'terreno', String(z), String(x), String(y));
  if (existsSync(f)) return readFileSync(f);
  const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`, { headers: { 'User-Agent': 'CatastroPYPro/3 (SNC v3; curvas de nivel)' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new ErrorCurvas(`Sin elevación para ${z}/${x}/${y}`, 502);
  const b = Buffer.from(await r.arrayBuffer());
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, b);
  return b;
}

/** Mosaico de elevación del recuadro (WGS84) como grilla ESRI ASCII en Web Mercator (EPSG:3857). */
async function grillaAsc(b, z, ruta) {
  const tx0 = Math.floor(lon2x(b.minX, z)), tx1 = Math.floor(lon2x(b.maxX, z)), ty0 = Math.floor(lat2y(b.maxY, z)), ty1 = Math.floor(lat2y(b.minY, z));
  const nTiles = (tx1 - tx0 + 1) * (ty1 - ty0 + 1);
  if (nTiles > 400) throw new ErrorCurvas('Zona demasiado grande para este detalle', 413);
  const W = (tx1 - tx0 + 1) * 256, H = (ty1 - ty0 + 1) * 256, h = new Float32Array(W * H);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const png = PNG.sync.read(await teselaDem(z, tx, ty)), ox = (tx - tx0) * 256, oy = (ty - ty0) * 256;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const k = (j * 256 + i) * 4;
      h[(oy + j) * W + ox + i] = png.data[k] * 256 + png.data[k + 1] + png.data[k + 2] / 256 - 32768;
    }
  }
  const res = 2 * ORIGEN / (256 * 2 ** z), xll = tx0 * 256 * res - ORIGEN, yll = ORIGEN - (ty1 + 1) * 256 * res;
  let txt = `ncols ${W}\nnrows ${H}\nxllcorner ${xll}\nyllcorner ${yll}\ncellsize ${res}\nNODATA_value -9999\n`;
  const filas = [];
  for (let j = 0; j < H; j++) { const f = new Array(W); for (let i = 0; i < W; i++) f[i] = h[j * W + i].toFixed(1); filas.push(f.join(' ')); }
  writeFileSync(ruta, txt + filas.join('\n'));
}

export function validar(q, maxGrados) {
  const b = { minX: Number(q.minX), minY: Number(q.minY), maxX: Number(q.maxX), maxY: Number(q.maxY) };
  if (!Object.values(b).every(Number.isFinite) || b.minX >= b.maxX || b.minY >= b.maxY) throw new ErrorCurvas('Recuadro inválido');
  if (b.minX < -63 || b.maxX > -54 || b.minY < -28 || b.maxY > -19) throw new ErrorCurvas('Fuera de Paraguay');
  if (b.maxX - b.minX > maxGrados || b.maxY - b.minY > maxGrados) throw new ErrorCurvas('Zona demasiado grande: acerque el mapa o elija un distrito más chico', 413);
  return b;
}
const zoomPara = b => { const lado = Math.max(b.maxX - b.minX, b.maxY - b.minY); return lado <= 0.05 ? 14 : lado <= 0.2 ? 13 : lado <= 0.5 ? 12 : 11; };

async function preparar(b, carpeta, z) {
  const asc = join(carpeta, 'dem.asc'), utm = join(carpeta, 'dem_utm.tif');
  await grillaAsc(b, z, asc);
  await run(BIN('gdalwarp'), ['-q', '-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:32721', '-r', 'bilinear', '-te_srs', 'EPSG:4326', '-te', b.minX, b.minY, b.maxX, b.maxY, '-of', 'GTiff', asc, utm].map(String), { env: ENV, windowsHide: true });
  return utm;
}

const celdaKey = (b, iv) => `${b.minX.toFixed(3)}_${b.minY.toFixed(3)}_${iv}`;
/** Curvas de una celda (~2 km) en WGS84 para el visor; se guardan en data/curvas/. */
export async function curvasGeojson(q) {
  const b = validar(q, 0.05), iv = [5, 10, 25, 50].includes(Number(q.intervalo)) ? Number(q.intervalo) : 10;
  const cache = join(RAIZ, 'data', 'curvas', `${celdaKey(b, iv)}.geojson`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  const carpeta = join(tmpdir(), `curvas_${process.pid}_${Date.now()}`); mkdirSync(carpeta, { recursive: true });
  try {
    const utm = await preparar(b, carpeta, 14);
    const shp = join(carpeta, 'curvas.gpkg'), salida = join(carpeta, 'curvas.geojson');
    await run(BIN('gdal_contour'), ['-q', '-a', 'cota', '-i', String(iv), '-f', 'GPKG', utm, shp], { env: ENV, windowsHide: true });
    await run(BIN('ogr2ogr'), ['-f', 'GeoJSON', '-t_srs', 'EPSG:4326', '-lco', 'COORDINATE_PRECISION=6', '-simplify', '2', salida, shp], { env: ENV, windowsHide: true });
    const fc = JSON.parse(readFileSync(salida, 'utf8'));
    fc.features.forEach(f => { f.properties = { cota: Math.round(f.properties.cota), maestra: Math.round(f.properties.cota) % (iv * 5) === 0 }; });
    mkdirSync(dirname(cache), { recursive: true }); writeFileSync(cache, JSON.stringify(fc));
    return fc;
  } finally { rmSync(carpeta, { recursive: true, force: true }); }
}

/** Exportación: { archivo, nombre, tipo } en UTM 21S. formato: dxf | shp | geojson | tif. limite: GeoJSON WGS84 opcional (distrito). */
export async function exportar(q, limite = null) {
  const b = validar(q, 0.6), formato = String(q.formato || 'dxf').toLowerCase();
  if (!['dxf', 'shp', 'geojson', 'tif'].includes(formato)) throw new ErrorCurvas('Formato: dxf, shp, geojson o tif');
  const iv = [1, 2, 5, 10, 25, 50].includes(Number(q.intervalo)) ? Number(q.intervalo) : 10;
  const carpeta = join(tmpdir(), `export_${process.pid}_${Date.now()}`); mkdirSync(carpeta, { recursive: true });
  const nombre = `${q.nombre ? String(q.nombre).replace(/[^\w-]+/g, '_').slice(0, 40) : 'zona'}_curvas_${iv}m_UTM21S`;
  const utm = await preparar(b, carpeta, zoomPara(b));
  let recorte = [];
  if (limite) writeFileSync(join(carpeta, 'limite.geojson'), JSON.stringify(limite));
  if (formato === 'tif') {
    const tif = join(carpeta, `${nombre.replace('_curvas_' + iv + 'm', '_elevacion')}.tif`);
    await run(BIN('gdal_translate'), ['-q', '-of', 'GTiff', '-co', 'COMPRESS=DEFLATE', utm, tif], { env: ENV, windowsHide: true });
    return { archivo: tif, nombre: tif.split(/[\\/]/).pop(), tipo: 'image/tiff', carpeta };
  }
  const gpkg = join(carpeta, 'curvas.gpkg');
  await run(BIN('gdal_contour'), ['-q', '-3d', '-a', 'cota', '-i', String(iv), '-f', 'GPKG', utm, gpkg], { env: ENV, windowsHide: true });
  if (limite) { const fl = join(carpeta, 'limite.geojson'), fu = join(carpeta, 'limite_utm.geojson'); await run(BIN('ogr2ogr'), ['-f', 'GeoJSON', '-t_srs', 'EPSG:32721', fu, fl], { env: ENV, windowsHide: true }); recorte = ['-clipsrc', fu]; }
  if (formato === 'dxf') {
    const dxf = join(carpeta, `${nombre}.dxf`);
    // DXF: solo admite el campo Layer; la cota viaja como Z de cada vértice (curvas 3D). Maestras en su propia capa.
    await run(BIN('ogr2ogr'), ['-f', 'DXF', ...recorte, '-dialect', 'SQLite', '-sql',
      `SELECT geom, CASE WHEN CAST(cota AS INTEGER) % ${iv * 5} = 0 THEN 'CURVAS_MAESTRAS' ELSE 'CURVAS_NIVEL' END AS Layer FROM contour`, dxf, gpkg], { env: ENV, windowsHide: true });
    return { archivo: dxf, nombre: `${nombre}.dxf`, tipo: 'application/dxf', carpeta };
  }
  if (formato === 'geojson') {
    const gj = join(carpeta, `${nombre}.geojson`);
    await run(BIN('ogr2ogr'), ['-f', 'GeoJSON', ...recorte, '-lco', 'RFC7946=NO', gj, gpkg], { env: ENV, windowsHide: true });
    return { archivo: gj, nombre: `${nombre}.geojson`, tipo: 'application/geo+json', carpeta };
  }
  const dirShp = join(carpeta, 'shp'); mkdirSync(dirShp);
  await run(BIN('ogr2ogr'), ['-f', 'ESRI Shapefile', ...recorte, join(dirShp, `${nombre}.shp`), gpkg], { env: ENV, windowsHide: true });
  const zip = join(carpeta, `${nombre}.zip`);
  await run('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${dirShp}\\*' -DestinationPath '${zip}' -Force`], { windowsHide: true });
  return { archivo: zip, nombre: `${nombre}.zip`, tipo: 'application/zip', carpeta };
}
export const limpiar = c => { try { rmSync(c, { recursive: true, force: true }); } catch { /* temporal */ } };
export { ErrorCurvas };
