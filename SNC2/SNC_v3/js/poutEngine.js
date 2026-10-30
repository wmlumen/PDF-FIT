/**
 * poutEngine.js — Compatibilidad de uso de suelo contra el POUT (Fase 11, M-2)
 *
 * Responde: dada una geometría propuesta (fraccionamiento, mensura, proyecto) y
 * un uso de suelo que el usuario quiere darle, ¿es compatible con la
 * zonificación real del municipio?
 *
 * Fuente de los datos: docs/pout-manuales/ (POUT oficiales del AMA, compartidos
 * por el usuario) — `usos_suelo` es el catálogo de 13 zonas normativas
 * transcrito de docs/pout-manuales/generador/_pout_modelo.py, y `zonas_pout`
 * son los polígonos reales de cada municipio, cargados desde los shapefiles
 * oficiales con scripts/import-pout-zonas.mjs (ver ese script para qué
 * municipios están cargados).
 *
 * Principio (mismo que js/ambientalEngine.js y js/vepMetrics.js): el resultado
 * sale de datos reales, nunca de una regla inventada. Una zona del shapefile
 * sin `codigo_zona` mapeado al catálogo de 13 zonas (p. ej. "Casco histórico",
 * "Subestación de 220KV" — ver nota en db.cjs) no se clasifica como apta ni
 * como no apta: se marca `sin_catalogo`, explícitamente.
 *
 * El matching entre el "uso propuesto" (texto libre que escribe el usuario,
 * p. ej. "Comercios y servicios de mediana escala") y las listas
 * uso_permitido/uso_condicionado/usos_no_permitidos de cada zona (también
 * texto, tomado literal de la normativa) es por coincidencia de substring,
 * no un clasificador semántico — es una limitación conocida, documentada acá
 * y en PLAN_FASE11_BACKLOG.md, no escondida.
 *
 * Entorno: cliente y también importado desde server-api.js — mismo patrón de
 * turf inyectado que el resto de los motores espaciales de Fase 11.
 */

export const RESULTADOS_POUT = Object.freeze({
  APTO: 'apto',
  CONDICIONADO: 'condicionado',
  NO_APTO: 'no_apto',
  SIN_ZONIFICACION: 'sin_zonificacion'
});

function comoFeature(geometriaOFeature, turfApi) {
  if (!geometriaOFeature) return null;
  if (geometriaOFeature.type === 'Feature') return geometriaOFeature;
  if (geometriaOFeature.type === 'FeatureCollection') return geometriaOFeature.features[0] || null;
  return turfApi.feature(geometriaOFeature);
}

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .trim();
}

function parseListaUsos(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function coincideUso(listaUsos, usoPropuesto) {
  const propuesto = normalizar(usoPropuesto);
  if (!propuesto) return false;
  return listaUsos.some(u => {
    const candidato = normalizar(u);
    return candidato.includes(propuesto) || propuesto.includes(candidato);
  });
}

function geometriaIntersecta(consulta, featureZona, turfApi) {
  // turf.intersect exige polígono contra polígono; para un Point (el caso mas
  // comun al consultar "en que zona cae este predio") hay que usar
  // booleanPointInPolygon en su lugar, o el intersect falla/ignora en
  // silencio y todo da "sin_zonificacion" aunque el punto si este adentro.
  const tipo = consulta.geometry?.type;
  try {
    if (tipo === 'Point') return turfApi.booleanPointInPolygon(consulta, featureZona);
    return !!turfApi.intersect(turfApi.featureCollection([consulta, featureZona]));
  } catch { return false; }
}

/**
 * Encuentra qué zonas POUT (filas de `zonas_pout`) intersectan la geometría
 * consultada. No requiere `usoPropuesto` — sirve también para mostrar "en qué
 * zona cae esta parcela" sin evaluar compatibilidad. Acepta un Point (el caso
 * típico de consulta puntual) o un Polygon/MultiPolygon (una fracción propuesta).
 */
export function encontrarZonasAfectadas(geometriaConsulta, zonasPout = [], turfApi) {
  const consulta = comoFeature(geometriaConsulta, turfApi);
  if (!consulta) return [];
  const afectadas = [];
  for (const zona of zonasPout) {
    let geomZona;
    try { geomZona = typeof zona.geojson === 'string' ? JSON.parse(zona.geojson) : zona.geojson; }
    catch { continue; }
    const featureZona = comoFeature(geomZona, turfApi);
    if (!featureZona) continue;
    if (geometriaIntersecta(consulta, featureZona, turfApi)) afectadas.push(zona);
  }
  return afectadas;
}

/**
 * @param {Object} geometriaConsulta - Feature/Geometry GeoJSON a evaluar
 * @param {Array} zonasPout - filas de `zonas_pout` (del municipio correspondiente)
 * @param {Array} usosSuelo - filas de `usos_suelo` (catálogo completo)
 * @param {string} usoPropuesto - texto libre, p. ej. "Vivienda unifamiliar"
 * @param {Object} turfApi
 */
export function evaluarCompatibilidadUso(geometriaConsulta, zonasPout = [], usosSuelo = [], usoPropuesto, turfApi) {
  const zonasAfectadas = encontrarZonasAfectadas(geometriaConsulta, zonasPout, turfApi);
  if (!zonasAfectadas.length) {
    return {
      resultado: RESULTADOS_POUT.SIN_ZONIFICACION,
      motivo: 'la geometría no cae dentro de ninguna zona POUT cargada para este municipio',
      zonas: []
    };
  }

  const detalle = zonasAfectadas.map(zona => {
    const catalogo = usosSuelo.find(u => u.codigo === zona.codigo_zona);
    if (!zona.codigo_zona || !catalogo) {
      return {
        zona_fuente: zona.nombre_zona_fuente || null,
        codigo_zona: zona.codigo_zona || null,
        clasificacion: 'sin_catalogo',
        motivo: 'esta zona del shapefile no tiene un código normativo mapeado al catálogo de usos_suelo'
      };
    }
    const permitido = parseListaUsos(catalogo.uso_permitido);
    const condicionado = parseListaUsos(catalogo.uso_condicionado);
    const noPermitido = parseListaUsos(catalogo.usos_no_permitidos);
    let clasificacion;
    if (coincideUso(noPermitido, usoPropuesto)) clasificacion = 'no_apto';
    else if (coincideUso(condicionado, usoPropuesto)) clasificacion = 'condicionado';
    else if (coincideUso(permitido, usoPropuesto)) clasificacion = 'apto';
    else clasificacion = 'no_especificado';
    return {
      zona_fuente: zona.nombre_zona_fuente || null,
      codigo_zona: catalogo.codigo,
      nombre_zona: catalogo.nombre,
      clasificacion
    };
  });

  const peorCaso = detalle.some(d => d.clasificacion === 'no_apto')
    ? RESULTADOS_POUT.NO_APTO
    : detalle.some(d => ['condicionado', 'sin_catalogo', 'no_especificado'].includes(d.clasificacion))
      ? RESULTADOS_POUT.CONDICIONADO
      : RESULTADOS_POUT.APTO;

  return { resultado: peorCaso, zonas: detalle };
}
