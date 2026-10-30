/**
 * Auditoría Normativa
 * Validación según Resolución SNC N° 551/2023
 * Retorna: { campo, valor, estado: 'ok'|'error'|'advertencia', mensaje }
 */

import { State } from './state.js';
import * as ParaguayRef from './paraguayRef.js';
import { getParsingLogs } from './parser.js';
import { 
    CAMPOS_REQUERIDOS, 
    CAMPOS_URBANOS, 
    CAMPOS_RURALES, 
    TOLERANCIAS, 
    USOS_TIERRA,
    UTM_ZONE_RANGES,
    ESPECIFICACION_CAMPOS_SNC,
    CONFIG_MUNICIPAL
} from './config.js';
import { isNumeric, formatNumber, showToast, sanitizeString, calcularMetricasPlanasUTM } from './utils.js';
import { logger } from './logger.js';
import { ValidadorMunicipal, runMunicipalValidation } from './municipal.js';

let validationResults = null;

/**
 * Ejecuta validación completa
 * Retorna array de { campo, valor, estado, mensaje }
 */
export async function runValidation() {
    const startTime = performance.now();
    const geojson = State.get('geojson');
    const excelData = State.get('excelData');

    if (!geojson || !geojson.features || geojson.features.length === 0) {
        showToast('No hay geometrías cargadas para validar', 'error');
        const results = [{ campo: 'GEOMETRÍA', valor: null, estado: 'error', mensaje: 'No hay geometrías cargadas' }];
        State.set('validationResults', results);
        return { valid: false, results };
    }

    if (!excelData || excelData.length === 0) {
        showToast('No hay datos tabulares cargados para validar', 'error');
        const results = [{
            campo: 'DATOS',
            valor: null,
            estado: 'error',
            mensaje: 'No se puede certificar: cargue el Excel con los 15 campos del Anexo SNC 551/2023 antes de validar.'
        }];
        State.set('validationResults', results);
        return { valid: false, results };
    }

    const results = []; // Array de { campo, valor, estado, mensaje }
    let validGlobal = true;
    let distritosReferencia = null;
    try {
        distritosReferencia = await ParaguayRef.loadLayer('distritos');
    } catch (error) {
        logger.warn('No se pudo cargar la referencia territorial para validar departamento y distrito.', error);
    }

    // Índice rápido de datos por código
    // Optimización: Creación de mapa en una línea para velocidad O(N)
    const dataMap = new Map(excelData.map(row => [row.CODIGO?.toString().toUpperCase().trim(), row]));

    // Validar archivos (criterio 2)
    results.push(validarArchivosPresentes());

    // Validar cada parcela (criterios 1, 3, 4, 5, 6, 7)
    for (let idx = 0; idx < geojson.features.length; idx++) {
        const feature = geojson.features[idx];
        const props = feature.properties;
        const codigo = obtenerCodigo(feature, idx);
        props.CODIGO = codigo;
        const dataRow = dataMap.get(codigo);

        // Criterio 1: Geometría POLÍGONO cerrado, sin auto-intersecciones
        const geomResults = validarGeometria(feature, codigo);
        results.push(...geomResults);
        if (geomResults.some(r => r.estado === 'error')) validGlobal = false;

        // Criterio 3: 14 campos obligatorios presentes y no nulos
        if (feature.geometry?.type?.includes('Polygon')) {
            const metrics = calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection'));
            props.SUP_SIG_M2 = Number(metrics.areaM2.toFixed(4));
            props.SUP_SIG_M = props.SUP_SIG_M2;
        }
        const camposResults = validarCamposObligatorios(props, dataRow, codigo);
        results.push(...camposResults);
        if (camposResults.some(r => r.estado === 'error')) validGlobal = false;

        // Validación personalizada para SUP_TITULO
        const supTituloCustomResults = validarSupTitulo(props, codigo);
        results.push(...supTituloCustomResults);
        if (supTituloCustomResults.some(r => r.estado === 'error')) validGlobal = false;

        // Criterio 4: SUP_TITULO dentro de tolerancia vs área calculada
        const areaResults = validarToleranciaArea(feature, props, codigo);
        results.push(...areaResults);
        if (areaResults.some(r => r.estado === 'error')) validGlobal = false;

        const ubicacionResults = validarCoincidenciaGeografica(feature, props, codigo, distritosReferencia);
        results.push(...ubicacionResults);
        if (ubicacionResults.some(r => r.estado === 'error')) validGlobal = false;

        // Criterio 6: Sin solapamientos topológicos
        // (se valida después con todas las geometrías)

        // Criterio 9: Sin discrepancias no resueltas entre geometría y planilla
        const mismatches = props._mismatches || [];
        if (mismatches.length > 0) {
            results.push({ campo: `DISCREPANCIA_${codigo}`, valor: mismatches.join(','), estado: 'error', mensaje: `Existen discrepancias críticas no resueltas en los campos: ${mismatches.join(', ')}` });
            validGlobal = false;
        }
    }

    const relationResults = validarRelacionPoligonosTabla(geojson, excelData);
    results.push(...relationResults);
    if (relationResults.some(r => r.estado === 'error')) validGlobal = false;

    // Criterio 6: Validar solapamientos entre todas las parcelas
    const topologyResults = await validarTopologiaSolapamientos(geojson.features);
    results.push(...topologyResults);
    if (topologyResults.some(r => r.estado === 'error')) validGlobal = false;

    // Criterio 7: Sin registros huérfanos
    const orphanResults = validarRegistrosHuerfanos(geojson, excelData);
    results.push(...orphanResults);
    if (orphanResults.some(r => r.estado === 'error')) validGlobal = false;

    // Criterio 8: Proyección EPSG:32721 (UTM Zona 21 Sur)
    results.push(validarProyeccion('view'));

    // Nuevo: Validar límites geográficos de las zonas UTM de Paraguay
    results.push(validarZonasUTM(geojson));

    // Validación Municipal (Ley 3966/2010) - Dictamen complementario
    try {
        const reporteMunicipal = await runMunicipalValidation();
        if (reporteMunicipal && reporteMunicipal.erroresPorLote) {
            reporteMunicipal.erroresPorLote.forEach(err => {
                results.push({
                    campo: err.campo || `MUNI_${err.codigo}`,
                    valor: err.valor,
                    estado: err.estado,
                    mensaje: err.mensaje
                });
                if (err.estado === 'error') validGlobal = false;
            });
        }
        if (reporteMunicipal && reporteMunicipal.alertasPorLote) {
            reporteMunicipal.alertasPorLote.forEach(alert => {
                results.push({
                    campo: alert.campo || `MUNI_${alert.codigo}`,
                    valor: alert.valor,
                    estado: alert.estado,
                    mensaje: alert.mensaje
                });
                if (alert.estado === 'error') validGlobal = false;
            });
        }
        // Guardar reporte municipal completo en State para uso en exportación/UI
        State.set('reporteMunicipal', reporteMunicipal);
    } catch (e) {
        logger.warn('Validación municipal no ejecutada:', e.message);
        results.push({
            campo: 'MUNICIPAL',
            valor: 'ERROR',
            estado: 'advertencia',
            mensaje: 'No se pudo ejecutar validación municipal: ' + e.message
        });
    }

    const executionTime = (performance.now() - startTime).toFixed(2);
    validationResults = results;
    State.set('validationResults', results);

    return {
        valid: validGlobal,
        results,
        importLogs: getParsingLogs(),
        executionTime
    };
}

/** Validación específica para ruta de exportación: EPSG:32721 obligatorio */
export function runExportValidation() {
    const proyResult = validarProyeccion('export');
    const fileResult = validarArchivosPresentes();
    return {
        valid: proyResult.estado !== 'error' && fileResult.estado !== 'error',
        results: [proyResult, fileResult]
    };
}

/**
 * Obtiene o genera CODIGO
 */
function obtenerCodigo(feature, idx) {
    let codigo = feature.properties.CODIGO || feature.properties.ID || `TEMP_${idx + 1}`;
    codigo = codigo.toString().toUpperCase().trim();
    return codigo;
}

/**
 * Criterio 2: Archivos exportables
 */
function validarArchivosPresentes() {
    const files = State.get('uploadedFiles') || [];
    const geojson = State.get('geojson');
    const hasShp = files.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasShx = files.some(f => f.name.toLowerCase().endsWith('.shx'));
    const hasDbf = files.some(f => f.name.toLowerCase().endsWith('.dbf'));
    const hasPrj = files.some(f => f.name.toLowerCase().endsWith('.prj'));

    if (hasShp && hasShx && hasDbf && hasPrj) {
        return { campo: 'ARCHIVOS', valor: 'SHP+SHX+DBF+PRJ', estado: 'ok', mensaje: 'Archivos obligatorios presentes' };
    }
    if (geojson?.features?.length) {
        const faltantes = [];
        if (!hasShp) faltantes.push('.shp');
        if (!hasShx) faltantes.push('.shx');
        if (!hasDbf) faltantes.push('.dbf');
        if (!hasPrj) faltantes.push('.prj');
        return {
            campo: 'ARCHIVOS',
            valor: 'SHP+SHX+DBF+PRJ',
            estado: 'ok',
            mensaje: `El ZIP de salida generará .shp, .shx, .dbf y .prj. Componentes no recibidos en origen: ${faltantes.join(', ') || 'ninguno'}.`
        };
    } else {
        const faltantes = [];
        if (!hasShp) faltantes.push('.shp');
        if (!hasShx) faltantes.push('.shx');
        if (!hasDbf) faltantes.push('.dbf');
        if (!hasPrj) faltantes.push('.prj');

        let mensaje = `Faltan archivos obligatorios: ${faltantes.join(', ')}. `;
        if (!hasPrj) {
            mensaje += 'El archivo .prj define la proyección. Descargue la plantilla oficial para obtener el .prj correcto (EPSG:32721).';
        }

        return {
            campo: 'ARCHIVOS',
            valor: faltantes.join(', '),
            estado: 'error',
            mensaje
        };
    }
}

/**
 * Criterio 1: Geometría POLÍGONO cerrado, sin auto-intersecciones
 */
function formatCoordinate([x, y]) {
    return `X=${Number(x).toFixed(8)}, Y=${Number(y).toFixed(8)}`;
}

function validarCierreAnillos(geom, codigo) {
    const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    const results = [];
    polygons.forEach((polygon, polygonIndex) => {
        polygon.forEach((ring, ringIndex) => {
            const ringName = ringIndex === 0 ? 'anillo exterior' : `anillo interior ${ringIndex}`;
            const pointCount = Array.isArray(ring) ? Math.max(0, ring.length - 1) : 0;
            if (!Array.isArray(ring) || ring.length < 4) {
                results.push({
                    campo: `CIERRE_${codigo}_${polygonIndex + 1}_${ringIndex + 1}`,
                    valor: 'Incompleto',
                    estado: 'error',
                    mensaje: `El ${ringName} requiere al menos 3 puntos y el cierre P${pointCount} → P1.`
                });
                return;
            }
            const first = ring[0];
            const last = ring.at(-1);
            if (first[0] !== last[0] || first[1] !== last[1]) {
                results.push({
                    campo: `CIERRE_${codigo}_${polygonIndex + 1}_${ringIndex + 1}`,
                    valor: 'Abierto',
                    estado: 'error',
                    mensaje: `El ${ringName} no está conectado: P1 (${formatCoordinate(first)}) difiere de P${pointCount} (${formatCoordinate(last)}). Corrija la coordenada de P${pointCount} a ${formatCoordinate(first)} para cerrar P${pointCount} → P1.`
                });
            } else {
                results.push({
                    campo: `CIERRE_${codigo}_${polygonIndex + 1}_${ringIndex + 1}`,
                    valor: 'Cerrado',
                    estado: 'ok',
                    mensaje: `${ringName} cerrado correctamente: P${pointCount} → P1.`
                });
            }
        });
    });
    return results;
}

function validarGeometria(feature, codigo) {
    const results = [];
    const geom = feature.geometry;

    // Verificar tipo de geometría
    const allowed = ['Polygon', 'MultiPolygon', 'LineString', 'Point'];
    if (!allowed.includes(geom.type)) {
        results.push({ campo: `GEOMETRÍA_${codigo}`, valor: geom.type, estado: 'error', mensaje: `Tipo de geometría inválido: ${geom.type}. Debe ser Polygon, MultiPolygon o LineString/Point (KML)` });
    } else {
        results.push({ campo: `GEOMETRÍA_${codigo}`, valor: geom.type, estado: 'ok', mensaje: `Geometría tipo ${geom.type} válida` });

        if (geom.type === 'LineString') {
            const connResult = validarConectividadLinea(feature, State.get('geojson').features, codigo);
            results.push(connResult);
        }
    }

    // Verificar auto-intersecciones (moños)
    try {
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
            results.push(...validarCierreAnillos(geom, codigo));
        }
        const isValid = turf.booleanValid(geom);
        if (!isValid) {
            results.push({ campo: `TOPOLOGÍA_${codigo}`, valor: 'Inválido', estado: 'error', mensaje: 'Polígono inválido: auto-intersección detectada (moño)' });
        } else {
            results.push({ campo: `TOPOLOGÍA_${codigo}`, valor: 'Válido', estado: 'ok', mensaje: 'Sin auto-intersecciones' });
        }
    } catch (e) {
        results.push({ campo: `TOPOLOGÍA_${codigo}`, valor: 'Error', estado: 'error', mensaje: `Error validando topología: ${e.message}` });
    }

    return results;
}

/**
 * Criterio 3: 14 campos obligatorios presentes y no nulos
 */
function validarCamposObligatorios(props, dataRow, codigo) {
    const results = [];
    const usoTierra = (props.USO_TIERRA || '').toUpperCase();
    const isUrbano = usoTierra === 'URBANO';
    const isRural = usoTierra === 'RURAL';

    for (const campo of CAMPOS_REQUERIDOS) {
        let valor = props[campo];

        // Buscar en dataRow si no está en props
        if ((!valor || valor.toString().trim() === '') && dataRow) {
            valor = dataRow[campo];
            if (valor) props[campo] = valor;
        }

        // Verificar si el campo es requerido según uso de tierra
        let esRequerido = true;
        if (CAMPOS_URBANOS.includes(campo) && !isUrbano) esRequerido = false;
        if (CAMPOS_RURALES.includes(campo) && !isRural) esRequerido = false;

        if (esRequerido) {
            const spec = ESPECIFICACION_CAMPOS_SNC[campo];
            const text = valor === undefined || valor === null ? '' : String(valor).trim();
            const invalidType = text && ((spec.tipo === 'entero' && !/^\d+$/.test(text))
                || (spec.tipo === 'decimal' && !Number.isFinite(Number(valor))));
            const decimalPlaces = spec.tipo === 'decimal' && text.includes('.') ? text.split('.')[1].length : 0;
            if (text && (invalidType || text.length > spec.longitud || decimalPlaces > (spec.decimales || 0))) {
                results.push({ campo: `${campo}_${codigo}`, valor, estado: 'error', mensaje: `${campo} no cumple tipo, longitud o decimales del Anexo SNC 551/2023.` });
            }
            if (!valor || valor.toString().trim() === '') {
                results.push({ campo: `${campo}_${codigo}`, valor: null, estado: 'error', mensaje: `Campo obligatorio faltante: ${campo}` });
            } else {
                results.push({ campo: `${campo}_${codigo}`, valor: valor.toString().substring(0, 50), estado: 'ok', mensaje: `Campo ${campo} presente` });
            }
        }
    }

    return results;
}

/**
 * Valida que los extremos de una línea toquen o estén dentro de un polígono
 */
function validarConectividadLinea(feature, allFeatures, codigo) {
    const coords = feature.geometry.coordinates;
    const startPoint = turf.point(coords[0]);
    const endPoint = turf.point(coords[coords.length - 1]);
    const polygons = allFeatures.filter(f => f.geometry.type.includes('Polygon'));

    let startConnected = false;
    let endConnected = false;

    for (const poly of polygons) {
        if (!startConnected && turf.booleanIntersects(startPoint, poly)) startConnected = true;
        if (!endConnected && turf.booleanIntersects(endPoint, poly)) endConnected = true;
        if (startConnected && endConnected) break;
    }

    if (startConnected && endConnected) {
        return { campo: `CONECTIVIDAD_${codigo}`, valor: 'Conectada', estado: 'ok', mensaje: 'Los extremos de la línea están conectados a parcelas' };
    } else {
        const faltante = !startConnected && !endConnected ? 'Ambos extremos' : (!startConnected ? 'El inicio' : 'El final');
        return { campo: `CONECTIVIDAD_${codigo}`, valor: 'Desconectada', estado: 'error', mensaje: `${faltante} de la línea no toca ninguna parcela` };
    }
}

/**
 * Criterio 4: SUP_TITULO dentro de tolerancia vs área calculada
 */
function validarToleranciaArea(feature, props, codigo) {
    const results = [];

    if (!feature.geometry.type.includes('Polygon')) return results;

    try {
        const supGeom = calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection'));
        props.SUP_GEOM = supGeom.areaM2;
        props.SUP_SIG_M2 = Number(supGeom.areaM2.toFixed(4));
        props.SUP_SIG_M = props.SUP_SIG_M2;

        if (!isNumeric(props.SUP_LEGAL) || Number(props.SUP_LEGAL) <= 0) {
            results.push({ campo: `SUP_LEGAL_${codigo}`, valor: props.SUP_LEGAL, estado: 'error', mensaje: 'SUP_LEGAL debe ser un número positivo con hasta 2 decimales.' });
        } else {
            results.push({ campo: `SUP_SIG_M2_${codigo}`, valor: props.SUP_SIG_M2, estado: 'ok', mensaje: 'SUP_SIG_M2 calculada desde la geometría UTM con 4 decimales.' });
        }
    } catch (error) {
        results.push({ campo: `SUP_SIG_M2_${codigo}`, valor: null, estado: 'error', mensaje: `No se pudo calcular SUP_SIG_M2: ${error.message}` });
        return results;
    }

    let supTitulo = parseFloat(props.SUP_TITULO);
    if (isNaN(supTitulo)) {
        results.push({ campo: `SUP_TITULO_${codigo}`, valor: props.SUP_TITULO, estado: 'error', mensaje: 'SUP_TITULO inválido o no numérico' });
        return results;
    }

    try {
        const diff = Math.abs(supTitulo - props.SUP_GEOM);
        const diffPercent = props.SUP_GEOM > 0 ? diff / props.SUP_GEOM : 0;

        const usoTierra = (props.USO_TIERRA || '').toUpperCase();
        const tolerancia = TOLERANCIAS[usoTierra] || TOLERANCIAS.RURAL;

        if (diffPercent > tolerancia) {
            results.push({ campo: `ÁREA_${codigo}`, valor: `${(diffPercent * 100).toFixed(2)}%`, estado: 'error', mensaje: `Diferencia de área (${(diffPercent * 100).toFixed(2)}%) excede tolerancia (${(tolerancia * 100)}%)${usoTierra === 'URBANO' ? ' (Urbano)' : ' (Rural)'}` });
        } else {
            results.push({ campo: `ÁREA_${codigo}`, valor: `${(diffPercent * 100).toFixed(2)}%`, estado: 'ok', mensaje: `Diferencia de área dentro de tolerancia (${(tolerancia * 100)}%)` });
        }
    } catch (e) {
        results.push({ campo: `ÁREA_${codigo}`, valor: null, estado: 'error', mensaje: `Error calculando área: ${e.message}` });
    }

    return results;
}

/**
 * Validación personalizada para SUP_TITULO
 * Comprueba que el valor sea numérico, positivo y dentro de rangos lógicos.
 */
function normalizarNombreTerritorial(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function validarCoincidenciaGeografica(feature, props, codigo, distritosReferencia) {
    if (!distritosReferencia?.features?.length) {
        return [{ campo: `UBICACION_${codigo}`, valor: 'Sin referencia', estado: 'advertencia', mensaje: 'No se pudo contrastar departamento y distrito con la capa territorial local.' }];
    }
    try {
        const centroide = turf.centroid(feature).geometry.coordinates;
        const distrito = distritosReferencia.features.find(item => turf.booleanPointInPolygon(turf.point(centroide), item));
        if (!distrito) {
            return [{ campo: `UBICACION_${codigo}`, valor: 'Fuera de referencia', estado: 'error', mensaje: 'El centroide de la parcela no coincide con ningún distrito de la referencia territorial.' }];
        }
        const esperadoDpto = distrito.properties?.DPTO_DESC;
        const esperadoDist = distrito.properties?.DIST_DESC_;
        const dptoOk = normalizarNombreTerritorial(props.DEPARTAMEN) === normalizarNombreTerritorial(esperadoDpto);
        const distOk = normalizarNombreTerritorial(props.DISTRITO) === normalizarNombreTerritorial(esperadoDist);
        return [{
            campo: `UBICACION_${codigo}`,
            valor: `${esperadoDpto} / ${esperadoDist}`,
            estado: dptoOk && distOk ? 'ok' : 'error',
            mensaje: dptoOk && distOk
                ? 'Departamento y distrito declarados coinciden con la ubicación geométrica.'
                : `Ubicación declarada no coincide. Referencia: ${esperadoDpto} / ${esperadoDist}.`
        }];
    } catch (error) {
        return [{ campo: `UBICACION_${codigo}`, valor: 'Error', estado: 'advertencia', mensaje: `No se pudo verificar la coincidencia territorial: ${error.message}` }];
    }
}

function validarSupTitulo(props, codigo) {
    const results = [];
    const valor = props.SUP_TITULO;

    if (valor !== undefined && valor !== null && valor !== '') {
        if (!isNumeric(valor)) {
            results.push({ campo: `SUP_TITULO_${codigo}`, valor, estado: 'error', mensaje: 'La superficie de título debe ser un valor numérico (ej: 500.50).' });
        } else {
            const num = parseFloat(valor);
            if (num <= 0) {
                results.push({ campo: `SUP_TITULO_${codigo}`, valor: num, estado: 'error', mensaje: 'La superficie de título no puede ser cero o un valor negativo.' });
            }

            // Ejemplo de validación de rango: Evitar errores de carga masivos (ej. 10 millones de m2 en zona urbana)
            if (props.USO_TIERRA === 'URBANO' && num > 1000000) {
                results.push({ campo: `SUP_TITULO_${codigo}`, valor: num, estado: 'advertencia', mensaje: 'La superficie es inusualmente alta para una zona urbana (> 100 Ha). Verifique el dato.' });
            }
        }
    }
    return results;
}

/**
 * Criterio 6: Sin solapamientos topológicos
 */
function validarTopologiaSolapamientos(features) {
    return new Promise((resolve) => {
        const worker = new Worker('./js/topology.worker.js');

        worker.onmessage = function (e) {
            const results = e.data;
            if (results.length === 0) {
                results.push({ campo: 'TOPOLOGÍA_GLOBAL', valor: 'OK', estado: 'ok', mensaje: 'Topología íntegra: sin solapamientos ni huecos detectados.' });
            }
            resolve(results);
            worker.terminate(); // Limpiar memoria
        };

        worker.onerror = function (err) {
            logger.error('Error en Worker de Topología:', err);
            resolve([{ campo: 'TOPOLOGÍA_GLOBAL', valor: 'ERROR', estado: 'error', mensaje: 'Error interno en el cálculo topológico' }]);
            worker.terminate();
        };

        worker.postMessage(features);
    });
}

/**
 * Helper ultra-rápido para descartar solapamientos imposibles
 */
function doBboxesOverlap(b1, b2) {
    return !(b2[0] > b1[2] || b2[2] < b1[0] || b2[1] > b1[3] || b2[3] < b1[1]);
}

/**
 * Criterio 7: Sin registros huérfanos
 * - Une por PADRON; si no hay vinculación por PADRON, hace fallback por CODIGO.
 * - Elimina código muerto tras primer return.
 */
function validarRelacionPoligonosTabla(geojson, excelData) {
    const results = [];
    const byCode = new Map();
    const byPadron = new Map();
    const byFeatureId = new Map();
    excelData.forEach((row, index) => {
        const code = String(row.CODIGO || '').trim().toUpperCase();
        const padron = String(row.PADRON || '').trim();
        if (code) byCode.set(code, { row, index });
        if (padron) byPadron.set(padron, { row, index });
        if (row.__featureId) byFeatureId.set(row.__featureId, { row, index });
    });
    const usedCodes = new Set();
    const usedPadrones = new Set();

    geojson.features.forEach((feature, index) => {
        const props = feature.properties || {};
        const code = String(props.CODIGO || props.ID || '').trim().toUpperCase();
        const padron = String(props.PADRON || '').trim();
        const key = code || padron || `POLIGONO_${index + 1}`;
        const duplicate = (code && usedCodes.has(code)) || (padron && usedPadrones.has(padron));
        const featureId = props.SNC_PARCELA_ID;
        const match = (padron && byPadron.get(padron))
            || (code && byCode.get(code))
            || (featureId && byFeatureId.get(featureId))
            || (excelData.length === geojson.features.length ? { row: excelData[index], index } : null);
        if (code) usedCodes.add(code);
        if (padron) usedPadrones.add(padron);

        if (duplicate) {
            results.push({ campo: `RELACION_SHP_${key}`, valor: key, estado: 'error', mensaje: 'Identificador duplicado: cada polígono debe vincularse a una única fila de la tabla DBF/Excel.' });
        } else if (!match) {
            results.push({ campo: `RELACION_SHP_${key}`, valor: key, estado: 'error', mensaje: 'Polígono sin fila correspondiente en la tabla DBF/Excel; vincule por PADRON o CODIGO.' });
        } else {
            results.push({ campo: `RELACION_SHP_${key}`, valor: `fila ${match.index + 1}`, estado: 'ok', mensaje: 'Polígono relacionado con una única fila de atributos por PADRON o CODIGO.' });
        }
    });
    return results;
}

function validarRegistrosHuerfanos(geojson, excelData) {
    const results = [];
    const padronesGeometria = new Set(geojson.features
        .map(feature => feature.properties?.PADRON)
        .filter(value => value !== undefined && String(value).trim() !== '')
        .map(value => String(value).trim()));

    const codigosEnGeo = new Set(geojson.features.map(f => f.properties.CODIGO?.toString().toUpperCase().trim()));

    // Intento 1: join por PADRON si existe al menos un padrón en geometría
    if (padronesGeometria.size > 0) {
        for (const row of excelData) {
            const padron = row.PADRON === undefined || row.PADRON === null ? '' : String(row.PADRON).trim();
            if (!padron || !padronesGeometria.has(padron)) {
                // Fallback a CODIGO cuando PADRON no vincula
                const codigo = row.CODIGO?.toString().toUpperCase().trim();
                if (codigo && codigosEnGeo.has(codigo)) continue;
                results.push({ campo: `HUERFANO_${padron || codigo || 'SIN_DATO'}`, valor: padron || codigo || 'N/A', estado: 'error', mensaje: 'Registro Excel sin geometría asociada por PADRON ni por CODIGO.' });
            }
        }
    } else {
        // Sin PADRON en geometría: usar CODIGO como único criterio
        for (const row of excelData) {
            const codigo = row.CODIGO?.toString().toUpperCase().trim();
            if (codigo && !codigosEnGeo.has(codigo)) {
                results.push({ campo: `HUERFANO_${codigo}`, valor: codigo, estado: 'error', mensaje: `Registro en Excel sin geometría asociada: ${codigo}` });
            }
        }
    }

    if (results.length === 0) {
        results.push({ campo: 'INTEGRIDAD', valor: 'OK', estado: 'ok', mensaje: 'Todos los registros de Excel tienen geometría asociada por PADRON o CODIGO.' });
    }
    return results;
}

/**
 * Criterio 8: Proyección EPSG:32721
 */
function validarProyeccion(mode = 'view') {
    // El archivo final siempre se reproyecta a EPSG:32721 (generateShapefile() ->
    // reprojectToUTM()), sin importar el origen: esto es solo informativo para
    // CRS georreferenciados conocidos. Únicamente bloquea la exportación una
    // fuente sin georreferenciar (p.ej. DXF en coordenadas locales/de obra, sin
    // vínculo con un CRS real), donde no hay forma de reproyectar de manera fiable.
    const currentProj = State.get('projection') || State.get('currentDisplayProjection') || 'EPSG:32721';

    if (currentProj === 'EPSG:4326' || currentProj === 'WGS84') {
        return { campo: 'PROYECCIÓN', valor: currentProj, estado: 'ok', mensaje: 'Geometría de visualización WGS84 detectada; se reproyectará automáticamente a UTM 21S en el archivo final.' };
    }
    if (currentProj === 'EPSG:32721') {
        return { campo: 'PROYECCIÓN', valor: currentProj, estado: 'ok', mensaje: 'Proyección válida para exportación: EPSG:32721 (UTM Zona 21 Sur).' };
    }
    if (currentProj === 'EPSG:32720') {
        return { campo: 'PROYECCIÓN', valor: currentProj, estado: 'ok', mensaje: `Proyección detectada: ${currentProj}; se reproyectará automáticamente a UTM 21S en el archivo final.` };
    }
    return {
        campo: 'PROYECCIÓN',
        valor: String(currentProj),
        estado: mode === 'export' ? 'error' : 'advertencia',
        mensaje: `Proyección "${currentProj}" no georreferenciada: no se puede reproyectar automáticamente a EPSG:32721. Georreferencie el archivo antes de exportar.`
    };
}

/**
 * Valida que las coordenadas del GeoJSON estén dentro de los límites de Paraguay
 * definidos por las zonas UTM 20S y 21S en config.js.
 */
function validarZonasUTM(geojson) {
    try {
        // Obtener el Bounding Box global: [minLng, minLat, maxLng, maxLat]
        const bbox = turf.bbox(geojson); 
        const minLng = bbox[0];
        const maxLng = bbox[2];

        const range20 = UTM_ZONE_RANGES['EPSG:32720'];
        const range21 = UTM_ZONE_RANGES['EPSG:32721'];
        const currentProj = State.get('projection') || 'EPSG:32721';

        // Límites combinados de Paraguay (Occidental y Oriental)
        const paraguayMinLng = range20.minLng;
        const paraguayMaxLng = range21.maxLng;

        if (minLng < paraguayMinLng || maxLng > paraguayMaxLng) {
            return {
                campo: 'ZONAS_UTM_PY',
                valor: `${minLng.toFixed(2)}° a ${maxLng.toFixed(2)}°`,
                estado: 'error',
                mensaje: `Las coordenadas están fuera del rango geográfico de Paraguay (${paraguayMinLng}° a ${paraguayMaxLng}°).`
            };
        }

        let region = "";
        let zone = "";
        
        // El meridiano -60 divide las zonas 20 y 21 (Chaco y Región Oriental)
        if (maxLng <= -60) {
            region = "Región Occidental (Chaco)";
            zone = range20.name;
        } else if (minLng >= -60) {
            region = "Región Oriental";
            zone = range21.name;
        } else {
            // Calcular porcentajes de área en cada zona (Meridiano -60)
            try {
                const totalArea = turf.area(geojson);
                const westBox = turf.bboxPolygon([-100, -90, -60, 90]); // Caja que cubre el Chaco
                let westArea = 0;
                
                geojson.features.forEach(f => {
                    const intersect = turf.intersect(f, westBox);
                    if (intersect) westArea += turf.area(intersect);
                });
                
                const pWest = ((westArea / totalArea) * 100).toFixed(1);
                const pEast = (100 - pWest).toFixed(1);
                
                region = `Zona de Transición (${pWest}% Chaco / ${pEast}% Oriental)`;
                zone = "20S/21S";
            } catch (err) {
                region = "Zona de Transición (Chaco y Región Oriental)";
                zone = "20S/21S";
            }
        }

        // Validación de coherencia entre región y proyección (Chaco vs UTM 21S)
        if (maxLng <= -60 && currentProj === 'EPSG:32721') {
            return { 
                campo: 'ZONAS_UTM_PY', 
                valor: 'UTM 21S', 
                estado: 'advertencia', 
                mensaje: `⚠️ El predio se ubica en el Chaco (${region}) pero se está intentando exportar en UTM 21S. Se recomienda usar UTM 20S.` 
            };
        }

        return { 
            campo: 'ZONAS_UTM_PY', 
            valor: zone, 
            estado: 'ok', 
            mensaje: `Ubicación detectada: ${region}. Cumple con los límites geográficos nacionales.` 
        };
    } catch (e) {
        return { campo: 'ZONAS_UTM_PY', valor: 'Error', estado: 'error', mensaje: 'No se pudo verificar la extensión geográfica de los datos.' };
    }
}

/**
 * Cierra el modal de validación
 */
export function closeModal() {
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

/**
 * MÓDULO 2: Estructura Catastral y Jerarquía Política (R21-R40)
 * Requerimientos herranuebras.txt: R21-R40
 */

/**
 * Validación del formato folio real electrónico DGRP.
 * @param {string} codigo - Código catastral a validar
 * @returns {Object} Resultado de validación
 */
function validarFormatoDGRP(codigo) {
    if (!codigo) return { valido: false, mensaje: 'Código vacío' };

    const codigoUpper = codigo.toString().trim().toUpperCase();

    // Formato folio real electrónico DGRP: folio-número
    // Ejemplos: folio 1234, folio 1234/5, folio-R-123
    const dgrpPatterns = [
        /^FOLIO\s+\d{1,6}(\/\d{1,3})?$/i,       // FOLIO 1234 o FOLIO 1234/5
        /^FO-\d{1,6}(\/\d{1,3})?$/i,            // FO-1234 o FO-1234/5
        /^\d{1,6}(\/\d{1,3})?$/,                 // 1234 o 1234/5 (numérico puro)
    ];

    let patronValido = false;
    dgrpPatterns.forEach((pat) => {
        if (pat.test(codigoUpper)) patronValido = true;
    });

    if (patronValido) {
        return { valido: true, mensaje: 'Formato DGRP electrónico válido' };
    }

    // Patrones de folio antiguo / variaciones
    const oldPatterns = [
        /^\d{1,8}$/,                              // Número puro de 1-8 dígitos
        /^\d{1,4}\/\d{1,3}$/,                     // Número/año
    ];

    let patronViejo = false;
    oldPatterns.forEach((pat) => {
        if (pat.test(codigoUpper)) patronViejo = true;
    });

    if (patronViejo) {
        return { valido: true, mensaje: 'Formato DGRP antiguo válido' };
    }

    return {
        valido: false,
        mensaje: `Formato DGRP electrónico no reconocido: ${codigo}. Formatos esperados: FOLIO 1234, FOLIO 1234/5, o número de 1-8 dígitos.`
    };
}

/**
 * Trazabilidad genealógica de desdoblamientos y reasignaciones catastrales.
 * Lleva el historial de cómo un identificador catastral (CCC/Padrón) se ha
 * transformado a través de desdoblamientos, fusiones o cambios administrativos.
 * @param {Object} datos - Datos del expediente actual
 * @param {Object} historialPrevio - Historial opcional previo
 * @returns {Object} Historial actualizado
 */
function trazaDesdoblamiento(datos, historialPrevio = null) {
    const hoy = new Date().toISOString();

    // Estructura base del historial
    const entrada = {
        fecha: hoy,
        accion: 'registro_actual',
        usuario: datos?.usuario || 'Sistema',
        codigoAnterior: datos?.codigoAnterior,
        nuevoCodigo: datos?.codigoNuevo || datos?.codigo,
        motivo: datos?.motivo || 'Nuevo empadronamiento',
        tipoOperacion: datos?.tipoOperacion || 'empadronamiento'
    };

    // Historico previo
    let historial = [];

    if (historialPrevio && Array.isArray(historialPrevio)) {
        // Si ya existe historial, agregamos la nueva entrada al inicio
        historial = [entrada].concat(historialPrevio.slice(0, 20)); // Máx 20 registros
    } else {
        // Nuevo historial
        historial = [entrada];
    }

    // Agregar metadatos de trazabilidad
    const resultado = {
        ...datos,
        historial: historial,
        codigoRastreo: datos?.codigoRastreo || `TRACE-${Date.now()}`,
        genealogico: {
            origen: datos?.codigoAnterior || datos?.codigo,
            actual: datos?.codigoNuevo || datos?.codigo,
            totalDesdoblamientos: historial.length - 1,
            primeraFecha: historial.length > 0 ? historial[historial.length - 1].fecha : null
        }
    };

    return resultado;
}

/**
 * Obtener el código anterior en el historial de un expediente.
 * @param {Object} estadoActual - Estado actual del expediente
 * @returns {Object} Información del código anterior
 */
function obtenerCodigoAnterior(estadoActual) {
    if (!estadoActual?.historial || estadoActual.historial.length === 0) {
        return { anterior: null, acumulado: 0 };
    }

    const historial = estadoActual.historial;
    const ultimaEntrada = historial[historial.length - 1];
    const totalRegistros = historial.length;

    // Buscar la entrada que no sea la última (código anterior)
    const codigoAnterior = historial.slice(0, -1).reduce((acc, actual) => {
        if (actual.codigoAnterior) return actual.codigoAnterior;
        return acc;
    }, null);

    return {
        anterior: codigoAnterior,
        acumulado: totalRegistros - 1,
        ultimaModificacion: ultimaEntrada?.fecha || null
    };
}

/**
 * Validar si un código catastral ha sufrido desdoblamiento previo.
 * @param {string} codigo - Código a verificar
 * @param {Array} historial - Historial de transformaciones
 * @returns {Object} Resultado de la verificación
 */
function verificarDesdoblamientoPrevio(codigo, historial) {
    if (!historial || !Array.isArray(historial) || historial.length === 0) {
        return { tieneDesdoblamiento: false, codigoAnterior: null };
    }

    // Verificar si el código actual aparece como "nuevoCodigo" en alguna entrada anterior
    const tieneDesdoblamiento = historial.some(
        (entrada) => entrada.nuevoCodigo && entrada.nuevoCodigo.toString().trim() === codigo.toString().trim()
    );

    const codigoAnterior = tieneDesdoblamiento
        ? historial.find((e) => e.nuevoCodigo && e.nuevoCodigo.toString().trim() === codigo.toString().trim())
            .codigoAnterior
        : null;

    return {
        tieneDesdoblamiento,
        codigoAnterior: codigoAnterior || null,
        totalTransformaciones: historial.length
    };
}

/**
 * Formatear código catastral para visualización amigable.
 * @param {string} codigo - Código en formato DGRP o CCC
 * @param {Object} opciones - Opciones de formateo
 * @returns {Object} Código formateado con metadatos
 */
function formatearCodigo(codigo, opciones = {}) {
    if (!codigo) return { formateado: '', metadata: {} };

    const codigoLimpo = codigo.toString().trim().toUpperCase();
    const { mostrarGenealogico = true, separador = ' - ' } = opciones;

    const metadata = {
        tipo: 'desconocido',
        valido: false,
        historia: []
    };

    // Detectar tipo de código
    if (/^FOLIO\s+\d+/i.test(codigoLimpo)) {
        metadata.tipo = 'DGRP_folleto';
        metadata.valido = true;
    } else if (/^\d{1,8}$/.test(codigoLimpo)) {
        metadata.tipo = 'CCC_numero';
        metadata.valido = true;
    } else if (/^\d{1,4}\/\d{1,3}$/.test(codigoLimpo)) {
        metadata.tipo = 'CCC_ano';
        metadata.valido = true;
    }

    let formateado = codigoLimpo;
    if (mostrarGenealogico && metadata.tipo !== 'desconocido') {
        // Agregar indicador de tipo
        formateado += ` [${metadata.tipo}]`;
    }

    return {
        formateado,
        metadata
    };
}

// Exportar funciones del Módulo 2
export { validarFormatoDGRP, trazaDesdoblamiento, obtenerCodigoAnterior, verificarDesdoblamientoPrevio, formatearCodigo };
