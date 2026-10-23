// Módulo 4: Reducción a elipsoide y tolerancia urbano/rural (R9–R18)
// Implementa la reducción de coordenadas de superficie a elipsoide y la lógica de tolerancia urbano/rural.

// Función para reducir coordenadas terrestres a elipsoide usando factor de escala (ya implementado en js/geodesia.js)
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

// Función para determinar la tolerancia según el tipo de área (urbano vs. rural)
function getUrbanRuralTolerance(coordinates, areaType = 'auto') {
  if (areaType === 'auto') {
    // Lógica de detección simple: si las coordenadas tienen alta densidad => urbano
    const density = coordinates.length / getBoundingBoxArea(coordinates);
    areaType = density > 0.5 ? 'urban' : 'rural';
  }
  const toleranceMap = {
    'urban': 0.5,    // metros
    'rural': 2.0,   // metros
    'auto': 1.0
  };
  return toleranceMap[areaType] || toleranceMap.auto;
}

// Función para validar el ratio de cierre usando la tolerancia
function validateClosureRatio(coordinates, toleranceMeters = 2.0) {
  if (coordinates.length < 2) return { valid: false, error: 'Se necesitan al menos 2 puntos para validar el cierre' };
  const closed = isPointEqual(coordinates[0], coordinates[coordinates.length - 1]);
  if (!closed) {
    return { valid: false, error: 'Las coordenadas del polígono no están cerradas', distance: calculateClosingDistance(coordinates) };
  }
  const maxDeviation = calculateMaxDeviationFromLine(coordinates);
  const valid = maxDeviation <= toleranceMeters;
  return { valid, maxDeviation, tolerance: toleranceMeters, error: valid ? null : `Desviación máxima ${maxDeviation.toFixed(2)}m excede tolerancia ${toleranceMeters}m` };
}

// Utilidades auxiliares
function toRadians(deg) { return deg * Math.PI / 180; }
function isPointEqual(p1, p2, epsilon = 1e-6) { return Math.abs(p1[0] - p2[0]) < epsilon && Math.abs(p1[1] - p2[1]) < epsilon; }
function getBoundingBoxArea(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return (maxX - minX) * (maxY - minY);
}
function calculateClosingDistance(coords) {
  const start = coords[0];
  const end = coords[coords.length - 1];
  return Math.sqrt(Math.pow(start[0] - end[0], 2) + Math.pow(start[1] - end[1], 2));
}
function calculateMaxDeviationFromLine(coords) {
  if (coords.length < 3) return 0;
  const start = coords[0];
  const end = coords[coords.length - 1];
  const lineVector = [end[0] - start[0], end[1] - start[1]];
  const lineLength = Math.sqrt(lineVector[0] ** 2 + lineVector[1] ** 2);
  let maxDeviation = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const point = coords[i];
    const pointVector = [point[0] - start[0], point[1] - start[1]];
    const crossProduct = Math.abs(lineVector[0] * pointVector[1] - lineVector[1] * pointVector[0]);
    const deviation = crossProduct / lineLength;
    if (deviation > maxDeviation) maxDeviation = deviation;
  }
  return maxDeviation;
}

// Exportar funciones
export {
  reduceToEllipsoid,
  getUrbanRuralTolerance,
  validateClosureRatio
};
