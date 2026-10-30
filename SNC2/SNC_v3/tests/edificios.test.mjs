import test from 'node:test';
import assert from 'node:assert/strict';
import { areaGeom, compararEdificacion, asignarEdificio, resumenPorParcela } from '../edificiosServicio.js';

const cuadro = (x, y, l) => ({ type: 'Polygon', coordinates: [[[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]] });

test('areaGeom calcula m² en coordenadas UTM', () => {
  assert.equal(areaGeom(cuadro(0, 0, 10)), 100);
});

test('compararEdificacion clasifica la diferencia entre mapa y liquidación', () => {
  assert.equal(compararEdificacion(120, 0).estado, 'no_declarada');
  assert.equal(compararEdificacion(0, 80).estado, 'sin_huella');
  assert.equal(compararEdificacion(100, 50).estado, 'menor_declarada');
  assert.equal(compararEdificacion(100, 200).estado, 'mayor_declarada');
  assert.equal(compararEdificacion(100, 110).estado, 'coincide');
});

test('asignarEdificio: automática si una parcela tiene casi todo; pendiente si está repartido', () => {
  const p1 = { properties: { id_parcela: 1, zona: 19, mz: 1, lote: 1 }, geometry: cuadro(0, 0, 20) };
  const p2 = { properties: { id_parcela: 2, zona: 19, mz: 1, lote: 2 }, geometry: cuadro(20, 0, 20) };
  // intersección exacta para rectángulos alineados
  const inter = (a, b) => {
    const [ax0, ay0] = a.coordinates[0][0], [ax1, ay1] = a.coordinates[0][2], [bx0, by0] = b.coordinates[0][0], [bx1, by1] = b.coordinates[0][2];
    const x0 = Math.max(ax0, bx0), y0 = Math.max(ay0, by0), x1 = Math.min(ax1, bx1), y1 = Math.min(ay1, by1);
    return x1 > x0 && y1 > y0 ? cuadro(x0, y0, Math.min(x1 - x0, y1 - y0)) : null;
  };
  const dentro = asignarEdificio({ geometry: cuadro(2, 2, 10) }, [p1, p2], inter);
  assert.equal(dentro.estado, 'auto'); assert.equal(dentro.id_parcela, 1);
  const repartido = asignarEdificio({ geometry: { type: 'Polygon', coordinates: [[[15, 5], [25, 5], [25, 10], [15, 10], [15, 5]]] } }, [p1, p2], (a, b) => {
    const bx0 = b.coordinates[0][0][0], x0 = Math.max(15, bx0), x1 = Math.min(25, bx0 + 20);
    return x1 > x0 ? { type: 'Polygon', coordinates: [[[x0, 5], [x1, 5], [x1, 10], [x0, 10], [x0, 5]]] } : null;
  });
  assert.equal(repartido.estado, 'pendiente');
  assert.equal(repartido.candidatas.length, 2);
});

test('resumenPorParcela suma área cubierta × niveles y compara con lo liquidado', () => {
  const parcelas = new Map([[1, { properties: { id_parcela: 1, dnit_ctacte: '190001-01/00-000', dnit_sup_edif_m2: 0 } }], [2, { properties: { id_parcela: 2, dnit_sup_edif_m2: 90 } }]]);
  const r = resumenPorParcela([{ properties: { estado: 'auto', id_parcela: 1, m2: 70, m2_cubierta: 60, niveles: 2 } }], parcelas);
  const p1 = r.find(x => x.id_parcela === 1), p2 = r.find(x => x.id_parcela === 2);
  assert.equal(p1.construido_osm_m2, 120); assert.equal(p1.estado, 'no_declarada');
  assert.equal(p2.estado, 'sin_huella');
});

test('techo y área cubierta: el alero se descuenta del techo; m² a completar si se declaró menos', async () => {
  const { cubiertaDesdeTecho, techoDesdeCubierta, m2ACompletar, calcularRelevamiento, perimetroGeom } = await import('../edificiosServicio.js');
  // Casa de 10 × 8 m de techo con alero de 0,6 m: cubierta 8,8 × 6,8 = 59,84 m²
  assert.equal(Math.round(cubiertaDesdeTecho(80, 36, 0.6) * 100) / 100, 59.84);
  assert.equal(Math.round(techoDesdeCubierta(59.84, 31.2, 0.6) * 100) / 100, 80);
  assert.equal(perimetroGeom({ type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 8], [0, 8], [0, 0]]] }), 36);
  assert.equal(m2ACompletar(120, 80), 40);
  assert.equal(m2ACompletar(70, 80), 0);
  const r = calcularRelevamiento({ area_m2: 80, perimetro_m: 36, trazo: 'techo', alero_m: 0.6, niveles: 2, declarado_m2: 60 });
  assert.equal(r.m2_cubierta, 59.8); assert.equal(r.construido_m2, 119.7); assert.equal(r.m2_a_completar, 59.7);
  assert.throws(() => calcularRelevamiento({ area_m2: 0, perimetro_m: 0 }), /inválidos/);
});

test('edificación en altura: m² por piso, el último distinto, total sumado', async () => {
  const { calcularRelevamiento } = await import('../edificiosServicio.js');
  const r = calcularRelevamiento({ area_m2: 100, perimetro_m: 40, trazo: 'cubierta', niveles: 4, pisos_m2: [100, 100, 100, 60], declarado_m2: 250 });
  assert.equal(r.niveles, 4); assert.equal(r.construido_m2, 360); assert.equal(r.m2_a_completar, 110);
  const sinDetalle = calcularRelevamiento({ area_m2: 100, perimetro_m: 40, trazo: 'cubierta', niveles: 3 });
  assert.equal(sinDetalle.construido_m2, 300);
  assert.throws(() => calcularRelevamiento({ area_m2: 100, perimetro_m: 40, pisos_m2: [100, -5] }), /por piso/);
});
