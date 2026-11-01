#!/usr/bin/env node
/**
 * SNC v3 — Cambio Climático & Decision Intelligence (Carril B, Tarea CC-05)
 * Cálculo del Índice de Riesgo de Inundación para los 246 distritos oficiales de Paraguay
 * Fuente cartográfica: data/distritos_py_light.geojson (CNPV 2022)
 *
 * Combina:
 *   - Cota media s.n.m. y proximidad a cota crítica de cuenca (Paraguay/Paraná/Tebicuary/Pilcomayo)
 *   - Densidad de cauces hidrográficos mayores (ríos, esteros y humedales)
 *   - Exposición catastral / poblacional estimada por distrito
 *
 * Salida:
 *   - data/clima/indice_riesgo_inundacion_distritos.json
 *   - Cambio_climatico/indice_riesgo_inundacion_distritos.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEOJSON_PATH = join(RAIZ, 'data', 'distritos_py_light.geojson');

if (!existsSync(GEOJSON_PATH)) {
  console.error(`No se encontró ${GEOJSON_PATH}`);
  process.exit(1);
}

const geojson = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8'));

// Perfil altimétrico y de cuenca base por departamento
const PERFIL_DEPTO = {
  'ÑEEMBUCÚ': { cotaBase: 50, cuenca: 'PARAGUAY_PARANA', hidroDens: 0.90, expCat: 0.70 },
  'PRESIDENTE HAYES': { cotaBase: 65, cuenca: 'PILCOMAYO_PARAGUAY', hidroDens: 0.82, expCat: 0.65 },
  'ALTO PARAGUAY': { cotaBase: 82, cuenca: 'PANTANAL_PARAGUAY', hidroDens: 0.88, expCat: 0.60 },
  'MISIONES': { cotaBase: 85, cuenca: 'RIO_PARANA_TEBICUARY', hidroDens: 0.75, expCat: 0.65 },
  'CENTRAL': { cotaBase: 85, cuenca: 'RIO_PARAGUAY_SALADO', hidroDens: 0.78, expCat: 0.92 },
  'CAPITAL': { cotaBase: 65, cuenca: 'RIO_PARAGUAY', hidroDens: 0.85, expCat: 0.95 },
  'ASUNCIÓN': { cotaBase: 65, cuenca: 'RIO_PARAGUAY', hidroDens: 0.85, expCat: 0.95 },
  'CONCEPCIÓN': { cotaBase: 80, cuenca: 'RIO_PARAGUAY_APA', hidroDens: 0.80, expCat: 0.65 },
  'SAN PEDRO': { cotaBase: 95, cuenca: 'RIO_PARAGUAY_JEJUI', hidroDens: 0.75, expCat: 0.65 },
  'CORDILLERA': { cotaBase: 160, cuenca: 'RIO_PIRIBEBUY_YPACARAI', hidroDens: 0.60, expCat: 0.65 },
  'PARAGUARÍ': { cotaBase: 130, cuenca: 'LAGO_YPOA_TEBICUARY', hidroDens: 0.62, expCat: 0.60 },
  'ITAPÚA': { cotaBase: 120, cuenca: 'RIO_PARANA', hidroDens: 0.70, expCat: 0.72 },
  'ALTO PARANÁ': { cotaBase: 185, cuenca: 'RIO_PARANA_ACARAY_MONDAY', hidroDens: 0.65, expCat: 0.80 },
  'GUAIRÁ': { cotaBase: 230, cuenca: 'TEBICUARY_MI', hidroDens: 0.48, expCat: 0.68 },
  'CAAGUAZÚ': { cotaBase: 260, cuenca: 'ACARAY_GUYRAUNGUA', hidroDens: 0.45, expCat: 0.70 },
  'CAAZAPÁ': { cotaBase: 165, cuenca: 'TEBICUARY_PIRAPO', hidroDens: 0.58, expCat: 0.58 },
  'AMAMBAY': { cotaBase: 380, cuenca: 'APA_AQUIDABAN', hidroDens: 0.40, expCat: 0.65 },
  'CANINDEYÚ': { cotaBase: 220, cuenca: 'JEJUI_PARANA', hidroDens: 0.55, expCat: 0.65 },
  'BOQUERÓN': { cotaBase: 160, cuenca: 'CHACO_SECO', hidroDens: 0.25, expCat: 0.45 }
};

// Calibraciones específicas de distritos críticos conocidos
const CALIBRACION_ESPECIFICA = {
  'PILAR': { cota: 47, cuenca: 'PARAGUAY_PARANA', hidroDens: 0.98, expCat: 0.88 },
  'ALBERDI': { cota: 50, cuenca: 'RIO_PARAGUAY', hidroDens: 0.95, expCat: 0.85 },
  'PASO DE PATRIA': { cota: 46, cuenca: 'PARANA_PARAGUAY', hidroDens: 0.98, expCat: 0.80 },
  'HUMAITÁ': { cota: 48, cuenca: 'RIO_PARAGUAY', hidroDens: 0.94, expCat: 0.75 },
  'VILLA OLIVA': { cota: 51, cuenca: 'RIO_PARAGUAY', hidroDens: 0.92, expCat: 0.70 },
  'VILLA FRANCA': { cota: 49, cuenca: 'RIO_PARAGUAY', hidroDens: 0.93, expCat: 0.68 },
  'NANAWA': { cota: 54, cuenca: 'PILCOMAYO_PARAGUAY', hidroDens: 0.96, expCat: 0.92 },
  'JOSÉ FALCÓN': { cota: 55, cuenca: 'PILCOMAYO_PARAGUAY', hidroDens: 0.94, expCat: 0.88 },
  'VILLA HAYES': { cota: 58, cuenca: 'RIO_PARAGUAY', hidroDens: 0.90, expCat: 0.85 },
  'AYOLAS': { cota: 68, cuenca: 'RIO_PARANA', hidroDens: 0.95, expCat: 0.85 },
  'VILLA FLORIDA': { cota: 75, cuenca: 'TEBICUARY', hidroDens: 0.92, expCat: 0.80 },
  'YABEBYRY': { cota: 62, cuenca: 'PARANA_ARROYOS', hidroDens: 0.88, expCat: 0.65 },
  'BAHÍA NEGRA': { cota: 85, cuenca: 'PANTANAL_PARAGUAY', hidroDens: 0.96, expCat: 0.72 },
  'FUERTE OLIMPO': { cota: 88, cuenca: 'RIO_PARAGUAY', hidroDens: 0.92, expCat: 0.70 },
  'CARMELO PERALTA': { cota: 82, cuenca: 'RIO_PARAGUAY', hidroDens: 0.91, expCat: 0.68 },
  'LIMPIO': { cota: 65, cuenca: 'RIO_PARAGUAY_SALADO', hidroDens: 0.88, expCat: 0.90 },
  'MARIANO ROQUE ALONSO': { cota: 68, cuenca: 'RIO_PARAGUAY', hidroDens: 0.85, expCat: 0.92 },
  'VILLETA': { cota: 60, cuenca: 'RIO_PARAGUAY', hidroDens: 0.88, expCat: 0.85 },
  'SAN ANTONIO': { cota: 68, cuenca: 'RIO_PARAGUAY', hidroDens: 0.82, expCat: 0.88 },
  'ASUNCIÓN': { cota: 62, cuenca: 'RIO_PARAGUAY', hidroDens: 0.88, expCat: 0.98 },
  'ANTEQUERA': { cota: 65, cuenca: 'RIO_PARAGUAY', hidroDens: 0.90, expCat: 0.70 },
  'PIRIBEBUY': { cota: 216, cuenca: 'ARROYO_PIRIBEBUY', hidroDens: 0.65, expCat: 0.62 },
  'CAACUPÉ': { cota: 260, cuenca: 'SERRANIAS', hidroDens: 0.40, expCat: 0.72 },
  'SAN BERNARDINO': { cota: 85, cuenca: 'LAGO_YPACARAI', hidroDens: 0.80, expCat: 0.80 },
  'EMBOSCADA': { cota: 80, cuenca: 'RIO_PIRIBEBUY', hidroDens: 0.82, expCat: 0.68 },
  'ARROYOS Y ESTEROS': { cota: 75, cuenca: 'MANDUVIRA', hidroDens: 0.86, expCat: 0.68 },
  'ENCARNACIÓN': { cota: 85, cuenca: 'RIO_PARANA', hidroDens: 0.88, expCat: 0.90 },
  'CIUDAD DEL ESTE': { cota: 180, cuenca: 'RIO_PARANA_ACARAY', hidroDens: 0.75, expCat: 0.92 }
};

function normalizarTexto(txt) {
  return (txt || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function calcularRiesgo(depto, dist, codDpto, codDist) {
  const normDist = normalizarTexto(dist);
  const normDepto = normalizarTexto(depto);

  const perfil = PERFIL_DEPTO[normDepto] || { cotaBase: 120, cuenca: 'CUENCA_GENERAL', hidroDens: 0.6, expCat: 0.6 };
  const esp = CALIBRACION_ESPECIFICA[normDist];

  const cota = esp ? esp.cota : perfil.cotaBase;
  const cuenca = esp ? esp.cuenca : perfil.cuenca;
  const hidroDens = esp ? esp.hidroDens : perfil.hidroDens;
  const expCat = esp ? esp.expCat : perfil.expCat;

  // Curva de factor por cota (menor a 50m: cota crítica fluvial)
  let factorCota;
  if (cota <= 50) factorCota = 100;
  else if (cota <= 60) factorCota = 92 - (cota - 50) * 1.5;
  else if (cota <= 80) factorCota = 77 - (cota - 60) * 1.2;
  else if (cota <= 120) factorCota = 53 - (cota - 80) * 0.5;
  else if (cota <= 200) factorCota = 33 - (cota - 120) * 0.15;
  else factorCota = Math.max(5, 21 - (cota - 200) * 0.05);

  const iri = Math.round(
    (factorCota * 0.50) +
    ((hidroDens * 100) * 0.30) +
    ((expCat * 100) * 0.20)
  );

  let nivel = 'BAJO';
  if (iri >= 80) nivel = 'EXTREMO';
  else if (iri >= 65) nivel = 'ALTO';
  else if (iri >= 40) nivel = 'MEDIO';

  return {
    codigo_dpto: codDpto,
    codigo_distrito: codDist,
    depto: normDepto,
    distrito: dist,
    cota_media_m: cota,
    cuenca,
    densidad_hidrografica: hidroDens,
    exposicion_catastral: expCat,
    factor_cota: Math.round(factorCota),
    indice_riesgo_inundacion: iri,
    nivel_riesgo: nivel
  };
}

// Procesar todos los distritos del GeoJSON oficial
const resultados = geojson.features.map(f => {
  const p = f.properties;
  return calcularRiesgo(p.DPTO_DESC, p.DIST_DESC, p.DPTO, p.DISTRITO);
});

// Ordenar por IRI descendente para ranking
resultados.sort((a, b) => b.indice_riesgo_inundacion - a.indice_riesgo_inundacion);
resultados.forEach((d, idx) => { d.ranking = idx + 1; });

const payload = {
  sistema: 'SNC v3 — Catastro Nacional (Ley 551/2023)',
  modulo: 'MHC-PY Cambio Climático & Decision Intelligence (CC-05)',
  metodologia: 'IRI = 0.50*(Factor Cota) + 0.30*(Dens. Hidro) + 0.20*(Exp. Catastral)',
  total_distritos: resultados.length,
  timestamp: new Date().toISOString(),
  distritos: resultados
};

// Guardar en ambas ubicaciones canónicas
const dirClima = join(RAIZ, 'data', 'clima');
if (!existsSync(dirClima)) mkdirSync(dirClima, { recursive: true });
const rutaData = join(dirClima, 'indice_riesgo_inundacion_distritos.json');
writeFileSync(rutaData, JSON.stringify(payload, null, 2), 'utf8');

const rutaCC = join(RAIZ, 'Cambio_climatico', 'indice_riesgo_inundacion_distritos.json');
writeFileSync(rutaCC, JSON.stringify(payload, null, 2), 'utf8');

console.log(`[OK] Generado índice de riesgo para ${resultados.length} distritos oficiales.`);
console.log('Top 5 mayor riesgo de inundación:');
resultados.slice(0, 5).forEach(r => {
  console.log(`  #${r.ranking} ${r.distrito} (${r.depto}): IRI=${r.indice_riesgo_inundacion} (${r.nivel_riesgo}), cota ${r.cota_media_m}m`);
});
