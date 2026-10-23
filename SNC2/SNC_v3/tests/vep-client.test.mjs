import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VEP_ENDPOINTS,
  CATALOGO_CAPAS_VEP,
  obtenerUrlDescargaShapefile,
  obtenerUrlDescargaCSV
} from '../js/vepDataClient.js';

test('VEP Data Client - Endpoints oficiales de serviciosvep.mef.gov.py', () => {
  assert.equal(VEP_ENDPOINTS.SQL_API, 'https://serviciosvep.mef.gov.py/user/ama/api/v2/sql');
  assert.equal(VEP_ENDPOINTS.VIZ_API, 'https://serviciosvep.mef.gov.py/user/ama/api/v1/viz');
});

test('VEP Data Client - Catálogo estructurado por Direcciones Municipales', () => {
  assert.ok(CATALOGO_CAPAS_VEP.CATASTRO_OBRAS.some(c => c.id === 'distritos_del_ama'));
  assert.ok(CATALOGO_CAPAS_VEP.MEDIO_AMBIENTE.some(c => c.id === 'areas_verdes_protectoras_de_arroyos'));
  assert.ok(CATALOGO_CAPAS_VEP.GESTION_RIESGOS.some(c => c.id === 'cota_inundable_2'));
  assert.ok(CATALOGO_CAPAS_VEP.TRANSITO_VIALIDAD.some(c => c.id === 'bicisendas_existentes_1'));
  assert.ok(CATALOGO_CAPAS_VEP.EQUIPAMIENTOS_SERVICIOS.some(c => c.id === 'centros_de_salud_ama'));
});

test('VEP Data Client - Generación de URLs de descarga directa SHP y CSV', () => {
  const urlShp = obtenerUrlDescargaShapefile('distritos_del_ama', "dist_desc = 'ASUNCION'");
  assert.ok(urlShp.includes('format=shp'));
  assert.ok(urlShp.includes('distritos_del_ama'));
  assert.ok(urlShp.includes('ASUNCION'));

  const urlCsv = obtenerUrlDescargaCSV('barrios_ama');
  assert.ok(urlCsv.includes('format=csv'));
  assert.ok(urlCsv.includes('barrios_ama'));
});
