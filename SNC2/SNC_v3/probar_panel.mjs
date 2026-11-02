import assert from 'node:assert/strict';

console.log('====================================================');
console.log('🧪 PRUEBA INTEGRAL EN VIVO: http://localhost:5556/panel.html');
console.log('====================================================\n');

async function testUrl(url, nombre) {
  process.stdout.write(`• Probando ${nombre} (${url})... `);
  const res = await fetch(url);
  assert.equal(res.status, 200, `Status debe ser 200 para ${url}`);
  const text = await res.text();
  assert.ok(text.length > 50, `El contenido no debe estar vacío (${text.length} bytes)`);
  console.log(`✅ OK (${res.status}, ${text.length} bytes)`);
  return text;
}

// 1. Archivo HTML principal
const html = await testUrl('http://localhost:5556/panel.html', 'HTML Principal');
assert.ok(html.includes('id="map"'), 'Debe contener contenedor del mapa #map');
assert.ok(html.includes('id="chart-clima"'), 'Debe contener canvas para gráfico #chart-clima');
assert.ok(html.includes('/vendor/leaflet.js'), 'Debe enlazar Leaflet local');
assert.ok(html.includes('/js/panel-clima.js'), 'Debe enlazar controlador JS');

// 2. Recursos estáticos (CSS, JS, Vendor)
await testUrl('http://localhost:5556/vendor/leaflet.js', 'Librería Leaflet JS');
await testUrl('http://localhost:5556/vendor/leaflet.css', 'Librería Leaflet CSS');
await testUrl('http://localhost:5556/css/panel-clima.css', 'Estilos Panel Clima');
await testUrl('http://localhost:5556/js/panel-clima.js', 'Controlador Panel Clima');

// 3. Endpoint API Tiempo Actual & Decision Intelligence
console.log('\n--- Probando Endpoints de Datos en Vivo ---');
{
  const res = await fetch('http://localhost:5556/api/v3/clima/tiempo?lat=-25.4667&lng=-57.0500');
  assert.equal(res.status, 200);
  const data = await res.json();
  console.log('✅ API /api/v3/clima/tiempo (Piribebuy):');
  console.log(`   - Temperatura actual: ${data.actual.temperatura} °C (Sensación: ${data.actual.sensacion} °C)`);
  console.log(`   - Humedad: ${data.actual.humedad} % | Viento: ${data.actual.viento} km/h`);
  console.log(`   - Índices SNC-DI: ICT = ${data.decisionIntelligence.ICT} (${data.decisionIntelligence.ICT_nivel}), IRT = ${data.decisionIntelligence.IRT} (${data.decisionIntelligence.IRT_nivel})`);
  console.log(`   - Aptitud IPOOT: ${data.decisionIntelligence.IPOOT_aptitud}`);
  console.log(`   - Fuente activa: ${data.fuente}`);
}

// 4. Endpoint NASA FIRMS Focos de Calor
{
  const res = await fetch('http://localhost:5556/api/v3/clima/incendios');
  assert.equal(res.status, 200);
  const data = await res.json();
  console.log(`\n✅ API /api/v3/clima/incendios:`);
  console.log(`   - Tipo: ${data.type}`);
  console.log(`   - Focos activos detectados en Paraguay: ${data.count}`);
  if (data.features.length > 0) {
    const f = data.features[0];
    console.log(`   - Muestra foco #1: Coordenadas [${f.geometry.coordinates}], Fecha: ${f.properties.fecha}, FRP: ${f.properties.frp} MW`);
  }
}

// 5. Endpoint Lluvia Histórica
{
  const res = await fetch('http://localhost:5556/api/v3/clima/lluvia-historica?lat=-25.2867&lng=-57.6470&desde=2024-01-01&hasta=2024-01-15');
  assert.equal(res.status, 200);
  const data = await res.json();
  console.log(`\n✅ API /api/v3/clima/lluvia-historica (Asunción):`);
  console.log(`   - Total acumulado período: ${data.totalPrecipitacion_mm} mm`);
  console.log(`   - Días con lluvia: ${data.diasConLluvia}`);
  console.log(`   - Días registrados en serie: ${data.serie.length}`);
}

// 6. Dataset Cartográfico Distrital y Riesgo de Inundación (CC-05 / CC-06)
{
  const resGeo = await fetch('http://localhost:5556/data/distritos_py_light.geojson');
  assert.equal(resGeo.status, 200);
  const geo = await resGeo.json();
  console.log(`\n✅ GeoJSON Distrital (/data/distritos_py_light.geojson):`);
  console.log(`   - Polígonos de distritos: ${geo.features.length}`);
  assert.equal(geo.features.length, 246, 'Debe contener los 246 distritos oficiales');

  const resRsk = await fetch('http://localhost:5556/Cambio_climatico/indice_riesgo_inundacion_distritos.json');
  assert.equal(resRsk.status, 200);
  const rsk = await resRsk.json();
  console.log(`✅ Índice de Riesgo Inundación (/Cambio_climatico/indice_riesgo_inundacion_distritos.json):`);
  console.log(`   - Total distritos evaluados: ${rsk.total_distritos}`);
  console.log(`   - Top 1: #${rsk.distritos[0].ranking} ${rsk.distritos[0].distrito} (${rsk.distritos[0].depto}) IRI=${rsk.distritos[0].indice_riesgo_inundacion}`);
  assert.equal(rsk.total_distritos, 246, 'Debe coincidir con los 246 distritos');
}

// 7. Capas Parcelarias de Piribebuy (Opción A)
{
  const resLotes = await fetch('http://localhost:5556/data/municipal/piribebuy/casco/lotes_casco_historico.geojson');
  assert.equal(resLotes.status, 200);
  const lotes = await resLotes.json();
  console.log(`\n✅ Capa Parcelas Piribebuy (/data/municipal/piribebuy/casco/lotes_casco_historico.geojson):`);
  console.log(`   - Parcelas cargadas: ${lotes.features.length}`);
  assert.equal(lotes.features.length, 91, 'Debe contener los 91 lotes del casco histórico');
}

// 8. Red Hídrica Nacional (/api/v3/hidrografia - STP/IGM + OSM)
{
  const resHidro = await fetch('http://localhost:5556/api/v3/hidrografia?minX=-58&minY=-26&maxX=-57&maxY=-25');
  assert.equal(resHidro.status, 200);
  const hidro = await resHidro.json();
  console.log(`\n✅ Red Hídrica Nacional (/api/v3/hidrografia):`);
  console.log(`   - Elementos hídricos cargados: ${hidro.features.length}`);
  assert.ok(hidro.features.length > 0, 'Debe contener elementos de la red hídrica nacional');
}

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS INTEGRALES PASARON EXITOSAMENTE (100% OK)');
console.log('====================================================\n');
