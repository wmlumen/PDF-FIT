import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RUN_FORMULARIOS_CATALOG,
  initRunFormsDatabase,
  getRunFormulario,
  getAllRunFormularios
} from '../js/runFormsDb.js';

test('RUN Formularios - Catálogo Oficial y Tiempos de Información', async () => {
  assert.ok(RUN_FORMULARIOS_CATALOG.length >= 20, 'Debe contener al menos 20 formularios oficiales del RUN');
  
  // Verificar DGCRI-F01 (Certificado Catastral Registral Inmobiliario)
  const f01 = RUN_FORMULARIOS_CATALOG.find(f => f.codigo === 'DGCRI-F01');
  assert.ok(f01, 'Debe existir DGCRI-F01');
  assert.equal(f01.plazoMaximoDias, 15, 'Plazo según Ley 7424/25 Art. 77 debe ser 15 días hábiles');
  assert.ok(f01.baseLegal.includes('Acordada CSJ N° 1823/2025'));
  assert.ok(f01.camposRequeridos.includes('PLANO_GEORREFERENCIADO'));

  // Verificar DGCRI-F04 (Servicios Catastrales)
  const f04 = RUN_FORMULARIOS_CATALOG.find(f => f.codigo === 'DGCRI-F04');
  assert.ok(f04);
  assert.equal(f04.plazoMaximoDias, 15);
  assert.ok(f04.informacionSolicitada.includes('shapefile'));

  // Verificar DGCRI-F17 (Planilla de Loteo Toma de Razón)
  const f17 = RUN_FORMULARIOS_CATALOG.find(f => f.codigo === 'DGCRI-F17');
  assert.ok(f17);
  assert.equal(f17.plazoMaximoDias, 30);
  assert.ok(f17.baseLegal.includes('Ley Orgánica Municipal N° 3966/2010'));

  // Inicializar en SQLite y validar consultas
  const count = await initRunFormsDatabase();
  assert.ok(count >= 20);

  const todos = await getAllRunFormularios();
  assert.equal(todos.length, RUN_FORMULARIOS_CATALOG.length);

  const retrieved = await getRunFormulario('DGCRI-F01');
  assert.equal(retrieved.codigo, 'DGCRI-F01');
  assert.equal(retrieved.plazo_maximo_dias, 15);
  assert.ok(Array.isArray(retrieved.campos_requeridos));
});
