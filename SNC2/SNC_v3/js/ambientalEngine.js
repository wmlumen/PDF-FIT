/**
 * ambientalEngine.js — Evaluación de restricciones ambientales (Fase 11, M-1)
 *
 * Responde la pregunta que docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md
 * y la propuesta del usuario plantearon: antes de aprobar un fraccionamiento o
 * una mensura, ¿la geometría propuesta cae dentro de una restricción ambiental
 * real (humedal, faja ribereña, reserva, radio de vertedero, zona inundable)?
 *
 * Principio (mismo que js/vepMetrics.js): el resultado sale de una
 * intersección espacial real contra filas de `restricciones_ambientales`
 * cargadas por un administrador — nunca de una regla hardcodeada ni de un
 * valor inventado. Sin restricciones activas cargadas, todo da "apto" (no
 * "no evaluable"): es la ausencia real de datos, no un error.
 *
 * Entorno: cliente (navegador) y también importado desde server-api.js para
 * evaluar al guardar un fraccionamiento — mismo patrón que js/vepMetrics.js
 * y js/topologyRepair.js: las funciones espaciales reciben `turfApi` por
 * parámetro, no importan `@turf/turf` ellas mismas.
 */

export const NIVELES_RESTRICCION = Object.freeze({
  BLOQUEA: 'BLOQUEA',
  CONDICIONA: 'CONDICIONA'
});

export const RESULTADOS = Object.freeze({
  APTO: 'apto',
  CONDICIONADO: 'condicionado',
  NO_APTO: 'no_apto'
});

function comoFeature(geometriaOFeature, turfApi) {
  if (!geometriaOFeature) return null;
  if (geometriaOFeature.type === 'Feature') return geometriaOFeature;
  if (geometriaOFeature.type === 'FeatureCollection') return geometriaOFeature.features[0] || null;
  return turfApi.feature(geometriaOFeature);
}

/**
 * @param {Object} geometriaConsulta - Feature/Geometry GeoJSON de la parcela o fracción a evaluar
 * @param {Array} restricciones - filas de `restricciones_ambientales` (geojson como string o ya parseado)
 * @param {Object} turfApi - instancia de @turf/turf
 * @returns {{ resultado: 'apto'|'condicionado'|'no_apto', afectaciones: Array }}
 */
export function evaluarRestriccionesAmbientales(geometriaConsulta, restricciones = [], turfApi) {
  const consulta = comoFeature(geometriaConsulta, turfApi);
  if (!consulta) return { resultado: RESULTADOS.APTO, afectaciones: [], motivo: 'sin geometría para evaluar' };

  const afectaciones = [];
  for (const restriccion of restricciones) {
    let geomRestriccion;
    try {
      geomRestriccion = typeof restriccion.geojson === 'string' ? JSON.parse(restriccion.geojson) : restriccion.geojson;
    } catch { continue; }
    const featureRestriccion = comoFeature(geomRestriccion, turfApi);
    if (!featureRestriccion) continue;

    let areaEvaluada = featureRestriccion;
    const bufferMetros = Number(restriccion.buffer_metros);
    if (Number.isFinite(bufferMetros) && bufferMetros > 0) {
      try { areaEvaluada = turfApi.buffer(featureRestriccion, bufferMetros, { units: 'meters' }); }
      catch { continue; }
    }

    let intersecta = false;
    try { intersecta = !!turfApi.intersect(turfApi.featureCollection([consulta, areaEvaluada])); }
    catch { intersecta = false; }

    if (intersecta) {
      afectaciones.push({
        id: restriccion.id,
        tipo: restriccion.tipo,
        nombre: restriccion.nombre || null,
        fuente: restriccion.fuente || null,
        nivel_restriccion: restriccion.nivel_restriccion,
        buffer_metros: Number.isFinite(bufferMetros) && bufferMetros > 0 ? bufferMetros : null
      });
    }
  }

  const bloquea = afectaciones.some(a => a.nivel_restriccion === NIVELES_RESTRICCION.BLOQUEA);
  const condiciona = afectaciones.some(a => a.nivel_restriccion === NIVELES_RESTRICCION.CONDICIONA);
  const resultado = bloquea ? RESULTADOS.NO_APTO : (condiciona ? RESULTADOS.CONDICIONADO : RESULTADOS.APTO);
  return { resultado, afectaciones };
}
