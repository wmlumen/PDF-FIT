/**
 * moduleRegistry.js
 * -----------------------------------------------------------
 * Sistema de módulos para SNC_v3.
 * Permite activar módulos (medición, planos, reportes, etc.)
 * a cualquier perfil: principal, municipal, ciudadano, admin.
 *
 * Cada módulo se define con:
 *   - id, label, description, icon
 *   - profiles: lista de perfiles que lo pueden activar
 *   - files: html, js, css
 *
 * Uso:
 *   const mods = getActiveModules('municipal');
 *   // => devuelve los módulos activos para el perfil 'municipal'
 *
 * Incluir en el HTML:
 *   <script src="/js/modules/moduleRegistry.js"></script>
 *   <script>
 *     const perfil = window.APP_PROFILE || 'principal';
 *     const mods = getActiveModules(perfil);
 *     // para cada módulo: crear botón + cargar html/js+css
 *   </script>
 * -----------------------------------------------------------
 */

/* -------------------------------------------------------------------------- *
 * REGISTRO DE MÓDULOS
 * -------------------------------------------------------------------------- */

export const MODULE_REGISTRY = {
  surveyModule: {
    id: 'surveyModule',
    label: 'Ingreso y Medición',
    description: 'Ingreso de datos de campo y medición de parcelas',
    icon: 'survey',
    defaultOn: true,
    profiles: ['principal', 'municipal', 'ciudadano', 'admin']
  },

  planModule: {
    id: 'planModule',
    label: 'Generación de Planos',
    description: 'Plano planimétrico, altimétrico y exportación de documentos',
    icon: 'layers',
    defaultOn: true,
    profiles: ['municipal', 'admin']
  },

  reportModule: {
    id: 'reportModule',
    label: 'Reportes y Certificados',
    description: 'Certificados, informes y firma electrónica',
    icon: 'file-text',
    defaultOn: true,
    profiles: ['municipal', 'admin']
  },

  fieldModule: {
    id: 'fieldModule',
    label: 'Campo (Offline)',
    description: 'Captura de métricas en el terreno sin conexión',
    icon: 'navigation',
    defaultOn: true,
    profiles: ['municipal', 'admin']
  },

  envModule: {
    id: 'envModule',
    label: 'Ambiental y Tasación',
    description: 'Estudios ambientales, tasación e integración de datos',
    icon: 'cloud',
    defaultOn: true,
    profiles: ['municipal', 'admin']
  },

  analyticsModule: {
    id: 'analyticsModule',
    label: 'Métricas y Analítica',
    description: 'Indicadores, métricas y reportes ejecutivos',
    icon: 'chart',
    defaultOn: true,
    profiles: ['municipal', 'admin']
  }
};

/* -------------------------------------------------------------------------- *
 * ACTIVACIÓN POR PERFIL
 * -------------------------------------------------------------------------- */

/**
 * Devuelve los módulos activos para un perfil.
 * Por defecto incluye survey, plan, report; admite perfiles que añadan modulos.
 */
export function getActiveModules(perfil = 'principal') {
  const map = {
    principal: ['surveyModule', 'planModule', 'reportModule'],
    municipal: ['surveyModule', 'planModule', 'reportModule', 'fieldModule', 'envModule', 'analyticsModule'],
    ciudadano: ['surveyModule', 'reportModule'],
    admin: ['surveyModule', 'planModule', 'reportModule', 'fieldModule', 'envModule', 'analyticsModule']
  };
  return map[perfil] || map.principal;
}

/**
 * Devuelve la metadata de un módulo.
 */
export function getModuleMeta(id) {
  return MODULE_REGISTRY[id] || null;
}

/**
 * Verifica si un módulo puede activarse para un perfil.
 */
export function canActivate(profile, moduleId) {
  const meta = getModuleMeta(moduleId);
  if (!meta) return false;
  return meta.profiles.includes(profile);
}

/**
 * Devuelve el nombre de la carpeta de un módulo.
 */
export function getModulePath(id) {
  const map = {
    surveyModule: 'surveyModule',
    planModule: 'planModule',
    reportModule: 'reportModule',
    fieldModule: 'fieldModule',
    envModule: 'envModule',
    analyticsModule: 'analyticsModule'
  };
  return map[id] || id;
}
