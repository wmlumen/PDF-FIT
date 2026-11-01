// Convierte las capas de Piribebuy (SHP) a GeoJSON para servirlas en el frontend.
// Uso: node scripts/convert-piribebuy.mjs
globalThis.self = globalThis;

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'C:\\Users\\HP 250 G10\\Documents\\PY-IA\\SIG\\PIRIBEBUY';
// Carpeta canónica numerada (ver AGENTS.md §3.1): data/2.Municipal/piribebuy/<grupo>/.
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', '2.Municipal', 'piribebuy');

const LAYERS = [
  { shp: 'barrios_piri', out: 'barrios', group: 'base' },
  { shp: 'Vias_generales Piri', out: 'vias', group: 'base' },
  // { shp: 'hidro piribebuy', out: 'hidro', group: 'base' }, -- Eliminado a pedido del usuario
  { shp: 'ZONA DE INFLUENCIA', out: 'zona_influencia', group: 'base' },
  { shp: 'VERTEDERO', out: 'vertedero', group: 'vertedero' },
  { shp: 'VERTEDERO INTEGRADO', out: 'vertedero_integrado', group: 'vertedero' },
  { shp: 'CENTRO', out: 'centro', group: 'vertedero' },
  { shp: 'área vertedero 500 mts', out: 'vertedero_500', group: 'vertedero' },
  { shp: 'área vertedero 1000 mts', out: 'vertedero_1000', group: 'vertedero' },
  { shp: 'VUELO_CASCO', out: 'vuelo_casco', group: 'casco' },
];

const mod = await import('shpjs');
const shp = mod.default || mod;

let total = 0;
for (const layer of LAYERS) {
  const shpPath = path.join(SRC, layer.shp + '.shp');
  const dbfPath = path.join(SRC, layer.shp + '.dbf');
  if (!fs.existsSync(shpPath) || !fs.existsSync(dbfPath)) {
    console.log('SKIP (sin .shp/.dbf):', layer.shp);
    continue;
  }
  try {
    const gj = await shp({ shp: fs.readFileSync(shpPath), dbf: fs.readFileSync(dbfPath) });
    const outDir = path.join(OUT, layer.group);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, layer.out + '.geojson');
    fs.writeFileSync(outFile, JSON.stringify(gj));
    const kb = fs.statSync(outFile).size / 1024;
    total += kb;
    console.log(`${layer.out.padEnd(18)} ${String(gj.features.length).padStart(4)} features  ${kb.toFixed(1)} KB`);
  } catch (e) {
    console.log('ERR', layer.shp, e.message);
  }
}
console.log('TOTAL:', total.toFixed(1), 'KB');
