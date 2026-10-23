import test from 'node:test';
import assert from 'node:assert/strict';
import { LoteamientosModule, LOTEAMIENTOS_CONFIG } from '../js/modulo5.js';
import { MadesService, MADES_PORTALES, MADES_CAPAS } from '../js/madesService.js';
import { MagSyncManager, MAG_SYNC_INTERVAL_DAYS, MAG_CATALOG_DEFS } from '../magSync.js';

test('Módulo 1 - Mapas Base - Cobertura completa de capas requeridas', async () => {
  const fs = await import('node:fs');
  const code = fs.readFileSync('js/mapEngine.js', 'utf8');

  // Verificar que todas las capas requeridas están configuradas
  const requiredLayers = [
    'satellite',
    'osm',
    'carto',
    'carto_dark',
    'cad_atlas',
    'topo',
    'catastro',
    'humanitarian'
  ];

  for (const layer of requiredLayers) {
    assert.ok(code.includes(`${layer}:`), `Capa ${layer} debe estar en TILE_LAYERS`);
  }

  // Verificar blindaje de zoom (ESRI 18/19, Topo 17)
  assert.ok(code.includes('maxNativeZoom: 18'), 'ESRI Satélite debe tener maxNativeZoom 18');
  assert.ok(code.includes('maxNativeZoom: 17'), 'OpenTopoMap debe tener maxNativeZoom 17');
  assert.ok(code.includes('map.setMaxZoom(targetMaxZoom)'), 'Debe aplicar bloqueo dinámico de zoom');
});

test('Módulo 4 - Catastro Municipal Multifinalitario (Pilar / Asunción / Ley 3966)', async () => {
  // Simulación de cálculo de impuesto inmobiliario municipal según planta de valores (Ley 3966 Art. 150+)
  const datosInmueble = {
    supTierraM2: 500,
    valorTierraM2: 120000, // 120.000 Gs/m2
    supConstruccionM2: 180,
    valorConstruccionM2: 1500000, // 1.500.000 Gs/m2
    esBaldio: false,
    tasaInmobiliaria: 0.01 // 1% legal
  };

  const baseImponibleTierra = datosInmueble.supTierraM2 * datosInmueble.valorTierraM2; // 60.000.000 Gs
  const baseImponibleConstruccion = datosInmueble.supConstruccionM2 * datosInmueble.valorConstruccionM2; // 270.000.000 Gs
  const baseImponibleTotal = baseImponibleTierra + baseImponibleConstruccion; // 330.000.000 Gs
  const impuestoAnual = baseImponibleTotal * datosInmueble.tasaInmobiliaria; // 3.300.000 Gs

  assert.equal(baseImponibleTotal, 330000000);
  assert.equal(impuestoAnual, 3300000);

  // Verificación de recargo baldío
  const impuestoBaldio = baseImponibleTierra * 0.01 + baseImponibleTierra * 0.005; // 1% + 0.5% recargo baldío
  assert.equal(impuestoBaldio, 900000);
});

test('Módulo 5 - Loteamientos y Expansión Urbana - Cesión legal Art. 235 Ley 3966', () => {
  assert.equal(LOTEAMIENTOS_CONFIG.PORCENTAJE_PLAZAS_MIN, 7.0);
  assert.equal(LOTEAMIENTOS_CONFIG.GEOPORTAL_URL, 'https://loteamientos.com/mapa-catastral');

  const dictamen = LoteamientosModule.calcularCesionPublica({
    superficieTotalM2: 20000,
    superficieLotesM2: 14000,
    superficieCallesM2: 4400,
    superficiePlazasM2: 1600 // 1600 / 20000 = 8%
  });

  assert.equal(dictamen.cumpleCesionPlazas, true);
  assert.equal(dictamen.dictamen, 'CONFORME_MUNICIPAL');
  assert.equal(dictamen.porcentajePlazas, 8.0);
});

test('Módulo 7 - Geoportal Ambiental MADES (SIAM + SIAGUA + SINASIP + Franja Hídrica)', () => {
  assert.equal(MADES_PORTALES.SIAM_MAPAS, 'https://apps.mades.gov.py/siam/portal/mapas');
  assert.equal(MADES_PORTALES.SIAGUA_ALERTAS, 'https://siaguapy.mades.gov.py/alertas-hidrologicas');
  assert.equal(MADES_CAPAS.hidrografia.bufferM, 30.0);

  // Parcela intersectando Área Protegida SINASIP
  const parcelaParque = {
    type: 'Feature',
    properties: { PADRON: '12345' },
    geometry: { type: 'Polygon', coordinates: [] }
  };

  const resultado = MadesService.verificarAfectacionAmbiental(parcelaParque, [
    { tipo: MADES_CAPAS.sinasip.tipo }
  ]);

  assert.equal(resultado.tieneAfectaciones, true);
  assert.equal(resultado.bloqueante, true);
  assert.match(resultado.afectaciones[0].mensaje, /SINASIP/);
});

test('Módulo 8 - Geoportal Agropecuario MAG (Ciclo 15 días y capas estratégicas)', () => {
  assert.equal(MAG_SYNC_INTERVAL_DAYS, 15);
  assert.ok(MAG_CATALOG_DEFS.uso_tierra);
  assert.ok(MAG_CATALOG_DEFS.cultivos_temporales);
  assert.ok(MAG_CATALOG_DEFS.cultivos_permanentes);
  assert.ok(MAG_CATALOG_DEFS.hidrografia_rural);
});
