/**
 * urbanismo.js — Módulo de Análisis Urbanístico, Servicios Básicos y Valor de Suelo
 * Complementa la debida diligencia de loteamientos e inversiones inmobiliarias
 * (Funcionalidades tipo Loteamientos.com y Civis.com.py)
 * 
 * Funcionalidades:
 * 1. Indicadores Urbanísticos FOS / FOT / Alturas según Ley 3966/10.
 * 2. Evaluación de Proximidad a Servicios Básicos (ANDE, ESSAP, Pavimentación).
 * 3. Análisis de Pendientes y Escurrimiento Pluvial (Riesgo de Inundabilidad).
 * 4. Comparador de Valor Comercial de Mercado vs. Valor Fiscal Oficial (MEF VEP).
 */

export const ZONIFICACION_URBANA_DEF = {
  RESIDENCIAL_BAJA: {
    nombre: 'Residencial Baja Densidad (R1)',
    fosMaxPct: 60.0, // 60% ocupación en planta baja
    fotMax: 1.2,     // 1.2 veces el área del terreno en total
    alturaMaximaPisos: 3
  },
  RESIDENCIAL_MEDIA: {
    nombre: 'Residencial Media Densidad (R2)',
    fosMaxPct: 70.0,
    fotMax: 2.5,
    alturaMaximaPisos: 5
  },
  COMERCIAL_MIXTA: {
    nombre: 'Comercial Mixta / Eje Urbano (C1)',
    fosMaxPct: 75.0,
    fotMax: 4.0,
    alturaMaximaPisos: 10
  }
};

export class UrbanismoModule {
  /**
   * Calcula los parámetros de edificabilidad FOS y FOT para una parcela.
   * 
   * @param {Object} params
   * @param {number} params.superficieTerrenoM2 - Área total del terreno
   * @param {number} params.superficiePlantaBajaM2 - Área a techar en planta baja
   * @param {number} params.superficieTotalEdificadaM2 - Suma de todas las plantas proyectadas
   * @param {string} params.zona - Clave de zonificación (RESIDENCIAL_BAJA, RESIDENCIAL_MEDIA, COMERCIAL_MIXTA)
   * @returns {Object} Diagnóstico de edificabilidad urbanística
   */
  static calcularFOS_FOT({
    superficieTerrenoM2,
    superficiePlantaBajaM2 = 0,
    superficieTotalEdificadaM2 = 0,
    zona = 'RESIDENCIAL_BAJA'
  }) {
    if (!superficieTerrenoM2 || superficieTerrenoM2 <= 0) {
      throw new Error('La superficie del terreno debe ser mayor a 0 m²');
    }

    const norma = ZONIFICACION_URBANA_DEF[zona] || ZONIFICACION_URBANA_DEF.RESIDENCIAL_BAJA;

    // FOS = (Sup Planta Baja / Sup Terreno) * 100
    const fosActualPct = (superficiePlantaBajaM2 / superficieTerrenoM2) * 100;
    const supPlantaBajaMaximaM2 = superficieTerrenoM2 * (norma.fosMaxPct / 100);
    const cumpleFOS = fosActualPct <= norma.fosMaxPct;

    // FOT = (Sup Total Edificada / Sup Terreno)
    const fotActual = superficieTotalEdificadaM2 / superficieTerrenoM2;
    const supTotalEdificableMaximaM2 = superficieTerrenoM2 * norma.fotMax;
    const cumpleFOT = fotActual <= norma.fotMax;

    // Área libre permeable requerida
    const areaLibreM2 = Math.max(0, superficieTerrenoM2 - superficiePlantaBajaM2);
    const pctAreaLibre = (areaLibreM2 / superficieTerrenoM2) * 100;

    return {
      superficieTerrenoM2,
      zona: norma.nombre,
      fosActualPct: Number(fosActualPct.toFixed(2)),
      fosMaxPermitidoPct: norma.fosMaxPct,
      supPlantaBajaMaximaM2: Number(supPlantaBajaMaximaM2.toFixed(2)),
      cumpleFOS,
      fotActual: Number(fotActual.toFixed(2)),
      fotMaxPermitido: norma.fotMax,
      supTotalEdificableMaximaM2: Number(supTotalEdificableMaximaM2.toFixed(2)),
      cumpleFOT,
      areaLibreM2: Number(areaLibreM2.toFixed(2)),
      pctAreaLibre: Number(pctAreaLibre.toFixed(2)),
      alturaMaximaPisos: norma.alturaMaximaPisos,
      dictamenUrbanistico: cumpleFOS && cumpleFOT ? 'CONFORME_EDIFICABILIDAD' : 'OBSERVADO_EXCESO_OCUPACION'
    };
  }

  /**
   * Evalúa la disponibilidad y distancia a servicios básicos de infraestructura.
   * (Modelo similar al Due Diligence de Loteamientos.com)
   * 
   * @param {Object} servicios - Distancias estimadas en metros a redes públicas
   * @returns {Object} Calificación de infraestructura del suelo
   */
  static evaluarServiciosBasicos({
    distanciaRedElectricaANDE_M = 0,
    distanciaRedAguaESSAP_M = 0,
    tipoCalzada = 'ASFALTO', // ASFALTO, EMPEDRADO, TIERRA
    distanciaTransportePublicoM = 200
  }) {
    let score = 100;
    const carencias = [];

    // Red Eléctrica ANDE
    if (distanciaRedElectricaANDE_M > 50) {
      score -= 25;
      carencias.push(`Red eléctrica ANDE a ${distanciaRedElectricaANDE_M}m (requiere extensión de línea).`);
    }

    // Red de Agua Corriente
    if (distanciaRedAguaESSAP_M > 50) {
      score -= 25;
      carencias.push(`Red de agua corriente a ${distanciaRedAguaESSAP_M}m (requiere pozo artesiano o extensión).`);
    }

    // Tipo de Calzada
    const tipo = tipoCalzada.toUpperCase();
    if (tipo === 'TIERRA') {
      score -= 20;
      carencias.push('Camino de tierra: transitabilidad limitada en días de lluvia.');
    } else if (tipo === 'EMPEDRADO') {
      score -= 5;
    }

    // Transporte
    if (distanciaTransportePublicoM > 1000) {
      score -= 15;
      carencias.push(`Transporte público lejano (${distanciaTransportePublicoM}m).`);
    }

    let categoria = 'CONSOLIDADO_ALTA_COBERTURA';
    if (score < 50) categoria = 'RURAL_SUBEQUIPADO';
    else if (score < 80) categoria = 'EN_DESARROLLO';

    return {
      score,
      categoria,
      carencias,
      cuentaConLuzInmediata: distanciaRedElectricaANDE_M <= 50,
      cuentaConAguaInmediata: distanciaRedAguaESSAP_M <= 50,
      tipoCalzada: tipo
    };
  }

  /**
   * Análisis de Pendiente y Escurrimiento Pluvial.
   * @param {number} pendientePct - Pendiente del terreno en porcentaje
   * @returns {Object} Clasificación topográfica y susceptibilidad hídrica
   */
  static analizarPendienteRiesgo(pendientePct) {
    let clasificacion = 'PLANO';
    let riesgoInundabilidad = 'BAJO';
    let recomendacion = 'Apto para construcción convencional.';

    if (pendientePct < 1.0) {
      clasificacion = 'MUY_PLANO';
      riesgoInundabilidad = 'ALTO_ENCHARCAMIENTO';
      recomendacion = 'Requiere verificar cota de escorrentía pluvial y zanja de drenaje.';
    } else if (pendientePct <= 5.0) {
      clasificacion = 'SUAVE_OPTIMO';
      riesgoInundabilidad = 'BAJO';
      recomendacion = 'Pendiente óptima para evacuación natural de pluviales.';
    } else if (pendientePct <= 15.0) {
      clasificacion = 'MODERADO';
      riesgoInundabilidad = 'NULO';
      recomendacion = 'Requiere aterrazamiento o fundaciones escalonadas.';
    } else {
      clasificacion = 'ABRUPTO_ESCARPADO';
      riesgoInundabilidad = 'RIESGO_EROSION_DESLIZAMIENTO';
      recomendacion = 'Requiere muros de contención y estudio de mecánica de suelos.';
    }

    return {
      pendientePct,
      clasificacion,
      riesgoInundabilidad,
      recomendacion
    };
  }

  /**
   * Comparador Comercial: Valor de Mercado vs. Valor Fiscal Oficial.
   */
  static compararValorFiscalVsMercado({ valorFiscalM2Gs, valorMercadoM2Gs, superficieM2 }) {
    if (!valorFiscalM2Gs || !valorMercadoM2Gs || !superficieM2) {
      throw new Error('Parámetros incompletos para comparación de valores');
    }

    const valorFiscalTotalGs = Math.round(valorFiscalM2Gs * superficieM2);
    const valorMercadoTotalGs = Math.round(valorMercadoM2Gs * superficieM2);
    const ratioMercadoFiscal = Number((valorMercadoM2Gs / valorFiscalM2Gs).toFixed(2));
    const plusvaliaEstimadaGs = Math.max(0, valorMercadoTotalGs - valorFiscalTotalGs);

    return {
      superficieM2,
      valorFiscalM2Gs,
      valorMercadoM2Gs,
      valorFiscalTotalGs,
      valorMercadoTotalGs,
      ratioMercadoFiscal,
      plusvaliaEstimadaGs,
      observacion: ratioMercadoFiscal > 1.0
        ? `El valor comercial supera al valor fiscal en ${((ratioMercadoFiscal - 1) * 100).toFixed(0)}%. Base imponible según el mayor valor.`
        : 'Valor comercial igual o inferior al fiscal.'
    };
  }
}

if (typeof window !== 'undefined') {
  window.UrbanismoModule = UrbanismoModule;
}

export default UrbanismoModule;
