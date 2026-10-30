/**
 * Paquete de datos reproducibles para libros/manuales/artículos técnicos (Quarto).
 * Convención: docs/CONVENCION_DATOS_REPORTES.md — separa los datos
 * (CSV/GeoJSON/Mermaid/YAML) de la presentación: cada corrida escribe en
 * <salida>/_tablas, _figuras, _diagramas y metadatos_corrida.yaml.
 * Módulo de backend (Node). Sin dependencias externas de parseo/serialización.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function csvCampo(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** criterios: [{ id, nombre, tolerancia, valor_obtenido, estado }] */
export function tablaCriteriosCsv(criterios) {
  const encabezado = 'id_criterio,nombre,tolerancia,valor_obtenido,estado';
  const filas = criterios.map(c =>
    [c.id, c.nombre, c.tolerancia, c.valor_obtenido, c.estado].map(csvCampo).join(',')
  );
  return [encabezado, ...filas].join('\n') + '\n';
}

/** feature: geometría GeoJSON (Polygon/MultiPolygon); propiedades: pares clave/valor de la parcela */
export function parcelaGeoJson(feature, propiedades = {}) {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { ...propiedades },
      geometry: feature,
    }],
  }, null, 2) + '\n';
}

/** pasos: [{ id, etiqueta, destino?, condicion? }] — destino/condicion ausentes = nodo final */
export function flujoExpedienteMermaid(pasos) {
  const lineas = ['flowchart LR'];
  for (const p of pasos) {
    lineas.push(`  ${p.id}[${p.etiqueta}]`);
  }
  for (const p of pasos) {
    if (!p.destino) continue;
    const etiqueta = p.condicion ? `|${p.condicion}|` : '';
    lineas.push(`  ${p.id} -->${etiqueta} ${p.destino}`);
  }
  return lineas.join('\n') + '\n';
}

const COLOR_ESTADO = { APROBADO: '#16a34a', OBSERVADO: '#f59e0b', RECHAZADO: '#dc2626' };

/** Barras horizontales aprobado/observado/rechazado por criterio, sin librerías de gráficos */
export function figuraResumenCriteriosSvg(criterios) {
  const alto = 32;
  const margen = 8;
  const anchoEtiqueta = 220;
  const anchoBarra = 260;
  const svgAlto = criterios.length * alto + margen * 2;
  const svgAncho = anchoEtiqueta + anchoBarra + margen * 2;
  const filas = criterios.map((c, i) => {
    const y = margen + i * alto;
    const color = COLOR_ESTADO[c.estado] || '#6b7280';
    return [
      `<text x="${margen}" y="${y + alto / 2 + 4}" font-size="13" font-family="sans-serif">${c.id} — ${c.nombre}</text>`,
      `<rect x="${anchoEtiqueta}" y="${y + 6}" width="${anchoBarra}" height="${alto - 12}" fill="${color}" rx="3"/>`,
      `<text x="${anchoEtiqueta + 8}" y="${y + alto / 2 + 4}" font-size="12" fill="#ffffff" font-family="sans-serif">${c.estado}</text>`,
    ].join('\n    ');
  });
  return `<svg viewBox="0 0 ${svgAncho} ${svgAlto}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${svgAncho}" height="${svgAlto}" fill="#ffffff"/>
  <g>
    ${filas.join('\n    ')}
  </g>
</svg>
`;
}

function yamlValor(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `"${String(v).replace(/"/g, '\\"')}"`;
}

/** metadatos: objeto plano clave→valor (string/number/boolean), sin anidar */
export function metadatosCorridaYaml(metadatos) {
  return Object.entries(metadatos).map(([k, v]) => `${k}: ${yamlValor(v)}`).join('\n') + '\n';
}

/**
 * Escribe los 5 artefactos en directorioSalida y devuelve sus rutas.
 * entrada: { expedienteId, criterios, parcela: { feature, propiedades }, pasos, metadatos }
 */
export function generarPaqueteDatos({ criterios, parcela, pasos, metadatos }, directorioSalida) {
  const tablas = join(directorioSalida, '_tablas');
  const figuras = join(directorioSalida, '_figuras');
  const diagramas = join(directorioSalida, '_diagramas');
  mkdirSync(tablas, { recursive: true });
  mkdirSync(figuras, { recursive: true });
  mkdirSync(diagramas, { recursive: true });

  const rutas = {
    criterios: join(tablas, 'resultados_criterios.csv'),
    parcela: join(figuras, 'parcela_resultado.geojson'),
    resumen: join(figuras, 'resumen_criterios.svg'),
    flujo: join(diagramas, 'flujo_expediente.mmd'),
    metadatos: join(directorioSalida, 'metadatos_corrida.yaml'),
  };

  writeFileSync(rutas.criterios, tablaCriteriosCsv(criterios), 'utf8');
  writeFileSync(rutas.parcela, parcelaGeoJson(parcela.feature, parcela.propiedades), 'utf8');
  writeFileSync(rutas.resumen, figuraResumenCriteriosSvg(criterios), 'utf8');
  writeFileSync(rutas.flujo, flujoExpedienteMermaid(pasos), 'utf8');
  writeFileSync(rutas.metadatos, metadatosCorridaYaml(metadatos), 'utf8');

  return rutas;
}
