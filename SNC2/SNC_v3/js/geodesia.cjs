// ==========================================================
// MÓDULO 1 — NÚCLEO GEODÉSICO Y DE PROYECCIONES (R1–R10)
// SNC 551/2023 — Integrador de datum, proyecciones UTM y utilidades de terreno.
// ==========================================================

// ---------- DATUMS ----------
const SIRGAS = { a: 6378137.0, f: 1 / 293.0 };
const GRS80 = { a: 6378137.0, f: 1 / 298.257222101 };

function toRadians(deg) { return deg * Math.PI / 180; }
function toDegrees(rad) { return rad * 180 / Math.PI; }
function normalizeAzimuth(deg) { return ((deg % 360) + 360) % 360; }

class Datum {
  constructor(name, semiMajor, flattening, centralMeridian = 0) {
    this.name = name;
    this.a = semiMajor;
    this.f = flattening;
    this.b = semiMajor * (1 - flattening);
    this.centralMeridian = centralMeridian;
  }
  get e2() { return (this.a * this.a - this.b * this.b) / (this.a * this.a); }
  get e() { return Math.sqrt(this.e2); }
  meridianRadius(phi) {
    const sinPhi = Math.sin(phi);
    return this.a * (1 - this.e * sinPhi) / Math.sqrt(1 - this.e2 * sinPhi * sinPhi);
  }
  primeVerticalRadius(phi) {
    const sinPhi = Math.sin(phi);
    return this.a / Math.sqrt(1 - this.e2 * sinPhi * sinPhi);
  }
}

const DATUMS = {
  SIRGAS2000: new Datum('SIRGAS 2000', SIRGAS.a, SIRGAS.f),
  GRS80: new Datum('GRS80', GRS80.a, GRS80.f),
  WGS84: new Datum('WGS84', SIRGAS.a, 1 / 298.257223563)
};

// ---------- PROYECCIÓN UTM ----------
class UTMProjection {
  /**
   * @param {number} zone Zona UTM (1–60).
   * @param {Datum} [datum] Datum a usar (por defecto WGS84).
   * @param {boolean} [south] Hemisferio sur (por defecto true: Paraguay).
   */
  constructor(zone, datum = DATUMS.WGS84, south = true) {
    this.zone = zone;
    this.datum = datum;
    this.south = south;
    this.scaleFactor = 0.9996;
    this.falseEasting = 500000;
    // El hemisferio NO se deduce del signo de la zona (siempre es 1–60):
    // en el sur el falso norte es 10.000.000 m.
    this.falseNorthing = south ? 10000000 : 0;
    this.centralMeridian = (zone * 6 - 183) * Math.PI / 180;
  }
  forward(latDeg, lonDeg) {
    const phi = toRadians(latDeg);
    const lambda = toRadians(lonDeg);
    const lambda0 = this.centralMeridian;
    const deltaLambda = lambda - lambda0;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);
    const e2 = this.datum.e2;
    const ep2 = e2 / (1 - e2); // e'² (segunda excentricidad al cuadrado)

    // Series de Snyder (USGS PP 1395), Transversa de Mercator.
    // N = radio de curvatura en el primer vertical; T = tan²φ; C = e'²·cos²φ;
    // A = Δλ·cosφ; M = longitud de arco de meridiano.
    const N = this.datum.a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const T = tanPhi * tanPhi;
    const C = ep2 * cosPhi * cosPhi;
    const A = deltaLambda * cosPhi;

    const M = this.datum.a * (
      (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * phi)
    );

    const easting = this.falseEasting + this.scaleFactor * N * (
      A +
      ((1 - T + C) * A * A * A) / 6 +
      ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120
    );

    const northing = this.falseNorthing + this.scaleFactor * (
      M + N * tanPhi * (
        (A * A) / 2 +
        ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
        ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) / 720
      )
    );

    return { easting, northing };
  }
  /**
   * Inversa de la proyección UTM (Transversa de Mercator).
   * Devuelve coordenadas geográficas en grados: { latDeg, lonDeg }.
   */
  inverse(easting, northing) {
    const a = this.datum.a;
    const e2 = this.datum.e2;
    const k0 = this.scaleFactor;
    const x = easting - this.falseEasting;
    const y = northing - this.falseNorthing;

    const M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

    const phi1 = mu +
      ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
      ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
      ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);

    const numerator = 1 - e2 * sinPhi1 * sinPhi1;
    const nu1 = a / Math.sqrt(numerator);
    const rho1 = (a * (1 - e2)) / Math.pow(numerator, 1.5);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = (e2 / (1 - e2)) * cosPhi1 * cosPhi1;
    const D = x / (nu1 * k0);

    const latRad = phi1 - ((nu1 * tanPhi1) / rho1) * (
      (D * D) / 2 -
      ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * Math.pow(D, 4)) / 24 +
      ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * Math.pow(D, 6)) / 720
    );

    const lonRad = this.centralMeridian + (
      D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * Math.pow(D, 5)) / 120
    ) / cosPhi1;

    return { latDeg: toDegrees(latRad), lonDeg: toDegrees(lonRad) };
  }
}

// ---------- FACTOR DE ESCALA (R6–R9) ----------
function calculateFactorK(phiDeg, elevation = 0) {
  const phi = toRadians(phiDeg);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const e2 = DATUMS.WGS84.e2;
  const numerator = 1 + e2 * sinPhi * sinPhi;
  const denominator = Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const kHorizontal = numerator / (cosPhi * denominator);
  const kHElevation = 1 - (elevation / DATUMS.WGS84.a) / cosPhi;
  const kCombined = kHorizontal * kHElevation;
  return { kHorizontal, kHElevation, kCombined, description: `k=${kHorizontal.toFixed(8)}, k_h=${kHElevation.toFixed(8)}, k_c=${kCombined.toFixed(8)}` };
}

function reduceToEllipsoid(northingTerrain, eastingTerrain, phiDeg, lambdaDeg, elevation = 0) {
  const phi = toRadians(phiDeg);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const e2 = DATUMS.WGS84.e2;
  const numerator = 1 + e2 * sinPhi * sinPhi;
  const denominator = Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const kHorizontal = numerator / (cosPhi * denominator);
  const kHElevation = 1 - (elevation / DATUMS.WGS84.a) / cosPhi;
  const kCombined = kHorizontal * kHElevation;
  const eastingEllipsoid = eastingTerrain / kCombined;
  const northingEllipsoid = northingTerrain / kCombined;
  return { easting: eastingEllipsoid, northing: northingEllipsoid, kUsed: kCombined };
}

// ---------- CONVERGENCIA DE MERIDIANOS (R10) ----------
function calculateConvergence(phiDeg, lambdaDeg, centralMeridianDeg = 0) {
  const phi = toRadians(phiDeg);
  const lambda = toRadians(lambdaDeg);
  const centralMeridian = toRadians(centralMeridianDeg);
  const deltaLambda = lambda - centralMeridian;
  const gamma = Math.atan(Math.sin(deltaLambda) / Math.cos(phi));
  return toDegrees(gamma);
}

// ---------- UTILIDADES DE ZONA Y CRUCE (R2, R5) ----------
function getUTMZoneFromLong(lonDeg) {
  return Math.floor((lonDeg + 180) / 6) + 1;
}
function isZoneTransition(latDeg, lonDeg, zoneMeridian) {
  // Distancia real al meridiano central recibido (ventana simétrica ±0.5°).
  // Antes se comparaba siempre contra 60 hardcodeado y con Math.abs(lonDeg),
  // lo que daba resultados incorrectos para otros meridianos y longitudes.
  const distToMeridian = Math.abs(lonDeg - zoneMeridian);
  const threshold = 0.5;
  return distToMeridian <= threshold;
}
function detectAndReprojectCrossing(geometry) {
  if (geometry.geometry.type !== 'Polygon') return geometry;
  const coords = geometry.geometry.coordinates[0];
  let minLon = Infinity, maxLon = -Infinity;
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  const zoneCentral = getUTMZoneFromLong(minLon);
  // Meridiano de FRONTERA entre zonas (múltiplo de 6°), que es donde ocurre la
  // transición real entre UTM 20S y 21S (ej. -60°). Antes se comparaba contra el
  // meridiano central de la zona, que nunca está en el límite.
  const lonMedio = (minLon + maxLon) / 2;
  const boundaryMeridian = Math.round((lonMedio + 180) / 6) * 6 - 180;
  const crossing = isZoneTransition(0, lonMedio, boundaryMeridian);
  if (!crossing) return geometry;
  // La zona destino es la del otro lado de la frontera.
  const zoneTarget = lonMedio < boundaryMeridian ? zoneCentral - 1 : zoneCentral + 1;
  const projTarget = new UTMProjection(zoneTarget, DATUMS.WGS84);
  const projSource = new UTMProjection(zoneCentral, DATUMS.WGS84);
  const newCoords = [];
  for (const [lon, lat] of coords) {
    // Reproyección real: geográficas -> UTM origen -> geográficas (vuelta por la
    // zona destino) para mantener coherencia al cruzar el meridiano de transición.
    const { easting, northing } = projSource.forward(lat, lon);
    const origen = projSource.inverse(easting, northing);
    const destino = projTarget.forward(origen.latDeg, origen.lonDeg);
    const vuelta = projTarget.inverse(destino.easting, destino.northing);
    newCoords.push([vuelta.lonDeg, vuelta.latDeg]);
  }
  return {
    type: geometry.type,
    geometry: { type: geometry.geometry.type, coordinates: [newCoords] },
    properties: { ...(geometry.properties || {}), ZONA_UTM_TARGET: zoneTarget, REPROYECTADO: true }
  };
}

// ---------- INTEGRACIÓN CON EL FRONTEND ----------
function installGeodesiaModule() {
  if (typeof window !== 'undefined') {
    window.Geodesia = {
      DATUMS,
      toRadians,
      toDegrees,
      normalizeAzimuth,
      calculateFactorK,
      reduceToEllipsoid,
      calculateConvergence,
      getUTMZoneFromLong,
      isZoneTransition,
      detectAndReprojectCrossing
    };
    console.log('Módulo 1 (Geodesia) integrado en window.Geodesia');
  }
}

// ---------- EXPORTACIÓN ----------
module.exports = {
  DATUMS,
  toRadians,
  toDegrees,
  normalizeAzimuth,
  Datum,
  UTMProjection,
  calculateFactorK,
  reduceToEllipsoid,
  calculateConvergence,
  getUTMZoneFromLong,
  isZoneTransition,
  detectAndReprojectCrossing,
  installGeodesiaModule
};

// ---------- EJEMPLO / TESTING ----------
if (require.main === module) {
  const utm21 = new UTMProjection(21, DATUMS.WGS84);
  const utm20 = new UTMProjection(20, DATUMS.WGS84);
  const testLat = -34.6, testLon = -58.4;
  const { easting: e1, northing: n1 } = utm21.forward(testLat, testLon);
  const { easting: e2, northing: n2 } = utm20.forward(testLat, testLon);
  console.log(`Punto en UTM 21S: E=${e1.toFixed(2)} N=${n1.toFixed(2)}`);
  console.log(`Punto en UTM 20S: E=${e2.toFixed(2)} N=${n2.toFixed(2)}`);
  const crossing = isZoneTransition(testLat, testLon, -60);
  console.log(`¿Cruce de zona de transición? ${crossing}`);
  const k = calculateFactorK(testLat, 100);
  console.log(`Factores de escala: ${k.description}`);
  const conv = calculateConvergence(testLat, testLon, -60);
  console.log(`Convergencia de meridianos γ ≈ ${conv.toFixed(6)}°`);
}