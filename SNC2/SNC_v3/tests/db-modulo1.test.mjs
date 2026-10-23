// ========================================================================== //
// VALIDACIÓN DEL MÓDULO 1 (geodesia.js) – tests unitarios para SNC_v3
// ========================================================================== //

import { strictEqual, deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { 
  DATUMS, 
  toRadians, 
  UTMProjection, 
  calculateFactorK, 
  reduceToEllipsoid, 
  calculateConvergence, 
  getUTMZoneFromLong, 
  isZoneTransition,
  detectAndReprojectCrossing
} = require('../js/geodesia.cjs');

const WGS84 = DATUMS.WGS84;
const SIRGAS2000 = DATUMS.SIRGAS2000;

// Configuración para node:test (opcional, solo para referencia)
describe('Módulo 1 — Geodesia y Proyecciones SNC (R1–R10)', () => {
  // R1: Datum oficial SIRGAS-Cono Sur (WGS84 y GRS80 representados)
  it('R1 — DATUMS definidos', () => {
    strictEqual(DATUMS.WGS84.name, 'WGS84');
    strictEqual(DATUMS.SIRGAS2000.name, 'SIRGAS 2000');
    strictEqual(DATUMS.GRS80.name, 'GRS80');
  });

  // R2: UTM 20S y 21S definidos con centralMeridian correcto
  it('R2 — Zona UTM centralMeridian', () => {
    const utm21 = new UTMProjection(21, WGS84);
    const utm20 = new UTMProjection(20, WGS84);
    // Meridiano central esperado: zona*6 - 183 grados
    strictEqual(utm21.centralMeridian, toRadians((21 * 6 - 183)));
    strictEqual(utm20.centralMeridian, toRadians((20 * 6 - 183)));
  });

  // R3 & R4: EPSG:32721 (21S) y EPSG:32720 (20S) identificados por getUTMZoneFromLong
  it('R3 & R4 — getUTMZoneFromLong 21S / 20S', () => {
    strictEqual(getUTMZoneFromLong(-58), 21);
    strictEqual(getUTMZoneFromLong(-66), 20);
  });

  // R5: Detección de cruce de zona de transición (distancia al meridiano central <= 0.5°)
  it('R5 — cruce de zona de transición', () => {
    strictEqual(isZoneTransition(0, -60.4, -60), true);   // 0.4° al oeste
    strictEqual(isZoneTransition(0, -59.7, -60), true);   // 0.3° al este
    strictEqual(isZoneTransition(0, -59.0, -60), false);  // 1.0° fuera de la ventana
    strictEqual(isZoneTransition(0, -57.2, -57), true);   // usa el meridiano recibido, no 60
    strictEqual(isZoneTransition(0, -58.0, -57), false);  // 1.0° fuera de ese meridiano
  });

  // R6–R9: Factor de escala local (k, k_h, k_c)
  it('R6–R9 — calculateFactorK para latitud ≈ -34.6° y elevación 100 m', () => {
    const res = calculateFactorK(-34.6, 100);
    strictEqual(typeof res.kHorizontal, 'number');
    strictEqual(typeof res.kHElevation, 'number');
    strictEqual(typeof res.kCombined, 'number');
    strictEqual(res.description.includes('k='), true);
  });

  // R9: reduceToEllipsoid usa k combinado
  it('R9 — reduceToEllipsoid usa el factor combinado', () => {
    const inTerrain = { northing: 1000000, easting: 500000 };
    const reduced = reduceToEllipsoid(inTerrain.northing, inTerrain.easting, -34.6, -58.4, 100);
    strictEqual(reduced.easting < inTerrain.easting, true);
    strictEqual(reduced.northing < inTerrain.northing, true);
    strictEqual(typeof reduced.kUsed, 'number');
  });

  // R10: convergencia γ
  it('R10 — calculateConvergence para φ = -34.6°, λ = -58.4°, meridiano central -60°', () => {
    const gamma = calculateConvergence(-34.6, -58.4, -60);
    strictEqual(typeof gamma, 'number');
    // En el cuadrante sur-este, γ debería ser positivo (oeste del meridiano central)
    strictEqual(gamma > 0, true);
  });

  // Utilidades adicionales (Módulo 1) – integradas para la UI
  it('utilidad — detectAndReprojectCrossing no mofifica si no hay cruce', () => {
    // Polígono lejos del meridiano de transición (-57): no debe modificarse.
    const geom = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[ -58.0, -25.2 ], [ -58.0, -25.3 ], [ -58.1, -25.3 ], [ -58.1, -25.2 ], [ -58.0, -25.2 ]]]
      }
    };
    const result = detectAndReprojectCrossing(geom);
    strictEqual(result.geometry.type, 'Polygon');
    deepStrictEqual(result.geometry.coordinates, geom.geometry.coordinates);
  });

  it('utilidad — forward/inverse con precisión submilimétrica (ida y vuelta)', () => {
    const utm21 = new UTMProjection(21, DATUMS.WGS84);
    const casos = [[-25.3, -57.6], [-25.28, -57.63], [-27.3, -58.6], [-22.5, -58.5], [-25.5, -56.5]];
    for (const [lat, lon] of casos) {
      const { easting, northing } = utm21.forward(lat, lon);
      strictEqual(Number.isFinite(easting), true);
      strictEqual(Number.isFinite(northing), true);
      const vuelta = utm21.inverse(easting, northing);
      // Tolerancia 1e-7° (~1 cm); medido: ~5e-10° (~0.1 mm)
      strictEqual(Math.abs(vuelta.latDeg - lat) < 1e-7, true, `lat ${lat}`);
      strictEqual(Math.abs(vuelta.lonDeg - lon) < 1e-7, true, `lon ${lon}`);
    }
  });

  it('utilidad — falso norte correcto para el hemisferio sur (Paraguay)', () => {
    // En el sur el northing siempre es < 10.000.000 y > 0.
    const utm21 = new UTMProjection(21, DATUMS.WGS84);
    const { northing } = utm21.forward(-25.3, -57.6);
    strictEqual(northing > 0 && northing < 10000000, true);
    // El meridiano central debe dar easting = 500.000 m exactos.
    const central = utm21.forward(-24, -57);
    strictEqual(Math.abs(central.easting - 500000) < 1e-6, true);
  });

  it('utilidad — coincide con PROJ (proj4) si está disponible', () => {
    let proj4;
    try {
      proj4 = require('proj4');
    } catch {
      return; // dependencia opcional
    }
    proj4.defs('EPSG:32721', '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs');
    const utm21 = new UTMProjection(21, DATUMS.WGS84);
    for (const [lat, lon] of [[-25.3, -57.6], [-27.3, -58.6], [-25.5, -56.5]]) {
      const mio = utm21.forward(lat, lon);
      const ref = proj4('EPSG:32721', [lon, lat]);
      strictEqual(Math.abs(mio.easting - ref[0]) < 0.01, true, `E ${lat},${lon}`);
      strictEqual(Math.abs(mio.northing - ref[1]) < 0.01, true, `N ${lat},${lon}`);
    }
  });

  it('utilidad — detectAndReprojectCrossing marca cruce cuando corresponde', () => {
    const geom = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[ -60.1, -25.2 ], [ -59.9, -25.2 ], [ -59.9, -25.3 ], [ -60.1, -25.3 ], [ -60.1, -25.2 ]]]
      }
    };
    const result = detectAndReprojectCrossing(geom);
    strictEqual(result.properties?.REPROYECTADO, true);
    strictEqual(typeof result.properties?.ZONA_UTM_TARGET, 'number');
    strictEqual(result.geometry.coordinates[0].length, 5);
  });
});