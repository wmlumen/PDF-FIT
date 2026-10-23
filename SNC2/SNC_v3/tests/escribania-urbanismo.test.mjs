import test from 'node:test';
import assert from 'node:assert/strict';
import { EscribaniaModule, ARANCELES_NOTARIALES_PY } from '../js/escribania.js';
import { UrbanismoModule, ZONIFICACION_URBANA_DEF } from '../js/urbanismo.js';

test('Escribanía - Liquidación de gastos de transferencia e impuestos notariales', () => {
  // Transferencia de un inmueble con valor de 100.000.000 Gs
  const liquidacion = EscribaniaModule.liquidarGastosTransferencia({
    valorFiscalGs: 60000000,
    valorVentaGs: 100000000
  });

  // Precio de referencia debe ser el mayor: 100.000.000 Gs
  assert.equal(liquidacion.precioReferencia, 100000000);

  // Tasa Judicial DGRP (0.8%) = 800.000 Gs
  assert.equal(liquidacion.desglose.tasaJudicialDGRP, 800000);

  // Impuesto Transferencia Municipal (0.2%) = 200.000 Gs
  assert.equal(liquidacion.desglose.impuestoTransferenciaMuni, 200000);

  // Honorario Notarial (1.5%) = 1.500.000 Gs
  assert.equal(liquidacion.desglose.honorariosNotariales, 1500000);

  // IVA Honorarios (10%) = 150.000 Gs
  assert.equal(liquidacion.desglose.ivaHonorarios, 150000);

  // Retención IRP presunta (2.4%) = 2.400.000 Gs
  assert.equal(liquidacion.desglose.retencionIRP, 2400000);

  // Total
  assert.equal(liquidacion.totalGastosTransferencia, 800000 + 200000 + 1500000 + 150000 + 2400000);
});

test('Escribanía - Generación de Minuta Notarial y Cláusula de Linderos Técnicos', () => {
  const feature = {
    type: 'Feature',
    properties: {
      PADRON: '4589',
      CCC: '12-0458-09',
      AREA_M2: 720.50,
      DISTRITO: 'PIRIBEBUY'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [480100.0, 7180200.0],
        [480124.0, 7180200.0],
        [480124.0, 7180230.0],
        [480100.0, 7180230.0],
        [480100.0, 7180200.0]
      ]]
    }
  };

  const minuta = EscribaniaModule.generarMinutaNotarial(feature, {
    fincaMatricula: 'F-12098'
  });

  assert.equal(minuta.padron, '4589');
  assert.equal(minuta.ccc, '12-0458-09');
  assert.equal(minuta.fincaMatricula, 'F-12098');
  assert.match(minuta.clausulaObjeto, /CLÁUSULA PRIMERA \(OBJETO\)/);
  assert.match(minuta.clausulaObjeto, /Padrón N° 4589/);
  assert.match(minuta.clausulaObjeto, /Finca\/Matrícula N° F-12098/);
  assert.ok(minuta.verticesDetalle.length >= 4);
});

test('Escribanía - Due Diligence Notarial (Semáforo de Riesgo)', () => {
  // Caso 1: Inmueble libre y conforme
  const auditoriaLimpia = EscribaniaModule.auditarDueDiligenceNotarial({
    estadoDGRP: 'LIBRE',
    superficieTituloM2: 500,
    superficiePlanoM2: 500,
    impuestoMunicipalAlDia: true,
    afectacionAmbientalMades: false
  });

  assert.equal(auditoriaLimpia.semaforo, 'VERDE');
  assert.equal(auditoriaLimpia.dictamen, 'APTO_PARA_ESCRITURACION');
  assert.equal(auditoriaLimpia.score, 100);

  // Caso 2: Inmueble con embargo registral (DGRP)
  const auditoriaBloqueada = EscribaniaModule.auditarDueDiligenceNotarial({
    estadoDGRP: 'EMBARGO',
    superficieTituloM2: 500,
    superficiePlanoM2: 500,
    impuestoMunicipalAlDia: true,
    afectacionAmbientalMades: false
  });

  assert.equal(auditoriaBloqueada.semaforo, 'ROJO');
  assert.equal(auditoriaBloqueada.dictamen, 'NO_APTO_ESCRITURACION_BLOQUEADA');
  assert.ok(auditoriaBloqueada.score <= 50);
});

test('Urbanismo - Cálculo de FOS y FOT (Ley 3966)', () => {
  // Terreno 400 m2, planta baja 200 m2 (50% <= 60% max), total edificado 400 m2 (FOT 1.0 <= 1.2)
  const diag = UrbanismoModule.calcularFOS_FOT({
    superficieTerrenoM2: 400,
    superficiePlantaBajaM2: 200,
    superficieTotalEdificadaM2: 400,
    zona: 'RESIDENCIAL_BAJA'
  });

  assert.equal(diag.cumpleFOS, true);
  assert.equal(diag.cumpleFOT, true);
  assert.equal(diag.fosActualPct, 50.0);
  assert.equal(diag.fotActual, 1.0);
  assert.equal(diag.dictamenUrbanistico, 'CONFORME_EDIFICABILIDAD');
});

test('Urbanismo - Proximidad a Servicios Básicos e Infraestructura', () => {
  const serviciosOptimos = UrbanismoModule.evaluarServiciosBasicos({
    distanciaRedElectricaANDE_M: 10,
    distanciaRedAguaESSAP_M: 15,
    tipoCalzada: 'ASFALTO',
    distanciaTransportePublicoM: 100
  });

  assert.equal(serviciosOptimos.cuentaConLuzInmediata, true);
  assert.equal(serviciosOptimos.cuentaConAguaInmediata, true);
  assert.equal(serviciosOptimos.categoria, 'CONSOLIDADO_ALTA_COBERTURA');
  assert.equal(serviciosOptimos.score, 100);
});

test('Urbanismo - Comparador Comercial: Valor de Mercado vs. Valor Fiscal', () => {
  const comp = UrbanismoModule.compararValorFiscalVsMercado({
    valorFiscalM2Gs: 100000,
    valorMercadoM2Gs: 250000,
    superficieM2: 360
  });

  assert.equal(comp.valorFiscalTotalGs, 36000000);
  assert.equal(comp.valorMercadoTotalGs, 90000000);
  assert.equal(comp.ratioMercadoFiscal, 2.5);
  assert.equal(comp.plusvaliaEstimadaGs, 54000000);
});
