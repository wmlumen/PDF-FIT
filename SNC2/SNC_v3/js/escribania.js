/**
 * escribania.js — Módulo Notarial y de Debida Diligencia para Escribanías Públicas
 * Cumplimiento del Código de Organización Judicial, Ley 7.424/2025 (RUN),
 * Ley 3966/2010 (Orgánica Municipal), Aranceles Notariales y DNIT.
 * 
 * Funcionalidades:
 * 1. Generador de Minuta Notarial y Cláusula de Linderos Técnicos (Rumbos y Distancias).
 * 2. Calculadora Notarial de Aranceles, Tasas Judiciales e Impuestos de Transferencia.
 * 3. Matriz de Due Diligence Inmobiliario (Score de Riesgo Jurídico-Físico).
 * 4. Verificación de Requisitos Previos para Escrituración Pública.
 */

export const ARANCELES_NOTARIALES_PY = {
  TASA_JUDICIAL_DGRP_PCT: 0.8, // 0.8% del valor del acto o fiscal (Corte Suprema de Justicia)
  IMPUESTO_TRANSFERENCIA_MUNI_PCT: 0.2, // 2 por mil (0.2%) - Ley 3966/10 Art. 177
  TASA_IRP_PRESUNTA_PCT: 2.4, // IRP Ganancia de Capital: 8% sobre base presunta del 30% del precio (DNIT)
  HONORARIO_NOTARIAL_MINIMO_GS: 1500000,
  HONORARIO_NOTARIAL_BASE_PCT: 1.5 // 1.5% de honorario notarial según escala Colegio de Escribanos del Paraguay
};

export class EscribaniaModule {
  /**
   * Genera la cláusula de individualización catastral y linderos técnicos para el protocolo notarial.
   * Evita errores tipográficos de transcripción en la Escritura Pública.
   * 
   * @param {Object} feature - Feature GeoJSON de la parcela
   * @param {Object} datosInmueble - Datos de título y partes
   * @returns {Object} Minuta técnica estructurada
   */
  static generarMinutaNotarial(feature, datosInmueble = {}) {
    const props = feature?.properties || {};
    const coords = feature?.geometry?.coordinates?.[0] || [];
    const padron = props.PADRON || datosInmueble.padron || 'SIN_PADRON';
    const ccc = props.CCC || props.CTA_CTE || datosInmueble.ccc || 'SIN_CCC';
    const fincaMatricula = datosInmueble.fincaMatricula || 'A DETERMINAR';
    const distrito = props.DISTRITO || datosInmueble.distrito || 'PARAGUAY';
    const superficieM2 = props.AREA_M2 || props.SUP_SIG_M2 || datosInmueble.superficieM2 || 0;

    // Generar descripción de linderos y vértices si hay geometría disponible
    let descripcionLinderos = '';
    const verticesDetalle = [];

    if (coords.length > 2) {
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        verticesDetalle.push({
          vertice: `V${i + 1}`,
          este: p1[0].toFixed(3),
          norte: p1[1].toFixed(3),
          distanciaM: dist.toFixed(2)
        });
      }
      descripcionLinderos = `Partiendo del Vértice V1 con coordenadas UTM Este: ${verticesDetalle[0]?.este}m y Norte: ${verticesDetalle[0]?.norte}m, delimitando un polígono cerrado de ${verticesDetalle.length} vértices georreferenciados en el Sistema WGS84 / UTM Zona 21S (EPSG:32721), conforme a la Resolución SNC N° 551/2023.`;
    } else {
      descripcionLinderos = `Linderos y dimensiones según plano de mensura y certificado catastral oficial.`;
    }

    const clausulaObjeto = `CLÁUSULA PRIMERA (OBJETO): El VENDEDOR transfiere a favor del COMPRADOR en pleno dominio y posesión el inmueble individualizado como Padrón N° ${padron}, Cuenta Corriente Catastral N° ${ccc}, inscripto en el Registro Público como Finca/Matrícula N° ${fincaMatricula} del Distrito de ${distrito}, con una superficie de ${Number(superficieM2).toFixed(2)} m². ${descripcionLinderos}`;

    return {
      padron,
      ccc,
      fincaMatricula,
      distrito,
      superficieM2: Number(superficieM2).toFixed(2),
      verticesDetalle,
      clausulaObjeto,
      fechaMinuta: new Date().toISOString()
    };
  }

  /**
   * Calculadora Notarial Oficial: Tasas Judiciales, Impuesto Municipal, Honorarios e IRP.
   * 
   * @param {Object} params
   * @param {number} params.valorFiscalGs - Valor fiscal según SNC / VEP MEF
   * @param {number} params.valorVentaGs - Precio de venta acordado entre las partes
   * @param {boolean} params.esViviendaEconomica - Si aplica exenciones
   * @returns {Object} Liquidación notarial detallada
   */
  static liquidarGastosTransferencia({ valorFiscalGs, valorVentaGs, esViviendaEconomica = false }) {
    if (!valorFiscalGs || valorFiscalGs <= 0) {
      throw new Error('El valor fiscal debe ser mayor a 0 Gs para la liquidación');
    }
    const precioReferencia = Math.max(valorFiscalGs, valorVentaGs || 0);

    // 1. Tasa Judicial DGRP (Corte Suprema de Justicia - 0.8%)
    const tasaJudicialDGRP = Math.round(precioReferencia * (ARANCELES_NOTARIALES_PY.TASA_JUDICIAL_DGRP_PCT / 100));

    // 2. Impuesto de Transferencia Municipal (Ley 3966 Art. 177 - 2 por mil = 0.2%)
    const impuestoTransferenciaMuni = Math.round(precioReferencia * (ARANCELES_NOTARIALES_PY.IMPUESTO_TRANSFERENCIA_MUNI_PCT / 100));

    // 3. Honorarios Notariales (Colegio de Escribanos del Paraguay - 1.5% o mínimo legal)
    const honorariosNotariales = Math.max(
      ARANCELES_NOTARIALES_PY.HONORARIO_NOTARIAL_MINIMO_GS,
      Math.round(precioReferencia * (ARANCELES_NOTARIALES_PY.HONORARIO_NOTARIAL_BASE_PCT / 100))
    );

    // 4. IVA sobre honorarios notariales (10%)
    const ivaHonorarios = Math.round(honorariosNotariales * 0.10);

    // 5. Retención IRP / DNIT (Venta de inmuebles - tasa efectiva aproximada 2.4%)
    const retencionIRP = Math.round(precioReferencia * (ARANCELES_NOTARIALES_PY.TASA_IRP_PRESUNTA_PCT / 100));

    const totalGastosTransferencia = tasaJudicialDGRP + impuestoTransferenciaMuni + honorariosNotariales + ivaHonorarios + retencionIRP;

    return {
      valorFiscalGs,
      valorVentaGs: valorVentaGs || valorFiscalGs,
      precioReferencia,
      desglose: {
        tasaJudicialDGRP,
        impuestoTransferenciaMuni,
        honorariosNotariales,
        ivaHonorarios,
        retencionIRP
      },
      totalGastosTransferencia,
      porcentajeAproximadoTotal: Number(((totalGastosTransferencia / precioReferencia) * 100).toFixed(2))
    };
  }

  /**
   * Matriz de Due Diligence Inmobiliario Notarial:
   * Evalúa el score de riesgo de una propiedad cruzando:
   * - Dominio DGRP (libre vs litigio/embargo)
   * - Catastro SNC (concordancia de superficie y plano)
   * - Municipalidad (impuesto inmobiliario al día)
   * - Restricciones Ambientales MADES (SINASIP / Franja hídrica 30m)
   * 
   * @param {Object} params
   * @returns {Object} Semáforo y dictamen notarial
   */
  static auditarDueDiligenceNotarial({
    estadoDGRP = 'LIBRE',
    superficieTituloM2 = 0,
    superficiePlanoM2 = 0,
    impuestoMunicipalAlDia = true,
    afectacionAmbientalMades = false
  }) {
    let score = 100;
    const observaciones = [];

    // Verificación 1: DGRP
    if (estadoDGRP !== 'LIBRE') {
      score -= 50;
      observaciones.push({
        nivel: 'BLOQUEANTE',
        origen: 'DGRP',
        mensaje: `Inmueble con medida cautelar o afectación registral: ${estadoDGRP}. Escrituración bloqueada.`
      });
    }

    // Verificación 2: Discrepancia Catastral
    if (superficieTituloM2 > 0 && superficiePlanoM2 > 0) {
      const delta = Math.abs(superficiePlanoM2 - superficieTituloM2);
      const pctDelta = (delta / superficieTituloM2) * 100;
      if (pctDelta > 5.0) { // Tolerancia máxima reglamentaria 5%
        score -= 25;
        observaciones.push({
          nivel: 'ALERTA_SUBSANACION',
          origen: 'SNC',
          mensaje: `Diferencia de superficie entre título (${superficieTituloM2} m²) y plano (${superficiePlanoM2} m²) es ${pctDelta.toFixed(2)}% (> 5%). Requiere mensura judicial o administrativa previa.`
        });
      }
    }

    // Verificación 3: Municipalidad
    if (!impuestoMunicipalAlDia) {
      score -= 15;
      observaciones.push({
        nivel: 'REQUISITO_PREVIO',
        origen: 'MUNICIPAL',
        mensaje: 'Adeuda impuesto inmobiliario municipal. Ley 3966 Art. 165 exige constancia de pago del año en curso.'
      });
    }

    // Verificación 4: MADES
    if (afectacionAmbientalMades) {
      score -= 20;
      observaciones.push({
        nivel: 'ADVERTENCIA_NOTARIAL',
        origen: 'MADES',
        mensaje: 'Inmueble colindante con cauce hídrico o área protegida. El escribano debe insertar cláusula de servidumbre ambiental (Ley 3239/07).'
      });
    }

    let semaforo = 'VERDE';
    let dictamen = 'APTO_PARA_ESCRITURACION';

    if (score < 50 || estadoDGRP !== 'LIBRE') {
      semaforo = 'ROJO';
      dictamen = 'NO_APTO_ESCRITURACION_BLOQUEADA';
    } else if (score < 85) {
      semaforo = 'AMARILLO';
      dictamen = 'APTO_CON_OBSERVACIONES_DE_SUBSANACION';
    }

    return {
      score,
      semaforo,
      dictamen,
      observaciones,
      totalObservaciones: observaciones.length,
      fechaAuditoria: new Date().toISOString()
    };
  }
}

if (typeof window !== 'undefined') {
  window.EscribaniaModule = EscribaniaModule;
}

export default EscribaniaModule;
