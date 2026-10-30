/**
 * Tinta hipsométrica: colorea un mosaico de elevación Terrarium (AWS) con la escala convencional de la cartografía
 * topográfica (verde en lo bajo → amarillo → ocre → marrón → blanco en las cumbres), ajustada al relieve de Paraguay
 * (≈ 50 a 850 m s. n. m.). Entrada y salida: PNG de 256 × 256. Sin E/S.
 */
import { PNG } from 'pngjs';

// [altura en metros, color] — se interpola en línea recta entre escalones.
export const ESCALA = [
  [0, [79, 140, 90]], [75, [110, 168, 106]], [125, [156, 196, 121]], [175, [200, 217, 140]], [250, [233, 228, 160]],
  [350, [232, 207, 134]], [450, [217, 173, 107]], [550, [196, 140, 85]], [700, [168, 109, 68]], [850, [138, 90, 60]], [1200, [240, 236, 230]]
];
export function colorAltura(h) {
  if (!(h > ESCALA[0][0])) return ESCALA[0][1];
  for (let i = 1; i < ESCALA.length; i++) {
    const [h1, c1] = ESCALA[i], [h0, c0] = ESCALA[i - 1];
    if (h <= h1) { const t = (h - h0) / (h1 - h0); return c0.map((v, k) => Math.round(v + (c1[k] - v) * t)); }
  }
  return ESCALA[ESCALA.length - 1][1];
}
/** Terrarium: altura = (R × 256 + G + B / 256) − 32768. Devuelve el PNG coloreado (opaco). */
export function colorearTerrarium(bufPng) {
  const src = PNG.sync.read(bufPng), out = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.data.length; i += 4) {
    const h = src.data[i] * 256 + src.data[i + 1] + src.data[i + 2] / 256 - 32768;
    const [r, g, b] = colorAltura(h);
    out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255;
  }
  return PNG.sync.write(out);
}
