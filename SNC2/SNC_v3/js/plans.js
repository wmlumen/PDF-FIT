/**
 * Lógica de planes y límites por usuario/proyecto
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'GS',
    type: 'free',
    active: true,
    limits: {
      projects: 1,
      expedientesPerProject: 2,
      parcelasPorExpediente: 500,
      exportacionesPorDia: 3
    },
    features: [
      'Acceso básico a catastro',
      'Exportación Shapefile/KML/GeoJSON',
      'Derrotero básico'
    ],
    watermark: true
  },
  directorio: {
    id: 'directorio',
    name: 'Ficha Directorio',
    price: 10000,
    currency: 'GS',
    type: 'paid',
    active: true,
    limits: {
      projects: 1,
      expedientesPerProject: 2,
      parcelasPorExpediente: 500,
      exportacionesPorDia: 3
    },
    features: [
      'Inclusión en directorio público',
      'Ficha comercial básica',
      'Visibilidad en búsquedas'
    ],
    watermark: false
  },
  links: {
    id: 'links',
    name: 'Links WhatsApp / Redes',
    price: 15000,
    currency: 'GS',
    type: 'paid',
    active: true,
    limits: {
      projects: 1,
      expedientesPerProject: 2,
      parcelasPorExpediente: 500,
      exportacionesPorDia: 3
    },
    features: [
      'Link de WhatsApp destacado',
      'Vinculación a redes sociales',
      'Panel de contacto directo'
    ],
    watermark: false
  },
  publicacion: {
    id: 'publicacion',
    name: 'Publicación mensual',
    price: 20000,
    currency: 'GS',
    type: 'paid',
    active: true,
    limits: {
      projects: 2,
      expedientesPerProject: 5,
      parcelasPorExpediente: 1000,
      exportacionesPorDia: 10
    },
    features: [
      'Publicación mensual en portal',
      'Estadísticas de visualización',
      'Soporte básico'
    ],
    watermark: false
  },
  destacado: {
    id: 'destacado',
    name: 'Anuncio destacado',
    price: 30000,
    currency: 'Gs',
    type: 'paid',
    active: true,
    limits: {
      projects: 5,
      expedientesPerProject: 20,
      parcelasPorExpediente: 5000,
      exportacionesPorDia: 50
    },
    features: [
      'Anuncio destacado en portal',
      'Mayor alcance en Remansito/Villa Hayes',
      'Soporte prioritario'
    ],
    watermark: false
  },
  dominio: {
    id: 'dominio',
    name: 'Dominio anual',
    price: 100000,
    currency: 'GS',
    type: 'paid',
    active: true,
    limits: {
      projects: 9999,
      expedientesPerProject: 9999,
      parcelasPorExpediente: 999999,
      exportacionesPorDia: 999999
    },
    features: [
      'Dominio propio por 12 meses',
      'Portal con marca propia',
      'Soporte 24/7',
      'Acceso avanzado a servicios'
    ],
    watermark: false
  }
};

export function resolvePlan(planId) {
  return PLANS[planId] || PLANS.free;
}

export function canCreateProject(userPlan, currentCount) {
  const limits = resolvePlan(userPlan).limits;
  return currentCount < limits.projects;
}

export function canCreateExpediente(userPlan, currentCount) {
  const limits = resolvePlan(userPlan).limits;
  return currentCount < limits.expedientesPerProject;
}

export function canExport(userPlan, exportsToday) {
  const limits = resolvePlan(userPlan).limits;
  return exportsToday < limits.exportacionesPorDia;
}

export function getWatermark(planId) {
  return resolvePlan(planId).watermark;
}

const ROLE_CAPABILITIES = {
  admin: ['administracion_total', 'gestion_usuarios', 'gestion_planes', 'capas_referencia', 'certificacion', 'exportacion'],
  manager: ['gestion_proyectos', 'certificacion', 'exportacion', 'capas_referencia', 'validacion'],
  professional: ['certificacion', 'exportacion', 'validacion', 'capas_referencia'],
  technician: ['validacion', 'exportacion', 'consulta'],
  member: ['consulta', 'edicion_basica'],
  viewer: ['consulta']
};

export function getRoleCapabilities(role) {
  return ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.viewer;
}

export function getPlanFeatures(planId) {
  return resolvePlan(planId).features || [];
}

export function getPlanType(planId) {
  return resolvePlan(planId).type;
}
