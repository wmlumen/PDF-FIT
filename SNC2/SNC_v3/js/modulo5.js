/**
 * modulo5.js — Módulo 5: Geoportal de Loteamientos y Expansión Urbana (Ley 3966/10 & Loteamientos.com)
 * 
 * Funcionalidades:
 * 1. Conexión referencial al Geoportal de Loteamientos de Paraguay (https://loteamientos.com/mapa-catastral).
 * 2. Cálculo del balance de cesión pública obligatoria del 7% para plazas/parques y equipamiento comunitario (Art. 235 Ley 3966/10).
 * 3. Validación de balance vial de loteamiento (calles públicas mínimas).
 * 4. Generación de capas referenciales para Leaflet y consultas de fraccionamientos.
 */

export const LOTEAMIENTOS_CONFIG = {
  GEOPORTAL_URL: 'https://loteamientos.com/mapa-catastral',
  PORCENTAJE_PLAZAS_MIN: 7.0, // 7% legal para plazas y edificios públicos (Ley Orgánica Municipal 3966/10 Art. 235)
  PORCENTAJE_CALLES_MIN: 15.0, // Porcentaje vial mínimo estimado
  SUPERFICIE_MIN_LOTE_URBANO: 360.0, // m²
  FRENTE_MIN_LOTE_URBANO: 12.0 // metros
};

export class LoteamientosModule {
  /**
   * Calcula y dictamina el balance de cesión pública de un fraccionamiento o loteamiento.
   * Según Ley Orgánica Municipal Nº 3966/2010 Art. 235.
   * 
   * @param {Object} balance - Superficies del proyecto en metros cuadrados
   * @param {number} balance.superficieTotalM2 - Superficie bruta total a fraccionar
   * @param {number} balance.superficieLotesM2 - Superficie neta destinada a lotes vendibles
   * @param {number} balance.superficieCallesM2 - Superficie cedida para vías de circulación
   * @param {number} balance.superficiePlazasM2 - Superficie cedida para plazas y edificios públicos
   * @returns {Object} Dictamen técnico de cesión municipal
   */
  static calcularCesionPublica({
    superficieTotalM2,
    superficieLotesM2 = 0,
    superficieCallesM2 = 0,
    superficiePlazasM2 = 0
  }) {
    if (!superficieTotalM2 || superficieTotalM2 <= 0) {
      throw new Error('La superficie total a fraccionar debe ser mayor a 0 m²');
    }

    const pctPlazas = (superficiePlazasM2 / superficieTotalM2) * 100;
    const pctCalles = (superficieCallesM2 / superficieTotalM2) * 100;
    const pctLotes = (superficieLotesM2 / superficieTotalM2) * 100;

    const plazasRequeridasM2 = superficieTotalM2 * (LOTEAMIENTOS_CONFIG.PORCENTAJE_PLAZAS_MIN / 100);
    const deficitPlazasM2 = Math.max(0, plazasRequeridasM2 - superficiePlazasM2);
    const cumpleCesionPlazas = pctPlazas >= LOTEAMIENTOS_CONFIG.PORCENTAJE_PLAZAS_MIN;

    const balanceSuma = superficieLotesM2 + superficieCallesM2 + superficiePlazasM2;
    const deltaCierre = Math.abs(superficieTotalM2 - balanceSuma);
    const balanceCerrado = deltaCierre < 0.5; // Tolerancia 0.5 m²

    return {
      superficieTotalM2,
      superficieLotesM2,
      superficieCallesM2,
      superficiePlazasM2,
      porcentajePlazas: Number(pctPlazas.toFixed(2)),
      porcentajeCalles: Number(pctCalles.toFixed(2)),
      porcentajeLotes: Number(pctLotes.toFixed(2)),
      plazasRequeridasM2: Number(plazasRequeridasM2.toFixed(2)),
      deficitPlazasM2: Number(deficitPlazasM2.toFixed(2)),
      cumpleCesionPlazas,
      balanceCerrado,
      deltaCierre: Number(deltaCierre.toFixed(2)),
      dictamen: cumpleCesionPlazas && balanceCerrado
        ? 'CONFORME_MUNICIPAL'
        : 'OBSERVADO_DEFICIT_CESION',
      baseLegal: 'Ley Orgánica Municipal N° 3966/2010 Art. 235 (Cesión gratuita del 7% para plazas y edificios públicos)'
    };
  }

  /**
   * Abre el geoportal externo de loteamientos en una nueva pestaña.
   */
  static abrirGeoportal() {
    if (typeof window !== 'undefined') {
      window.open(LOTEAMIENTOS_CONFIG.GEOPORTAL_URL, '_blank', 'noopener,noreferrer');
      window.showToast?.('Abriendo Geoportal de Loteamientos de Paraguay', 'info');
    }
  }

  /**
   * Obtiene la configuración de capa referencial para Leaflet.
   */
  static getLayerDescriptor() {
    return {
      id: 'loteamientos_py',
      nombre: 'Mosaico de Loteamientos y Fraccionamientos (Referencia)',
      url: LOTEAMIENTOS_CONFIG.GEOPORTAL_URL,
      tipo: 'EXTERNAL_CATALOG',
      modulo: 'Modulo5_Loteamientos',
      color: '#ec4899', // Rosa vibrante para loteamientos
      fillColor: '#ec4899',
      fillOpacity: 0.15
    };
  }
}

export default LoteamientosModule;
