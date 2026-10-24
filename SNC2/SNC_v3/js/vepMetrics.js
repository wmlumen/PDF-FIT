/**
 * vepMetrics.js — Motor de indicadores municipales (VEP/MEF)
 *
 * Calcula, contra datos reales de SNC_v3, los indicadores que
 * docs/INDICADORES_MUNICIPALES_VEP.md especifica por dirección municipal.
 * Nombrado en el diagrama de ese documento ("Módulo Multifinalitario VEP")
 * pero sin implementación hasta ahora — ver
 * docs/AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md §0 y §1 (paso 5).
 *
 * Principio de este módulo: nunca inventar un número. Un indicador que
 * necesita una fuente que SNC_v3 todavía no integra (recaudación real, censo
 * de población, red vial con ancho/pavimento, patentes comerciales, imágenes
 * satelitales) devuelve `disponible: false` con el motivo exacto, en vez de
 * simular un valor. Los que sí se calculan dejan explícita cualquier
 * aproximación (p. ej. usar el estado de `matriculas` como proxy de "título
 * inscripto" mientras no exista integración real con el Registro Público).
 *
 * Entorno: cliente (navegador), igual que el resto de `js/` — no importa
 * módulos de Node. Las funciones espaciales reciben `turfApi` por parámetro
 * (mismo patrón que js/topologyRepair.js) en vez de importar `@turf/turf`,
 * para poder testearse con node:test sin un bundler.
 */

// Catálogo completo de los 17 indicadores especificados en
// docs/INDICADORES_MUNICIPALES_VEP.md, con el motivo exacto por el que no se
// calculan hoy. Mantenido explícito (no generado) para que agregar la fuente
// real de alguno sea un diff de una línea, no una sorpresa.
export const INDICADORES_NO_DISPONIBLES = {
  'IND-CAT-02': 'Requiere area urbana total y censo de asentamientos de hecho (INE/SENAVITAT) — no integrado en SNC_v3',
  'IND-CAT-03': 'Requiere area cedida para calles por loteamiento vs area bruta de la parcela matriz — no se registra hoy en el flujo de fraccionamiento',
  'IND-CAT-04': 'Requiere area de plazas/edificios publicos cedidos por loteamiento — no se registra hoy en el flujo de fraccionamiento',
  'IND-CAT-05': 'Requiere poblacion estimada por zona (INE) — no integrado en SNC_v3',
  'IND-AMB-01': 'Requiere poblacion urbana total (INE) y capa de espacios verdes publicos (VEP) cargada — no integrado',
  'IND-AMB-02': 'Requiere capa de fajas ribereñas protectoras (VEP/MADES) cargada en el visor para intersectar — calculable con calcularInterseccionEspacial() en cuanto esa capa este disponible',
  'IND-AMB-03': 'Requiere registro de cobertura de recoleccion de RSU por parcela — no integrado en SNC_v3',
  'IND-AMB-04': 'Calculable: ver calcularAfectacionPorBuffer()',
  'IND-RSG-01': 'Requiere capa de cota de inundabilidad (VEP/MEF) cargada en el visor — calculable con calcularInterseccionEspacial() en cuanto esa capa este disponible',
  'IND-RSG-02': 'Requiere capa de pendiente y de red pluvial — no integrado en SNC_v3',
  'IND-RSG-03': 'Requiere capa de fuentes de riesgo tecnologico/incendio — calculable con calcularAfectacionPorBuffer() en cuanto esa capa este disponible',
  'IND-VIA-01': 'Requiere capa de red vial secundaria con ancho por tramo — no integrado en SNC_v3',
  'IND-VIA-02': 'Requiere capa de avenidas colectoras con ancho por tramo — no integrado en SNC_v3',
  'IND-VIA-03': 'Requiere capa de red vial con tipo de pavimento por tramo — no integrado en SNC_v3',
  'IND-VIA-04': 'Requiere capa de bicisendas (AMABICI) y de red vial estructurante — no integrado en SNC_v3',
  'IND-REC-01': 'Requiere el sistema de recaudacion tributaria municipal (emision y cobro del impuesto inmobiliario) — SNC_v3 no lo integra, solo gestiona expedientes catastrales',
  'IND-REC-02': 'Requiere metraje de frente de cada parcela y costo por metro lineal segun ordenanza — no se registra hoy',
  'IND-REC-03': 'Requiere relevamiento de comercios en campo vs. patentes activas — no integrado en SNC_v3'
};

function indicadorNoDisponible(codigo) {
  return { codigo, disponible: false, motivo: INDICADORES_NO_DISPONIBLES[codigo] || 'Fuente de datos no integrada en SNC_v3' };
}

function superficieParcela(parcela) {
  const sup = Number(parcela?.sup_sig_m ?? parcela?.sup_legal);
  return Number.isFinite(sup) ? sup : 0;
}

/**
 * Nivel 1 (Reporting) — único nivel que no depende de ninguna fuente externa:
 * cuenta y suma directamente sobre las parcelas ya sincronizadas por Fase 11
 * (ver GET /api/expedientes/:id/parcelas, o una lista agregada de varios
 * expedientes de un mismo municipio/proyecto).
 * @param {Array} parcelasDetalle - filas de `parcelas` con `matricula` y `propietarios` ya incluidos (shape de GET /api/.../parcelas)
 */
export function calcularReportingBasico(parcelasDetalle = []) {
  const total = parcelasDetalle.length;
  let superficieTotalM2 = 0;
  let conMatriculaVerificada = 0;
  let conMatriculaSinVerificar = 0;
  let sinMatricula = 0;
  let conPropietarioRegistrado = 0;
  let sinPropietarioRegistrado = 0;
  const distritos = new Set();
  const cedulasUnicas = new Set();

  for (const parcela of parcelasDetalle) {
    superficieTotalM2 += superficieParcela(parcela);
    if (parcela.distrito) distritos.add(parcela.distrito);
    if (!parcela.matricula) sinMatricula++;
    else if (parcela.matricula.estado === 'VERIFICADA') conMatriculaVerificada++;
    else conMatriculaSinVerificar++;
    const propietarios = Array.isArray(parcela.propietarios) ? parcela.propietarios : [];
    if (propietarios.length > 0) conPropietarioRegistrado++;
    else sinPropietarioRegistrado++;
    for (const p of propietarios) if (p.cedula) cedulasUnicas.add(p.cedula);
  }

  return {
    totalParcelas: total,
    superficieTotalM2,
    superficieTotalHa: superficieTotalM2 / 10000,
    distritosRepresentados: distritos.size,
    matriculas: { verificadas: conMatriculaVerificada, sinVerificar: conMatriculaSinVerificar, sinRegistrar: sinMatricula },
    propietarios: { parcelasConPropietario: conPropietarioRegistrado, parcelasSinPropietario: sinPropietarioRegistrado, personasUnicas: cedulasUnicas.size }
  };
}

/**
 * IND-CAT-01 · Tasa de Titularidad Formal (ver docs/INDICADORES_MUNICIPALES_VEP.md §3.1).
 * Aproximación explícita: SNC_v3 no tiene integración real con el Registro
 * Público (DGRP) — se usa `matricula.estado === 'VERIFICADA'` (una matrícula
 * cargada y confirmada por un escribano vía el flujo notarial, Fase 11) como
 * proxy de "título inscripto". Esto subestima la titularidad real si hay
 * parcelas tituladas cuya matrícula aún no se cargó en SNC_v3.
 */
export function calcularIndCat01TasaTitularidad(parcelasDetalle = []) {
  let superficieTotal = 0;
  let superficieConTitulo = 0;
  for (const parcela of parcelasDetalle) {
    const sup = superficieParcela(parcela);
    superficieTotal += sup;
    if (parcela.matricula?.estado === 'VERIFICADA') superficieConTitulo += sup;
  }
  if (superficieTotal <= 0) {
    return { codigo: 'IND-CAT-01', disponible: false, motivo: 'Sin superficie registrada en las parcelas evaluadas' };
  }
  return {
    codigo: 'IND-CAT-01',
    nombre: 'Tasa de Titularidad Formal',
    valor: (superficieConTitulo / superficieTotal) * 100,
    unidad: '%',
    metaVEP: 85,
    aproximacion: 'usa matricula.estado = VERIFICADA como proxy de titulo inscripto en el DGRP; no hay integracion real con el Registro Publico (ver AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md, punto 4)'
  };
}

/**
 * Intersección espacial genérica entre las parcelas cargadas y una capa de
 * referencia (fajas ribereñas, cota de inundabilidad, etc.). Sirve de base
 * para IND-AMB-02 e IND-RSG-01 en cuanto esas capas estén disponibles en el
 * visor (hoy `vepDataClient.js` puede descargarlas, pero no hay un flujo que
 * las deje cargadas junto con la capa de parcelas al mismo tiempo).
 * @param {Object} parcelasFC - FeatureCollection de parcelas con geometría
 * @param {Object} capaReferenciaFC - FeatureCollection de la capa externa (VEP/MADES)
 * @param {Object} turfApi - instancia de @turf/turf (ver nota de entorno arriba)
 */
export function calcularInterseccionEspacial(parcelasFC, capaReferenciaFC, turfApi) {
  const features = Array.isArray(parcelasFC?.features) ? parcelasFC.features : [];
  const capa = Array.isArray(capaReferenciaFC?.features) ? capaReferenciaFC.features : [];
  if (!features.length || !capa.length) {
    return { afectadas: [], totalEvaluadas: features.length, porcentaje: 0 };
  }
  const afectadas = [];
  for (const parcela of features) {
    for (const refFeature of capa) {
      try {
        const overlap = turfApi.intersect(turfApi.featureCollection([parcela, refFeature]));
        if (overlap) { afectadas.push(parcela); break; }
      } catch { /* geometrias invalidas: se omiten, no se cuentan como afectadas */ }
    }
  }
  return {
    afectadas: afectadas.map(f => f.properties?.CODIGO ?? f.properties?.codigo ?? null),
    totalEvaluadas: features.length,
    porcentaje: (afectadas.length / features.length) * 100
  };
}

/**
 * IND-AMB-04 · Afectación por Radio de Amortiguamiento de Vertedero
 * (ver docs/INDICADORES_MUNICIPALES_VEP.md §3.2). También reutilizable para
 * IND-RSG-03 (buffer de 200 m sobre fuentes de riesgo tecnológico/incendio)
 * pasando ese punto y radio en vez del vertedero.
 * @param {Object} parcelasFC - FeatureCollection de parcelas con geometría
 * @param {Object} puntoFuente - Feature Point (p. ej. el vertedero municipal)
 * @param {Object} turfApi - instancia de @turf/turf
 * @param {number} radioMetros - radio del buffer, 1000 m por defecto (IND-AMB-04)
 */
export function calcularAfectacionPorBuffer(parcelasFC, puntoFuente, turfApi, radioMetros = 1000) {
  const features = Array.isArray(parcelasFC?.features) ? parcelasFC.features : [];
  if (!features.length || !puntoFuente) {
    return { codigo: 'IND-AMB-04', valor: 0, parcelasAfectadas: [], radioMetros };
  }
  const buffer = turfApi.buffer(puntoFuente, radioMetros, { units: 'meters' });
  const afectadas = features.filter(f => {
    try { return !!turfApi.intersect(turfApi.featureCollection([f, buffer])); }
    catch { return false; }
  });
  return {
    codigo: 'IND-AMB-04',
    nombre: 'Afectación por Radio de Amortiguamiento de Vertedero',
    valor: afectadas.length,
    unidad: 'parcelas',
    metaVEP: 0,
    radioMetros,
    parcelasAfectadas: afectadas.map(f => f.properties?.CODIGO ?? f.properties?.codigo ?? null)
  };
}

/** Catálogo completo: devuelve los calculables con datos reales y los no disponibles con su motivo. */
export function calcularCatalogoCompleto({ parcelasDetalle = [], parcelasFC = null, capasReferencia = {}, turfApi = null } = {}) {
  const resultado = {
    'IND-CAT-01': calcularIndCat01TasaTitularidad(parcelasDetalle)
  };
  for (const codigo of Object.keys(INDICADORES_NO_DISPONIBLES)) {
    const yaDisponibleSiEsEspacialYHayCapas =
      codigo === 'IND-AMB-04' && parcelasFC && capasReferencia.vertedero && turfApi
        ? calcularAfectacionPorBuffer(parcelasFC, capasReferencia.vertedero, turfApi)
        : null;
    resultado[codigo] = yaDisponibleSiEsEspacialYHayCapas || indicadorNoDisponible(codigo);
  }
  return { reportingBasico: calcularReportingBasico(parcelasDetalle), indicadores: resultado };
}
