import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  tablaCriteriosCsv,
  parcelaGeoJson,
  flujoExpedienteMermaid,
  figuraResumenCriteriosSvg,
  metadatosCorridaYaml,
  generarPaqueteDatos,
} from '../reportesDatosServicio.js';

const CRITERIOS = [
  { id: 'VAL-01', nombre: 'Cierre de Polígono', tolerancia: '0.005 m', valor_obtenido: '0.002 m', estado: 'APROBADO' },
  { id: 'VAL-02', nombre: 'Tolerancia de Superficie', tolerancia: '1.0%', valor_obtenido: '0.35%', estado: 'APROBADO' },
  { id: 'VAL-03', nombre: 'Solape Parcelario', tolerancia: '0.00 m²', valor_obtenido: '0.00 m²', estado: 'OBSERVADO' },
];

const PARCELA = {
  type: 'Polygon',
  coordinates: [[[-56.44, -25.38], [-56.43, -25.38], [-56.43, -25.37], [-56.44, -25.37], [-56.44, -25.38]]],
};

const PASOS = [
  { id: 'A', etiqueta: 'Carga DXF', destino: 'B' },
  { id: 'B', etiqueta: 'Parseo Geométrico', destino: 'C' },
  { id: 'C', etiqueta: 'Valida 8 Criterios', destino: 'D', condicion: 'Pasa' },
  { id: 'D', etiqueta: 'Certificado Aprobado' },
];

test('tablaCriteriosCsv: encabezado fijo y una fila por criterio, sin comas sueltas', () => {
  const csv = tablaCriteriosCsv(CRITERIOS);
  const lineas = csv.trim().split('\n');
  assert.equal(lineas[0], 'id_criterio,nombre,tolerancia,valor_obtenido,estado');
  assert.equal(lineas.length, CRITERIOS.length + 1);
  assert.ok(lineas[1].startsWith('VAL-01,'));
});

test('tablaCriteriosCsv: escapa campos con comas o comillas (RFC 4180)', () => {
  const csv = tablaCriteriosCsv([{ id: 'VAL-04', nombre: 'Lindero "Norte", con coma', tolerancia: '-', valor_obtenido: '-', estado: 'OK' }]);
  assert.ok(csv.includes('"Lindero ""Norte"", con coma"'));
});

test('parcelaGeoJson produce un FeatureCollection valido con las propiedades dadas', () => {
  const gj = JSON.parse(parcelaGeoJson(PARCELA, { ccc: '11-08-0412-05', superficie_m2: 450.8 }));
  assert.equal(gj.type, 'FeatureCollection');
  assert.equal(gj.features.length, 1);
  assert.equal(gj.features[0].geometry.type, 'Polygon');
  assert.equal(gj.features[0].properties.ccc, '11-08-0412-05');
});

test('flujoExpedienteMermaid arma un flowchart LR con nodos y las transiciones condicionadas', () => {
  const mmd = flujoExpedienteMermaid(PASOS);
  assert.ok(mmd.startsWith('flowchart LR\n'));
  assert.ok(mmd.includes('A[Carga DXF]'));
  assert.ok(mmd.includes('C -->|Pasa| D'));
  assert.ok(!mmd.includes('D -->'), 'el ultimo paso no tiene destino y no debe emitir una flecha');
});

test('figuraResumenCriteriosSvg genera un SVG con una barra por criterio', () => {
  const svg = figuraResumenCriteriosSvg(CRITERIOS);
  assert.ok(svg.startsWith('<svg'));
  assert.equal((svg.match(/<rect/g) || []).length, CRITERIOS.length + 1); // + fondo
  assert.ok(svg.includes('APROBADO'));
  assert.ok(svg.includes('OBSERVADO'));
});

test('metadatosCorridaYaml serializa claves planas con el tipo correcto (sin comillas en numeros)', () => {
  const yaml = metadatosCorridaYaml({ expediente_id: 'EXP-2026-0045', epsg_proyeccion: 32721, cierre_lineal_error_m: 0.0018 });
  assert.ok(yaml.includes('expediente_id: "EXP-2026-0045"'));
  assert.ok(yaml.includes('epsg_proyeccion: 32721'));
  assert.ok(!yaml.includes('"32721"'));
});

test('generarPaqueteDatos escribe los 5 artefactos bajo _tablas, _figuras y _diagramas', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snc-reportes-'));
  try {
    const rutas = generarPaqueteDatos({
      criterios: CRITERIOS,
      parcela: { feature: PARCELA, propiedades: { ccc: '11-08-0412-05' } },
      pasos: PASOS,
      metadatos: { expediente_id: 'EXP-2026-0045', epsg_proyeccion: 32721 },
    }, dir);

    assert.ok(readFileSync(rutas.criterios, 'utf8').startsWith('id_criterio,'));
    assert.equal(JSON.parse(readFileSync(rutas.parcela, 'utf8')).type, 'FeatureCollection');
    assert.ok(readFileSync(rutas.resumen, 'utf8').startsWith('<svg'));
    assert.ok(readFileSync(rutas.flujo, 'utf8').startsWith('flowchart LR'));
    assert.ok(readFileSync(rutas.metadatos, 'utf8').includes('expediente_id:'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
