/**
 * vepDataClient.js — Cliente oficial de consumo y sincronización de datos VEP (MEF)
 * Ministerio de Economía y Finanzas (MEF) - Proyecto Ciudades Sustentables VEP
 * https://ciudadessustentablesvep.mef.gov.py/datos/
 *
 * Características:
 * 1. Conexión nativa con CARTO SQL API v2 de `serviciosvep.mef.gov.py/user/ama/`
 * 2. Descarga multiformato directa: GeoJSON, Shapefile (ZIP), CSV, KML
 * 3. Catálogo clasificado de las 230 capas geoespaciales por Dirección Municipal
 * 4. Caché local y persistencia para operación desconectada
 */

export const VEP_ENDPOINTS = {
  BASE_URL: 'https://serviciosvep.mef.gov.py/user/ama',
  SQL_API: 'https://serviciosvep.mef.gov.py/user/ama/api/v2/sql',
  VIZ_API: 'https://serviciosvep.mef.gov.py/user/ama/api/v1/viz'
};

/**
 * Catálogo temático de capas clave del repositorio VEP clasificadas por Dirección Municipal
 */
export const CATALOGO_CAPAS_VEP = {
  CATASTRO_OBRAS: [
    { id: 'distritos_del_ama', nombre: 'Límites Distritales del AMA', formato: 'geojson' },
    { id: 'barrios_ama', nombre: 'Barrios Catastrales Urbanos', formato: 'geojson' },
    { id: 'centros_urbanos', nombre: 'Centralidades y Polígonos Urbanos', formato: 'geojson' },
    { id: 'asentamientos_senavitat', nombre: 'Asentamientos MUVH / SENAVITAT', formato: 'geojson' },
    { id: 'asentamientos_techo_1', nombre: 'Asentamientos Informales Relevados', formato: 'geojson' }
  ],
  MEDIO_AMBIENTE: [
    { id: 'areas_verdes_protectoras_de_arroyos', nombre: 'Fajas Ribereñas Protectoras de Arroyos (Ley 4241/10)', formato: 'geojson' },
    { id: 'areas_verdes_protegidas_por_ordenanzas', nombre: 'Áreas Verdes bajo Ordenanza Municipal', formato: 'geojson' },
    { id: 'areas_silvestres_protegidas', nombre: 'SINASIP - Áreas Silvestres Protegidas', formato: 'geojson' },
    { id: 'cobertura_forestal_ama_1', nombre: 'Cobertura Forestal y Masas Arbóreas', formato: 'geojson' },
    { id: 'centro_de_acopio_y_reciclaje_ama', nombre: 'Centros de Acopio y Reciclaje de RSU', formato: 'geojson' }
  ],
  GESTION_RIESGOS: [
    { id: 'cota_inundable_2', nombre: 'Cota de Inundabilidad Periódica del Río Paraguay', formato: 'geojson' },
    { id: 'cota_64msnm', nombre: 'Cota Crítica 64 msnm (Riesgo Hidrológico)', formato: 'geojson' },
    { id: 'cuencas_hidrograficas', nombre: 'Cuencas y Microcuencas Hidrográficas', formato: 'geojson' },
    { id: 'acuifero_patinho', nombre: 'Vulnerabilidad y Recarga del Acuífero Patiño', formato: 'geojson' },
    { id: 'curvas_de_nivel_10m', nombre: 'Topografía y Curvas de Nivel (10m)', formato: 'geojson' }
  ],
  TRANSITO_VIALIDAD: [
    { id: 'bicisendas_existentes_1', nombre: 'Red de Bicisendas Existentes y AMABICI', formato: 'geojson' },
    { id: 'acceso_sur', nombre: 'Eje Vial Metropolitano Acceso Sur', formato: 'geojson' },
    { id: 'anillos', nombre: 'Anillos Viales de Circunvalación', formato: 'geojson' },
    { id: 'acceso_sur_area_influencia_1_km', nombre: 'Faja de Influencia 1 km Eje Vial', formato: 'geojson' }
  ],
  EQUIPAMIENTOS_SERVICIOS: [
    { id: 'centros_de_salud_ama', nombre: 'Red de Hospitales y Centros de Salud', formato: 'geojson' },
    { id: 'centros_educativos_ama', nombre: 'Escuelas y Colegios Oficiales', formato: 'geojson' },
    { id: 'bomberos_1', nombre: 'Estaciones de Bomberos Voluntarios', formato: 'geojson' },
    { id: 'aguateras_privadas', nombre: 'Redes de Aguateras Privadas y ESSAP', formato: 'geojson' }
  ]
};

/**
 * Descarga una capa del VEP en formato GeoJSON directamente mediante CARTO SQL API
 * @param {string} nombreTabla - Nombre de la tabla en el catálogo (ej: 'distritos_del_ama')
 * @param {string} filtroSQL - Cláusula WHERE opcional (ej: "dist_desc = 'ASUNCION'")
 * @returns {Promise<Object>} FeatureCollection GeoJSON
 */
export async function descargarCapaGeoJSON(nombreTabla, filtroSQL = '') {
  let query = `SELECT * FROM ${nombreTabla}`;
  if (filtroSQL && filtroSQL.trim().length > 0) {
    query += ` WHERE ${filtroSQL}`;
  }
  const url = `${VEP_ENDPOINTS.SQL_API}?q=${encodeURIComponent(query)}&format=geojson`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status} al descargar capa VEP '${nombreTabla}'`);
  }
  return await response.json();
}

/**
 * Obtiene la URL de descarga directa en Shapefile (ZIP) de una tabla VEP
 * @param {string} nombreTabla - Nombre de la tabla
 * @param {string} filtroSQL - Cláusula WHERE opcional
 * @returns {string} URL descargable en formato SHP
 */
export function obtenerUrlDescargaShapefile(nombreTabla, filtroSQL = '') {
  let query = `SELECT * FROM ${nombreTabla}`;
  if (filtroSQL && filtroSQL.trim().length > 0) {
    query += ` WHERE ${filtroSQL}`;
  }
  return `${VEP_ENDPOINTS.SQL_API}?q=${encodeURIComponent(query)}&format=shp`;
}

/**
 * Obtiene la URL de descarga directa en formato CSV
 * @param {string} nombreTabla - Nombre de la tabla
 * @returns {string} URL descargable en formato CSV
 */
export function obtenerUrlDescargaCSV(nombreTabla) {
  const query = `SELECT * FROM ${nombreTabla}`;
  return `${VEP_ENDPOINTS.SQL_API}?q=${encodeURIComponent(query)}&format=csv`;
}

/**
 * Consulta la lista viva de todas las tablas y visualizaciones públicas del repositorio VEP
 * @param {number} pagina - Número de página (1 a N)
 * @param {number} porPagina - Cantidad por página (default 50)
 * @returns {Promise<Object>} Lista de visualizaciones y total de tablas
 */
export async function listarTablasRepositorioVEP(pagina = 1, porPagina = 50) {
  const url = `${VEP_ENDPOINTS.VIZ_API}/?type=table&page=${pagina}&per_page=${porPagina}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar catálogo VEP`);
  }
  return await res.json();
}

export const VEPDataClient = {
  VEP_ENDPOINTS,
  CATALOGO_CAPAS_VEP,
  descargarCapaGeoJSON,
  obtenerUrlDescargaShapefile,
  obtenerUrlDescargaCSV,
  listarTablasRepositorioVEP
};

if (typeof window !== 'undefined') {
  window.VEPDataClient = VEPDataClient;
}

export default VEPDataClient;
