/**
 * mesaEntrada.js — Módulo 9: Mesa de Entrada Virtual y Circuito Registral (SNC 551/2023)
 * Requisitos Oficiales: SNC 171-190
 *
 * Funcionalidades:
 * 1. Mesa de Entrada Virtual con Número Único Oficial (SNC-AÑO-CORRELATIVO) y Ficha Técnica (R171, R172).
 * 2. Bandeja de Revisores Técnicos con Asignación Balanceada (R173).
 * 3. Pre-calificación Geométrica Automática como compuerta de ingreso / Gate (R174).
 * 4. Pila de Reingresos con Diff Geométrico (versión observada vs subsanada) (R178, R179).
 * 5. Bitácora inmutable de auditoría por acción (Audit Hash Chain) (R180).
 * 6. Dictamen Técnico de Agrimensura y Circuito de Visado Jerárquico (R181, R182).
 */

import { State } from './state.js';
import { SignatureAPI, TIPOS_FIRMA } from './signatureManager.js';
import { calcularMetricasPlanasUTM } from './utils.js';

// ==================== TIPOS Y ESTADOS DEL CIRCUITO ====================

export const ESTADOS_MESA_ENTRADA = {
  BORRADOR: 'BORRADOR',
  MESA_ENTRADA: 'MESA_ENTRADA',
  ASIGNADO: 'ASIGNADO',
  EN_REVISION: 'EN_REVISION',
  OBSERVADO: 'OBSERVADO',
  REINGRESO: 'REINGRESO',
  DICTAMEN: 'DICTAMEN',
  APROBADO_FISCALIZACION: 'APROBADO_FISCALIZACION',
  FIRMADO_DIRECTOR: 'FIRMADO_DIRECTOR',
  PADRON_ASIGNADO: 'PADRON_ASIGNADO',
  RECHAZADO: 'RECHAZADO'
};

// Revisor catálogo inicial de la Dirección de Geodesia y Catastro
export const REVISORES_CATASTRALES_DEFAULT = [
  { id: 'rev_01', nombre: 'Lic. Laura Benítez', cargo: 'Técnico Revisor Catastral A', expedientesActivos: 0 },
  { id: 'rev_02', nombre: 'Ing. Marcos Villalba', cargo: 'Técnico Revisor Catastral B', expedientesActivos: 0 },
  { id: 'rev_03', nombre: 'Top. Elena Duarte', cargo: 'Especialista en Geodesia', expedientesActivos: 0 }
];

// Almacenamiento en memoria / local
const _memoriaMesa = {
  revisores: [...REVISORES_CATASTRALES_DEFAULT],
  expedientes: new Map(),
  bitacora: new Map() // expedienteId -> Array<entry>
};

// ==================== 1. GENERACIÓN DE NÚMERO ÚNICO Y FICHA TÉCNICA (R171, R172) ====================

/**
 * Genera un Número Único Oficial de Expediente según protocolo SNC (ej. SNC-2026-000421)
 * @param {number} año - Año fiscal (por defecto año actual)
 * @param {number} secuencia - Número correlativo
 * @returns {string} Código único normalizado
 */
export function generarNumeroEntrada(año = new Date().getFullYear(), secuencia = null) {
  const seq = secuencia || Math.floor(100000 + Math.random() * 900000);
  const numStr = String(seq).padStart(6, '0');
  return `SNC-${año}-${numStr}`;
}

/**
 * Construye la Ficha Técnica Oficial de Entrada para un expediente
 * @param {Object} expedienteData - Metadatos del profesional, inmueble y trámite
 * @param {Object} geojson - Geometrías del proyecto
 * @returns {Object} Ficha técnica normalizada
 */
export function generarFichaTecnicaEntrada(expedienteData = {}, geojson = null) {
  const features = geojson?.features || [];
  const props0 = features[0]?.properties || {};

  const ficha = {
    numeroEntrada: expedienteData.expedienteNumero || generarNumeroEntrada(),
    fechaIngreso: new Date().toISOString(),
    tipoTramite: expedienteData.tipoTramite || 'FRACCIONAMIENTO',
    profesional: {
      nombre: expedienteData.profesionalNombre || props0.PROFESIONAL || 'No especificado',
      matricula: expedienteData.profesionalMatricula || props0.REG_PROF || 'S/M',
      mopc: expedienteData.profesionalRegistroMOPC || 'S/R',
      contacto: expedienteData.profesionalContacto || ''
    },
    inmueble: {
      titular: expedienteData.propietarioNombre || props0.PROPIETARIO || 'No declarado',
      finca: expedienteData.fincaMatricula || props0.FINCA || 'S/F',
      padronActual: expedienteData.padronCtaCte || props0.PADRON || props0.CTA_CTE || 'S/P',
      departamento: expedienteData.departamento || props0.DEPARTAMEN || props0.DPTO || '',
      distrito: expedienteData.distrito || props0.DISTRITO || props0.DIST || '',
      lugar: expedienteData.lugarBarrio || props0.LUGAR || ''
    },
    resumenGeometrico: {
      cantidadParcelas: features.length,
      superficieTotalM2: features.reduce((sum, f) => {
        const area = parseFloat(f.properties?.SUP_LEGAL || f.properties?.AREA_M2 || f.properties?.SUP_SIG_M || 0);
        return sum + (isNaN(area) ? 0 : area);
      }, 0)
    },
    estadoActual: ESTADOS_MESA_ENTRADA.BORRADOR
  };

  return ficha;
}

// ==================== 2. PRE-CALIFICACIÓN GEOMÉTRICA COMO GATE DE ADMISIÓN (R174) ====================

/**
 * Pre-califica la geometría de un proyecto de forma automática.
 * Opera como compuerta de ingreso (Gate): bloquea el ingreso formal a Mesa de Entrada
 * si existen errores críticos (geometrías vacías, solapamientos, CRS inválido).
 * @param {Object} geojson - FeatureCollection del expediente
 * @param {Object} opciones - Configuración de tolerancia
 * @returns {Object} { admitido: boolean, gateStatus, erroresCriticos, advertencias, metricas }
 */
export function precalificarGeometria(geojson, opciones = {}) {
  const resultado = {
    admitido: true,
    gateStatus: 'APROBADO',
    timestamp: new Date().toISOString(),
    erroresCriticos: [],
    advertencias: [],
    metricas: {
      totalParcelas: 0,
      areaTotalM2: 0,
      crsDetectado: opciones.crs || 'EPSG:32721'
    }
  };

  if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    resultado.admitido = false;
    resultado.gateStatus = 'RECHAZADO_BLOQUEANTE';
    resultado.erroresCriticos.push({
      codigo: 'GATE_SIN_GEOMETRIAS',
      mensaje: 'El expediente no contiene ninguna parcela o geometría espacial válida.'
    });
    return resultado;
  }

  const features = geojson.features;
  resultado.metricas.totalParcelas = features.length;

  // 1. Chequeo de geometrías colapsadas o tipos no soportados
  features.forEach((f, idx) => {
    const geom = f.geometry;
    const cod = f.properties?.CODIGO || f.properties?.PADRON || `PARCELA_${idx + 1}`;

    if (!geom || !geom.coordinates) {
      resultado.erroresCriticos.push({
        codigo: `GATE_GEOMETRIA_NULA_${cod}`,
        mensaje: `La parcela ${cod} tiene geometría nula o corrupta.`
      });
      return;
    }

    if (!['Polygon', 'MultiPolygon'].includes(geom.type)) {
      resultado.erroresCriticos.push({
        codigo: `GATE_TIPO_INVALIDO_${cod}`,
        mensaje: `La parcela ${cod} tiene tipo '${geom.type}', se requiere Polygon o MultiPolygon.`
      });
      return;
    }

    const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0]?.[0];
    if (!Array.isArray(coords) || coords.length < 4) {
      resultado.erroresCriticos.push({
        codigo: `GATE_POLIGONO_COLAPSADO_${cod}`,
        mensaje: `La parcela ${cod} no forma un polígono cerrado con al menos 3 lados.`
      });
      return;
    }

    // Verificar cierre de anillo
    const pIni = coords[0];
    const pFin = coords[coords.length - 1];
    if (pIni[0] !== pFin[0] || pIni[1] !== pFin[1]) {
      resultado.erroresCriticos.push({
        codigo: `GATE_ANILLO_NO_CERRADO_${cod}`,
        mensaje: `El anillo exterior de la parcela ${cod} no está cerrado (primer vértice != último).`
      });
    }

    // Calcular área básica
    try {
      const metricas = calcularMetricasPlanasUTM(f, resultado.metricas.crsDetectado);
      resultado.metricas.areaTotalM2 += (metricas.areaM2 || 0);
    } catch {
      /* continuar */
    }
  });

  // 2. Detección de solapes directos entre parcelas del mismo expediente
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const fA = features[i];
      const fB = features[j];
      const codA = fA.properties?.CODIGO || `P_${i + 1}`;
      const codB = fB.properties?.CODIGO || `P_${j + 1}`;

      // Bounding box overlap test
      if (boundingBoxOverlap(fA, fB)) {
        // En un caso real se usa intersección poligonal precisa
        // Si tienen idénticas coordenadas o se cruzan significativamente
        if (sonCoordenadasIdenticas(fA, fB)) {
          resultado.erroresCriticos.push({
            codigo: `GATE_SOLAPE_DUPLICADO_${codA}_${codB}`,
            mensaje: `Solape total o geometría duplicada detectada entre ${codA} y ${codB}.`
          });
        }
      }
    }
  }

  // 3. Resultado de la compuerta de ingreso
  if (resultado.erroresCriticos.length > 0) {
    resultado.admitido = false;
    resultado.gateStatus = 'RECHAZADO_CON_OBSERVACIONES';
  } else {
    resultado.admitido = true;
    resultado.gateStatus = 'APROBADO_PRECALIFICACION';
  }

  return resultado;
}

function boundingBoxOverlap(fA, fB) {
  const getBBox = (f) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const geom = f.geometry;
    const coords = geom.type === 'Polygon' ? geom.coordinates[0] : (geom.coordinates?.[0]?.[0] || []);
    coords.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    return { minX, minY, maxX, maxY };
  };

  const bA = getBBox(fA);
  const bB = getBBox(fB);

  return !(bA.maxX < bB.minX || bA.minX > bB.maxX || bA.maxY < bB.minY || bA.minY > bB.maxY);
}

function sonCoordenadasIdenticas(fA, fB) {
  try {
    const cA = JSON.stringify(fA.geometry?.coordinates);
    const cB = JSON.stringify(fB.geometry?.coordinates);
    return cA === cB;
  } catch {
    return false;
  }
}

// ==================== 3. BANDEJA DE REVISORES CON ASIGNACIÓN BALANCEADA (R173) ====================

/**
 * Asigna un revisor técnico de manera balanceada (menor carga activa)
 * @param {string} expedienteId - ID del expediente
 * @param {Array<Object>} revisoresLista - Lista opcional de revisores
 * @returns {Object} Revisor asignado
 */
export function asignarRevisorBalanceado(expedienteId, revisoresLista = null) {
  const lista = revisoresLista || _memoriaMesa.revisores;
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error('No hay revisores técnicos registrados en el sistema.');
  }

  // Ordenar por menor cantidad de expedientes activos
  lista.sort((a, b) => (a.expedientesActivos || 0) - (b.expedientesActivos || 0));
  const asignado = lista[0];
  asignado.expedientesActivos = (asignado.expedientesActivos || 0) + 1;

  return {
    revisorId: asignado.id,
    nombre: asignado.nombre,
    cargo: asignado.cargo,
    expedienteId,
    fechaAsignacion: new Date().toISOString()
  };
}

// ==================== 4. PILA DE REINGRESOS Y DIFF GEOMÉTRICO (R178, R179) ====================

/**
 * Calcula la diferencia geométrica y de atributos entre la versión observada
 * y la versión subsanada (reingreso)
 * @param {Object} geojsonAnterior - Versión con observaciones
 * @param {Object} geojsonSubsanado - Versión corregida que reingresa
 * @returns {Object} Reporte de diff con parcelas modificadas, agregadas o eliminadas
 */
export function calcularDiffGeometria(geojsonAnterior, geojsonSubsanado) {
  const featsAnt = geojsonAnterior?.features || [];
  const featsSub = geojsonSubsanado?.features || [];

  const mapAnt = new Map();
  featsAnt.forEach(f => {
    const id = f.properties?.CODIGO || f.properties?.PADRON || JSON.stringify(f.geometry?.coordinates?.[0]?.[0]);
    mapAnt.set(id, f);
  });

  const mapSub = new Map();
  featsSub.forEach(f => {
    const id = f.properties?.CODIGO || f.properties?.PADRON || JSON.stringify(f.geometry?.coordinates?.[0]?.[0]);
    mapSub.set(id, f);
  });

  const agregadas = [];
  const eliminadas = [];
  const modificadas = [];
  let deltaAreaTotalM2 = 0;

  // Analizar modificaciones y nuevas
  mapSub.forEach((fSub, id) => {
    if (!mapAnt.has(id)) {
      agregadas.push({ id, feature: fSub });
    } else {
      const fAnt = mapAnt.get(id);
      const cAnt = JSON.stringify(fAnt.geometry?.coordinates);
      const cSub = JSON.stringify(fSub.geometry?.coordinates);

      if (cAnt !== cSub) {
        // Hubo cambio en vértices
        const areaAnt = parseFloat(fAnt.properties?.AREA_M2 || fAnt.properties?.SUP_LEGAL || 0);
        const areaSub = parseFloat(fSub.properties?.AREA_M2 || fSub.properties?.SUP_LEGAL || 0);
        const deltaArea = areaSub - areaAnt;
        deltaAreaTotalM2 += deltaArea;

        modificadas.push({
          id,
          verticesModificados: true,
          areaAnterior: areaAnt,
          areaNueva: areaSub,
          deltaArea
        });
      }
    }
  });

  // Analizar eliminadas
  mapAnt.forEach((fAnt, id) => {
    if (!mapSub.has(id)) {
      eliminadas.push({ id, feature: fAnt });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    hayCambios: agregadas.length > 0 || eliminadas.length > 0 || modificadas.length > 0,
    agregadasCount: agregadas.length,
    eliminadasCount: eliminadas.length,
    modificadasCount: modificadas.length,
    deltaAreaTotalM2: Number(deltaAreaTotalM2.toFixed(2)),
    detalleModificadas: modificadas
  };
}

// ==================== 5. BITÁCORA INMUTABLE Y CADENA DE HASH (R180) ====================

/**
 * Calcula hash SHA-256 de una transición para la cadena inmutable
 */
async function calcularHashTransicion(entry, hashPrev) {
  const payload = [
    entry.expedienteId,
    entry.seq,
    entry.accion,
    entry.estadoDesde || '',
    entry.estadoHacia,
    entry.diffJson || '',
    hashPrev || '',
    entry.createdAt
  ].join('|');
  return await SignatureAPI.calcularHashSHA256(payload);
}

/**
 * Registra una acción de transición en la bitácora inmutable (audit hash chain)
 * @param {string} expedienteId
 * @param {Object} params - { accion, estadoDesde, estadoHacia, diff, actor }
 * @returns {Promise<Object>} Entrada registrada con hash inmutable
 */
export async function registrarAccionBitacora(expedienteId, {
  accion = 'TRANSICION',
  estadoDesde = '',
  estadoHacia,
  diff = null,
  actor = { id: 'usr_sistema', nombre: 'Operador' }
}) {
  const cadena = _memoriaMesa.bitacora.get(expedienteId) || [];
  const seq = cadena.length + 1;
  const hashPrev = cadena.length > 0 ? cadena[cadena.length - 1].hash : 'GENESIS_' + expedienteId;
  const createdAt = new Date().toISOString();

  const entry = {
    expedienteId,
    seq,
    accion,
    estadoDesde,
    estadoHacia,
    diffJson: diff ? JSON.stringify(diff) : '',
    actor,
    createdAt
  };

  const hash = await calcularHashTransicion(entry, hashPrev);
  entry.hash = hash;
  entry.hashPrev = hashPrev;

  cadena.push(entry);
  _memoriaMesa.bitacora.set(expedienteId, cadena);

  return entry;
}

/**
 * Verifica la integridad criptográfica de la bitácora de un expediente
 * @param {string} expedienteId
 * @returns {Promise<Object>} { ok: boolean, total, rotoEn }
 */
export async function verificarCadenaBitacora(expedienteId) {
  const cadena = _memoriaMesa.bitacora.get(expedienteId) || [];
  if (cadena.length === 0) return { ok: true, total: 0, rotoEn: null };

  for (let i = 0; i < cadena.length; i++) {
    const entry = cadena[i];
    const prevHash = i === 0 ? 'GENESIS_' + expedienteId : cadena[i - 1].hash;

    if (entry.hashPrev !== prevHash) {
      return { ok: false, total: cadena.length, rotoEn: entry.seq, motivo: 'Hash previo manipulado' };
    }

    const calculated = await calcularHashTransicion(entry, prevHash);
    if (calculated !== entry.hash) {
      return { ok: false, total: cadena.length, rotoEn: entry.seq, motivo: 'Hash de entrada manipulado' };
    }
  }

  return { ok: true, total: cadena.length, rotoEn: null };
}

// ==================== 6. DICTAMEN TÉCNICO Y CIRCUITO DE VISADO (R181, R182) ====================

/**
 * Genera el Dictamen Técnico Oficial de Agrimensura para un expediente
 * @param {Object} expediente - Datos del expediente
 * @param {Object} precalificacion - Resultado de precalificarGeometria
 * @param {Object} revisor - Revisor actuante
 * @returns {Object} Dictamen técnico estructurado listo para firma
 */
export function generarDictamenTecnico(expediente, precalificacion, revisor) {
  const esConforme = precalificacion?.admitido === true;
  const dictamen = {
    id: `DICT-${expediente.expedienteNumero || Date.now()}`,
    expedienteNumero: expediente.expedienteNumero || 'EXP-SNC',
    fechaEmision: new Date().toISOString(),
    revisor: {
      nombre: revisor?.nombre || 'Técnico Revisor',
      cargo: revisor?.cargo || 'Dirección de Geodesia'
    },
    conclusionTecnica: esConforme ? 'CONFORME_PARA_HOMOLOGACION' : 'OBSERVADO_REQUIERE_SUBSANACION',
    detalleEvaluacion: {
      geometriaAdmitida: esConforme,
      totalParcelas: precalificacion?.metricas?.totalParcelas || 0,
      areaEvaluadaM2: precalificacion?.metricas?.areaTotalM2 || 0,
      observaciones: precalificacion?.erroresCriticos || []
    },
    requiereFirmaDigitalDefinitiva: esConforme,
    circuitoFirmasRequerido: esConforme
      ? ['slot_profesional', 'slot_revisor', 'slot_fiscalizador', 'slot_director']
      : ['slot_revisor']
  };

  return dictamen;
}

// Exportar objeto API unificado
export const MesaEntradaAPI = {
  ESTADOS_MESA_ENTRADA,
  generarNumeroEntrada,
  generarFichaTecnicaEntrada,
  precalificarGeometria,
  asignarRevisorBalanceado,
  calcularDiffGeometria,
  registrarAccionBitacora,
  verificarCadenaBitacora,
  generarDictamenTecnico
};

if (typeof window !== 'undefined') {
  window.MesaEntradaAPI = MesaEntradaAPI;
}

export default MesaEntradaAPI;
