import assert from 'node:assert/strict';
import { calcularIndicesSncDi, obtenerTiempoActual, obtenerFocosIncendios, obtenerLluviaHistorica } from './climaServicio.js';

console.log('--- Iniciando tests de climaServicio (SNC-CC CC-01, CC-02, CC-04) ---');

// Test 1: Cálculo de índices SNC-DI con valores nominales
{
  const res = calcularIndicesSncDi(30, 34, 10, 15, 0.5);
  assert.ok(typeof res.ICT === 'number', 'ICT debe ser un número');
  assert.ok(res.ICT >= 0 && res.ICT <= 100, 'ICT debe estar entre 0 y 100');
  assert.ok(['Bajo', 'Medio', 'Alto', 'Crítico'].includes(res.ICT_nivel), 'Nivel ICT válido');

  assert.ok(typeof res.IRT === 'number', 'IRT debe ser un número');
  assert.ok(res.IRT >= 0 && res.IRT <= 100, 'IRT debe estar entre 0 y 100');
  assert.ok(['Bajo', 'Medio', 'Alto', 'Crítico'].includes(res.IRT_nivel), 'Nivel IRT válido');

  assert.ok(typeof res.IRM === 'number', 'IRM debe ser un número');
  assert.ok(['FAVORABLE', 'PRECAUCIÓN', 'RESTRINGIDA'].includes(res.IPOOT_aptitud), 'Aptitud IPOOT válida');
  console.log('✓ Test 1: Cálculo de índices SNC-DI pasado');
}

// Test 2: Validación de coordenadas en tiempo actual
{
  await assert.rejects(
    async () => await obtenerTiempoActual('invalido', -57.0),
    /inválidas/,
    'Debe rechazar latitud inválida'
  );

  await assert.rejects(
    async () => await obtenerTiempoActual(95, -57.0),
    /rango/,
    'Debe rechazar latitud fuera de rango'
  );
  console.log('✓ Test 2: Validación de coordenadas pasado');
}

// Test 3: Consulta tiempo actual Piribebuy con fallback o live
{
  const data = await obtenerTiempoActual(-25.46, -57.04);
  assert.equal(data.status, 'ok', 'Status debe ser ok');
  assert.ok(data.actual.temperatura !== undefined, 'Debe tener temperatura');
  assert.ok(data.decisionIntelligence.ICT !== undefined, 'Debe incluir ICT');
  console.log(`✓ Test 3: Consulta Piribebuy pasada (fuente: ${data.fuente})`);
}

// Test 4: NASA FIRMS focos de calor (CC-02)
{
  const focosParaguay = await obtenerFocosIncendios();
  assert.equal(focosParaguay.type, 'FeatureCollection', 'Debe ser GeoJSON FeatureCollection');
  assert.ok(Array.isArray(focosParaguay.features), 'Debe tener array de features');
  assert.ok(typeof focosParaguay.count === 'number', 'Debe tener conteo numérico');
  
  // Probar con BBOX acotado (p. ej. Cordillera)
  const focosCordillera = await obtenerFocosIncendios({ minX: -57.2, minY: -25.6, maxX: -56.8, maxY: -25.2 });
  assert.equal(focosCordillera.type, 'FeatureCollection', 'Debe responder GeoJSON para BBOX acotado');
  console.log(`✓ Test 4: NASA FIRMS focos de calor pasado (total: ${focosParaguay.count} focos)`);
}

// Test 5: Lluvia histórica ERA5 / Open-Meteo Archive (CC-04)
{
  const hist = await obtenerLluviaHistorica({
    lat: -25.2867,
    lng: -57.6470,
    desde: '2024-01-01',
    hasta: '2024-01-15'
  });
  assert.equal(hist.status, 'ok', 'Status debe ser ok');
  assert.ok(typeof hist.totalPrecipitacion_mm === 'number', 'Debe calcular total de precipitación');
  assert.ok(Array.isArray(hist.serie), 'Debe incluir serie temporal de días');
  assert.ok(hist.serie.length > 0, 'La serie debe contener registros');
  console.log(`✓ Test 5: Lluvia histórica pasada (total: ${hist.totalPrecipitacion_mm} mm en período)`);
}

console.log('--- Todos los tests de climaServicio pasaron exitosamente (5/5) ---');
