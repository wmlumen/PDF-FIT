/**
 * Tinta hipsométrica: colorea un mosaico de elevación Terrarium (AWS) ajustada al relieve de Paraguay
 * (≈ 50 a 850 m s. n. m.). Dos modos: degradado (interpolado, el de siempre) o bandas (escalón, sin interpolar,
 * para distinguir mejor las diferencias de cota) — y 3 paletas. Entrada y salida: PNG de 256 × 256. Sin E/S.
 */
import { PNG } from 'pngjs';

// [altura en metros, color] — mismos escalones de cota para las 3 paletas, solo cambia el color.
const CORTES = [0, 75, 125, 175, 250, 350, 450, 550, 700, 850, 1200];
export const PALETAS = {
  // Convencional: verde en lo bajo → amarillo → ocre → marrón → blanco en las cumbres.
  clasico: [[79, 140, 90], [110, 168, 106], [156, 196, 121], [200, 217, 140], [233, 228, 160], [232, 207, 134], [217, 173, 107], [196, 140, 85], [168, 109, 68], [138, 90, 60], [240, 236, 230]],
  // Espectral / térmico: azul (bajo) → verde → amarillo → rojo (alto), más contraste entre cotas cercanas.
  espectral: [[59, 76, 192], [68, 128, 200], [86, 176, 161], [138, 201, 112], [205, 220, 94], [247, 206, 75], [242, 158, 58], [222, 108, 52], [192, 68, 58], [150, 40, 70], [90, 24, 60]],
  // Gris topográfico clásico (claro = bajo, oscuro = alto): para imprimir o cuando el color distrae.
  gris: [[237, 237, 233], [220, 220, 214], [201, 201, 193], [182, 182, 172], [163, 163, 151], [144, 144, 131], [125, 125, 111], [106, 106, 92], [87, 87, 73], [68, 68, 56], [40, 40, 34]]
};
export const ESCALA = CORTES.map((h, i) => [h, PALETAS.clasico[i]]);   // compatibilidad hacia atrás

/**
 * @param {number} h - altura en metros
 * @param {string} paleta - 'clasico' | 'espectral' | 'gris'
 * @param {boolean} bandas - true: color plano por escalón (sin interpolar); false: degradado (interpolado)
 */
export function colorAltura(h, paleta = 'clasico', bandas = false) {
  const colores = PALETAS[paleta] || PALETAS.clasico;
  if (!(h > CORTES[0])) return colores[0];
  for (let i = 1; i < CORTES.length; i++) {
    if (h <= CORTES[i]) {
      if (bandas) return colores[i - 1];   // color plano del escalón inferior: sin interpolar
      const t = (h - CORTES[i - 1]) / (CORTES[i] - CORTES[i - 1]);
      return colores[i - 1].map((v, k) => Math.round(v + (colores[i][k] - v) * t));
    }
  }
  return colores[colores.length - 1];
}
/** Terrarium: altura = (R × 256 + G + B / 256) − 32768. Devuelve el PNG coloreado (opaco). */
export function colorearTerrarium(bufPng, { paleta = 'clasico', bandas = false } = {}) {
  const src = PNG.sync.read(bufPng), out = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.data.length; i += 4) {
    const h = src.data[i] * 256 + src.data[i + 1] + src.data[i + 2] / 256 - 32768;
    const [r, g, b] = colorAltura(h, paleta, bandas);
    out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255;
  }
  return PNG.sync.write(out);
}
