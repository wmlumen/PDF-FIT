/**
 * madesService.js — Módulo 7: Geoportal Ambiental e Hidrológico MADES (SIAM + SIAGUA + OGC)
 * 
 * Conexión e interoperabilidad con:
 * - SIAM: https://apps.mades.gov.py/siam/portal/mapas
 * - SIAGUA: https://siaguapy.mades.gov.py/alertas-hidrologicas
 * - GeoServer WMS/WFS: https://geoportal.mades.gov.py/geoserver/
 * 
 * Cumplimiento de:
 * - Ley N° 352/1994 de Áreas Silvestres Protegidas (SINASIP)
 * - Ley N° 3239/2007 de los Recursos Hídricos del Paraguay (Franja de 30m de protección)
 * - Ley N° 4241/2010 de Restablecimiento de Bosques Protectores de Cauces Hídricos
 */

export const MADES_PORTALES = {
  SIAM_MAPAS: 'https://apps.mades.gov.py/siam/portal/mapas',
  SIAGUA_ALERTAS: 'https://siaguapy.mades.gov.py/alertas-hidrologicas',
  SIAGUA_HOME: 'https://siaguapy.mades.gov.py/',
  GEOSERVER_WMS: 'https://geoportal.mades.gov.py/geoserver/wms',
  GEOSERVER_WFS: 'https://geoportal.mades.gov.py/geoserver/wfs'
};

export const MADES_CAPAS = {
  sinasip: {
    id: 'mades_sinasip',
    nombre: 'Áreas Silvestres Protegidas (SINASIP)',
    tipo: 'PARQUE_SINASIP',
    color: '#059669', // Verde esmeralda
    bufferM: 0,
    baseLegal: 'Ley N° 352/1994 de Áreas Silvestres Protegidas'
  },
  hidrografia: {
    id: 'mades_hidro',
    nombre: 'Cauces Hídricos y Franja de Protección (30m)',
    tipo: 'FRANJA_HIDRICA',
    color: '#0284c7', // Azul cielo
    bufferM: 30.0,
    baseLegal: 'Ley N° 3239/2007 Recursos Hídricos & Ley 4241/2010'
  },
  alertas_siagua: {
    id: 'mades_alertas',
    nombre: 'Alertas Hidrológicas e Inundabilidad (SIAGUA)',
    tipo: 'ALERTA_HIDRO',
    color: '#f97316', // Naranja alerta
    bufferM: 0,
    baseLegal: 'Sistema de Información de Aguas del Paraguay (SIAGUA)'
  }
};

const CACHE_KEY_MADES = 'snc_mades_cache_v1';
const activeMadesLayers = new Map();

export class MadesService {
  /**
   * Abre el portal SIAM oficial de mapas ambientales.
   */
  static abrirSiam() {
    if (typeof window !== 'undefined') {
      window.open(MADES_PORTALES.SIAM_MAPAS, '_blank', 'noopener,noreferrer');
      window.showToast?.('Abriendo Portal SIAM de Mapas Ambientales (MADES)', 'info');
    }
  }

  /**
   * Abre el portal SIAGUA oficial de alertas hidrológicas y cuencas.
   */
  static abrirSiagua() {
    if (typeof window !== 'undefined') {
      window.open(MADES_PORTALES.SIAGUA_ALERTAS, '_blank', 'noopener,noreferrer');
      window.showToast?.('Abriendo Portal SIAGUA de Alertas Hidrológicas (MADES)', 'info');
    }
  }

  /**
   * Evalúa la afectación ambiental de una parcela con respecto a las restricciones MADES.
   * @param {Object} feature - Feature GeoJSON de la parcela
   * @param {Array<Object>} capasAmbientales - Geometrías de capas de referencia
   * @returns {Object} Diagnóstico de afectación ambiental
   */
  static verificarAfectacionAmbiental(feature, capasAmbientales = []) {
    const afectaciones = [];
    const props = feature?.properties || {};
    const padron = props.PADRON || props.CODIGO || 'PARCELA';

    // Evaluación contra capas pasadas o simuladas
    for (const capa of capasAmbientales) {
      if (capa.tipo === MADES_CAPAS.sinasip.tipo) {
        afectaciones.push({
          tipo: MADES_CAPAS.sinasip.tipo,
          bloqueante: true,
          mensaje: `La parcela ${padron} se superpone con un Área Silvestre Protegida (SINASIP). Trámite bloqueado según Ley 352/94.`,
          baseLegal: MADES_CAPAS.sinasip.baseLegal
        });
      }
      if (capa.tipo === MADES_CAPAS.hidrografia.tipo) {
        afectaciones.push({
          tipo: MADES_CAPAS.hidrografia.tipo,
          bloqueante: false,
          exigeServidumbre: true,
          franjaM: 30.0,
          mensaje: `La parcela ${padron} colinda con cauce hídrico. Requiere respetar servidumbre de protección de 30m según Ley 3239/07.`,
          baseLegal: MADES_CAPAS.hidrografia.baseLegal
        });
      }
    }

    return {
      padron,
      tieneAfectaciones: afectaciones.length > 0,
      bloqueante: afectaciones.some(a => a.bloqueante),
      afectaciones,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Alterna la visualización de una capa MADES en el mapa Leaflet.
   */
  static toggleMadesLayer(map, layerKey, enable) {
    if (!map || typeof L === 'undefined') return;

    if (!enable) {
      if (activeMadesLayers.has(layerKey)) {
        map.removeLayer(activeMadesLayers.get(layerKey));
        activeMadesLayers.delete(layerKey);
      }
      return;
    }

    // Si ya está activa, no duplicar
    if (activeMadesLayers.has(layerKey)) return;

    // Crear capa WMS referencial
    const layerMeta = MADES_CAPAS[layerKey];
    if (!layerMeta) return;

    // Intentar conectar WMS o capa de contingencia
    try {
      const wmsLayer = L.tileLayer.wms(MADES_PORTALES.GEOSERVER_WMS, {
        layers: `mades:${layerKey}`,
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        attribution: '© MADES Geoportal Ambiental',
        opacity: 0.7,
        zIndex: 500,
        pane: 'pane-mades'
      });

      wmsLayer.addTo(map);
      activeMadesLayers.set(layerKey, wmsLayer);
      if (typeof window !== 'undefined') {
        window.showToast?.(`Capa activada: ${layerMeta.nombre}`, 'info');
      }
    } catch (e) {
      console.warn('No se pudo conectar a MADES WMS:', e);
    }
  }

  /**
   * Guarda metadatos en caché local para contingencia si cae el servidor de MADES.
   */
  static guardarCacheContingencia(datos) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CACHE_KEY_MADES, JSON.stringify({
        datos,
        timestamp: Date.now()
      }));
    } catch (_) {}
  }

  /**
   * Recupera metadatos del caché de contingencia.
   */
  static obtenerCacheContingencia() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY_MADES);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.MadesService = MadesService;
}

export default MadesService;
