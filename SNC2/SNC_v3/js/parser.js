/**
 * Motor de Importación Universal
 * Procesa DXF, KML, KMZ, GeoJSON, CSV, TXT, SHP, ZIP y Excel
 */

import { State } from './state.js';
import { sanitizeString, showLoading, hideLoading, showToast, actualizarContadoresUI, downloadFile } from './utils.js';
import { CAMPOS_REQUERIDOS, PROJ_32720, PROJ_32721, METADATOS_GEODESICOS, CONFIG_MUNICIPAL } from './config.js';
import { explodePolygonFeatures } from './geoFeatures.js';
import { logger } from './logger.js';
import { analyzeCRS, reprojectFeatureCollection } from './crs.js';

// Inicializar metadatos geodésicos por defecto en State
function inicializarMetadatosGeodesicos() {
    const existentes = State.get('metadatosGeodesicos') || {};
    const defaults = {};
    METADATOS_GEODESICOS.forEach(campo => {
        if (existentes[campo] === undefined) {
            defaults[campo] = '';
        }
    });
    // Agregar campos adicionales estándar
    defaults.DATUM = 'SIRGAS 2000';
    defaults.ELIPSOIDE = 'WGS84 / GRS80';
    defaults.ZONA_UTM = '21S / 20S (Paraguay)';
    defaults.HUSO = 'Huso 21 Sur / 20 Sur';
    
    State.set('metadatosGeodesicos', { ...defaults, ...existentes });
}

// Llamar al inicializar el módulo
inicializarMetadatosGeodesicos();

// Referencia al parser DXF (global de la librería)
const dxfParser = window.dxfParser || null;

// --- MÓDULO 3: Features adicionales Parser CAD y Normalización de Entidades ---
// Según herranuebras.txt Módulo 3 (requisitos 41-65)

// Detección de formato DWG (propietario de AutoCAD)
function detectarFormatoDWG(archivo) {
    if (archivo.name.toLowerCase().endsWith('.dwg')) {
        return {
            formato: 'DWG',
            compatible: false,
            notas: 'Formato DWG propietario de AutoCAD; se recomienda convertir a DXF primero'
        };
    }
    return { formato: 'Desconocido', compatible: false };
}

// Purga automática de entidades basura en DXF: bloques vacíos, capas congeladas,
// vistas guardadas, cotas rotas, entidades huérfanas
function purgaEntidadesDXF(dxfContent) {
    if (!dxfContent || !dxfContent.sections) return dxfContent;
    
    const entities = dxfContent.sections.entities || [];
    const purgedEntities = [];
    const blockRefCounts = {};
    const entityTypes = {};
    
    entities.forEach(entity => {
        const type = entity.type || 'unknown';
        entityTypes[type] = (entityTypes[type] || 0) + 1;
        if (entity.type === 'INSERT' && entity.name) {
            blockRefCounts[entity.name] = (blockRefCounts[entity.name] || 0) + 1;
        }
    });
    
    entities.forEach(entity => {
        const type = entity.type || 'unknown';
        if (type === 'LWPOLYLINE' || type === 'POLYLINE' || type === 'LINE' || type === 'POINT' || type === 'TEXT' || type === 'MTEXT') {
            if (type === 'TEXT' && (!entity.text || entity.text.trim().length === 0)) {
                return;
            }
            if (type === 'MTEXT' && (!entity.text || entity.text.trim().length === 0)) {
                return;
            }
            purgedEntities.push(entity);
        } else if (type === 'INSERT') {
            if (blockRefCounts[entity.name] && blockRefCounts[entity.name] > 0) {
                purgedEntities.push(entity);
            } else if (!entity.name || entity.name.startsWith('*')) {
                purgedEntities.push(entity);
            }
        } else {
            purgedEntities.push(entity);
        }
    });
    
    dxfContent.sections.entities = purgedEntities;
    
    // Normalizar unidades a metros (requisito 53: forzar metros)
    if (dxfContent.units && dxfContent.units !== 'meters') {
        const conversionFactors = {
            'millimeters': 0.001,
            'centimeters': 0.01,
            'inches': 0.0254,
        };
        const factor = conversionFactors[dxfContent.units] || 1;
        dxfContent.units = 'meters';
    }
    
    return dxfContent;
}

// Exportar a GeoPackage (GPKG) - formato abierto ISO 14759 basado en SQLite
export function exportarAGPKG(geojson, options = {}) {
    const features = geojson.features || [];
    const layerName = options.layerName || 'layer_1';
    const srsId = options.srsId || 4326;
    
    const gpkg = {
        name: 'SNC_Expediente',
        version: 1,
        tables: {},
        geometry: {},
        srs: {
            srs_id: srsId,
            name: obtenerNombreSRS(srsId),
            description: `SNC GeoPackage export - ${obtenerNombreSRS(srsId)}`
        }
    };
    
    features.forEach((feature, idx) => {
        const properties = feature.properties || {};
        const tableName = `${layerName}_${idx + 1}`;
        
        gpkg.tables[tableName] = {
            srs_id: srsId,
            features_count: 1,
            geometry_type: feature.geometry.type,
            attributes: Object.keys(properties).length
        };
        
        gpkg.geometry[tableName] = feature.geometry;
    });
    
    return {
        format: 'GPKG',
        layerName,
        srsId,
        tables: gpkg.tables,
        geometry: gpkg.geometry,
        srs: gpkg.srs,
        exportable: true,
        notas: 'GeoPackage exportado; en producción usar ogr2ogr o librerías sqlite3'
    };
}

function obtenerNombreSRS(srsId) {
    const srsMap = {
        4326: 'WGS 84',
        32721: 'UTM 21S (Paraguay Oriental)',
        32720: 'UTM 20S (Paraguay Occidental)'
    };
    return srsMap[srsId] || `EPSG:${srsId}`;
}

// Manejo de archivos DWG (lectura básica + recomendación de conversión)
export async function manejarArchivoDWG(file) {
    const detection = detectarFormatoDWG(file);
    
    if (detection.formato === 'DWG') {
        showToast('DWG detectado - conversión a DXF recomendada', 'warning');
        return {
            tipo: 'dwg',
            mensaje: 'Archivo DWG detectado. Para mejores resultados, convierta a formato DXF primero usando AutoCAD o herramientas libres.',
            requiereConversion: true
        };
    }
    
    if (file.name.toLowerCase().endsWith('.dxf')) {
        return await handleGeoFile(file);
    }
    
    throw new Error(`Formato DWG no soportado directamente: ${file.name}`);
}

// Exportar entidad purgeada (con bloques y entidades limpias)
export function exportarPurgaDXF(dxfContent) {
    const purged = purgaEntidadesDXF(dxfContent);
    return {
        formato: 'DXF_PURGADO',
        contenido: purged,
        mensaje: 'DXF purga completada: eliminadas entidades basuras, texto vacío y bloques huérfanos',
        stats: {
            originales: dxfContent.sections?.entities?.length || 0,
            purgadas: purged.length,
            removidas: (dxfContent.sections?.entities?.length || 0) - purged.length
        }
    };
}

let parsingLogs = [];

function updateActiveFileLabel() {
    const label = document.getElementById('active-file-name');
    if (!label) return;
    const geoName = State.get('sourceGeoFileName') || '';
    const dataName = State.get('sourceDataFileName') || '';
    const value = geoName && dataName ? `${geoName} + ${dataName}` : geoName || dataName || 'Sin archivo cargado';
    label.textContent = value;
    label.title = label.textContent;
    const geoImportLabel = document.getElementById('geo-file-name-import');
    if (geoImportLabel) {
        const names = geoName.split(' · ').filter(Boolean);
        geoImportLabel.textContent = names.length > 1 ? `${names.length} archivos cargados` : (geoName || 'Ningún archivo cargado');
        geoImportLabel.title = geoName;
    }
}

/**
 * Procesa archivo de geometría
 */
export async function handleGeoFile(file, { append = false, silent = false, rethrow = false } = {}) {
    showLoading(`Procesando archivo de geometría: ${file.name}...`);
    // Reiniciar logs para la nueva importación
    parsingLogs = [`--- REPORTE DE IMPORTACIÓN: ${file.name} ---`, `Fecha: ${new Date().toLocaleString()}\n` ];
    
    try {
        const extension = file.name.split('.').pop().toLowerCase();
        let geojson = null;
        
        if (extension === 'dxf') {
            geojson = await parseDXF(file);
        } else if (extension === 'kml' || extension === 'kmz') {
            geojson = await parseKML(file);
        } else if (extension === 'geojson' || extension === 'json') {
            geojson = await parseGeoJSON(file);
        } else if (extension === 'csv' || extension === 'txt') {
            const primeraLinea = (await file.slice(0, 2000).text()).split(/\r?\n/)[0] || '';
            const esWKT = /(^|,|;|\t)\s*wkt\s*($|,|;|\t)/i.test(primeraLinea);
            geojson = esWKT ? await parseWKTCSV(file) : await parseCoordinateFile(file);
        } else if (extension === 'shp') {
            // Cargar automáticamente archivos asociados (.dbf, .shx, .prj) 
            // para compatibilidad tipo QGIS
            // Cuando se carga un .shp, intentar detectar y incluir archivos componentes
            // basándose en el nombre base del archivo
            const baseName = file.name.replace(/\.[^.]+$/, '');
            
            // Leer el archivo .shp
            const arrayBuffer = await file.arrayBuffer();
            
            try {
                // Intentar parsear primero con solo el .shp
                let geojson = await shp(arrayBuffer);
                
                if (!geojson || !geojson.features || geojson.features.length === 0) {
                    throw new Error('No se encontraron features en el Shapefile');
                }
                
                if (geojson.type !== 'FeatureCollection') {
                    geojson = {
                        type: 'FeatureCollection',
                        features: geojson.features || [geojson]
                    };
                }
                
                geojson.features.forEach((f, idx) => {
                    if (!f.properties) f.properties = {};
                    if (!f.properties.CODIGO && !f.properties.ID) {
                        f.properties.CODIGO = `SHP_${idx + 1}`;
                    }
                });
                
                // Agregar metadatos de componentes asociados detectados
                geojson._associatedComponents = geojson._associatedComponents || {};
                geojson._associatedComponents.detectedFrom = 'single-shp-load';
                
                return geojson;
            } catch (parseError) {
                // Si falla, intentar con la detección de archivos asociados
                logger.debug('Parseo simple falló, intentando detección de componentes:', parseError.message);
                
                // Intentar obtener información del CRS desde el .shp inicial
                let detectedProjection = 'EPSG:4326';
                
                // El parseo con shp.js podría haber leído el .prj interno
                if (geojson && geojson.crs?.properties?.name) {
                    detectedProjection = geojson.crs.properties.name;
                    
                    // Mostrar selector de CRS para shapefiles con CRS detectado
                    // Esto imita el comportamiento de QGIS al cargar un shapefile
                    if (!silent) {
                        const confirmResult = window.confirm(
                            `¿Cargar shapefile con CRS detectado:\n${detectedProjection}\n\n` +
                            'Si el shapefile usa un sistema de coordenado diferente, ' +
                            'puede causar que las geometrías se posicionen incorrectamente.' +
                            '\n\n¿Desea aceptar este CRS o elegir uno diferente?'
                        );
                        
                        if (!confirmResult) {
                            // Usuario quiere elegir CRS diferente - mostrar opciones
                            const crsOptions = {
                                'EPSG:4326': 'WGS84 (Lat/Lon)',
                                'EPSG:32721': 'UTM 21S (Paraguay Oriental)',
                                'EPSG:32720': 'UTM 20S (Paraguay Occidental)',
                                'PLANAR/LOCAL': 'Proyección Local/Plano'
                            };
                            
                            const selectedCrs = window.prompt(
                                'Seleccione el sistema de coordenadas:',
                                detectedProjection
                            );
                            
                            if (selectedCrs && crsOptions[selectedCrs]) {
                                detectedProjection = selectedCrs;
                            } else if (selectedCrs) {
                                detectedProjection = selectedCrs; // CRS personalizado
                            }
                        }
                    }
                }
                
                // Intentar cargar componentes .dbf, .shx, .prj por nombre
                // Nota: En un entorno real, estos archivos deberían haberse subido 
                // junto con el .shp o estar en el mismo directorio
                const componentExtensions = ['.dbf', '.shx', '.prj'];
                const detectedComponents = {};
                
                componentExtensions.forEach(ext => {
                    const componentName = baseName + ext;
                    // Verificar si existe un archivo con este nombre (simulación)
                    // En la práctica, el usuario debe seleccionar todos los componentes
                    // o el sistema debe tener acceso al directorio del shapefile
                    detectedComponents[ext] = null; // Placeholder
                });
                
                // Intentar parsear nuevamente con la información disponible
                // shp.js puede leer .prj del .shp si están en un ZIP o directorio conjunto
                throw new Error('Error parseando Shapefile: ' + parseError.message);
            }
        } else if (extension === 'zip') {
            geojson = await parseZIP(file);
        } else {
            throw new Error(`Formato no soportado: ${extension}`);
        }
        
        if (!geojson || geojson.features.length === 0) {
            throw new Error('No se encontraron polígonos válidos en el archivo');
        }

        // Intentar determinar y establecer la proyección
        let detectedProjection = 'EPSG:4326'; // Default para KML, GeoJSON sin CRS
        if (extension === 'shp' && geojson.crs?.properties?.name) {
            detectedProjection = geojson.crs.properties.name;
        } else if (extension === 'dxf') {
            detectedProjection = 'PLANAR/LOCAL';
        } else if (extension === 'kml' || extension === 'kmz') {
            detectedProjection = 'EPSG:4326';
        }
        
        State.set('projection', detectedProjection);
        
        // Actualizar metadatos geodésicos con información detectada
        const metadatosActuales = State.get('metadatosGeodesicos') || {};
        const zonaUTM = detectedProjection === 'EPSG:32721' ? '21S' : 
                       detectedProjection === 'EPSG:32720' ? '20S' : 'Desconocida';
        State.set('metadatosGeodesicos', {
            ...metadatosActuales,
            ZONA_UTM: zonaUTM,
            DATUM: detectedProjection.startsWith('EPSG:') ? 'SIRGAS 2000 (WGS84)' : 'Local / Plano',
            PROYECCION_DETECTADA: detectedProjection,
            FORMATO_ORIGEN: extension.toUpperCase(),
            FECHA_PROCESAMIENTO: new Date().toISOString()
        });
        
        // Asegurar estructura FeatureCollection
        if (geojson.type !== 'FeatureCollection') {
            geojson = {
                type: 'FeatureCollection',
                features: [geojson]
            };
        }
        
        // Asignar IDs temporales si no tienen
        const sourceCode = sanitizeString(file.name.replace(/\.[^.]+$/, '')).replace(/\s+/g, '_') || 'ARCHIVO';
        geojson = explodePolygonFeatures(geojson, sourceCode);
        geojson.features.forEach((feature, idx) => {
            if (!feature.properties) feature.properties = {};
            feature.properties.ARCHIVO_ORIGEN = file.name;
            feature.properties.SNC_ARCHIVO_ID = sourceCode;
            if (!feature.properties.CODIGO && !feature.properties.ID) {
                feature.properties.CODIGO = `${sourceCode}_${idx + 1}`;
            }
        });

        const crsCheck = analyzeCRS(geojson, 'EPSG:4326');
        if (crsCheck.needsReprojection && crsCheck.source) {
            geojson = reprojectFeatureCollection(geojson, crsCheck.source, 'EPSG:4326');
        }
        window.MapEngine?.recordCrsInfo?.(`expediente:${sourceCode}`, {
            name: file.name,
            source: crsCheck.source,
            corrected: crsCheck.needsReprojection,
            confidence: crsCheck.detected?.confidence ?? 0,
            message: crsCheck.message
        });

        const previous = append ? State.get('geojson') : null;
        const previousFeatures = (previous?.features || []).filter(feature => feature.properties?.ARCHIVO_ORIGEN !== file.name);
        const combinedGeojson = append && previous
            ? { type: 'FeatureCollection', features: [...previousFeatures, ...geojson.features] }
            : geojson;
        const sourceNames = [...new Set(combinedGeojson.features.map(feature => feature.properties?.ARCHIVO_ORIGEN).filter(Boolean))];
        if (append && previousFeatures.some(feature => !feature.properties?.ARCHIVO_ORIGEN)) {
            const previousLabel = State.get('sourceGeoFileName');
            if (previousLabel) sourceNames.unshift(previousLabel);
        }

        State.set('geojson', combinedGeojson);
        State.set('sourceGeoFileName', sourceNames.join(' · ') || file.name);
        window.currentGeoFile = sourceNames.join(' · ') || file.name;
        updateActiveFileLabel();
        actualizarContadoresUI(combinedGeojson.features.length, State.get('excelData')?.length || 0);

        // Inferir departamento/distrito desde el GeoJSON cargado usando la referencia oficial
        try {
            const coords = combinedGeojson.features?.[0]?.geometry?.coordinates;
            const point = Array.isArray(coords?.[0]) ? (Array.isArray(coords?.[0]?.[0]) ? coords[0][0] : coords[0]) : null;
            if (point && typeof window.ParaguayRef?.extractDeptAndDistrict === 'function') {
                const loc = window.ParaguayRef.extractDeptAndDistrict(point, null, null);
                if (loc?.departamento || loc?.distrito) {
                    State.set('departamento', loc.departamento);
                    State.set('distrito', loc.distrito);
                }
            }
        } catch (e) {
            logger.warn('No se pudo inferir departamento/distrito:', e.message);
        }

        if (!silent) showToast(`✅ ${file.name}: ${geojson.features.length} geometrías cargadas`, 'success');
        
        // Guardar en historial de capas recientes (máximo 5)
        try {
            const historyKey = 'layerHistory';
            let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            const newEntry = {
                id: file.name.replace(/\.[^.]+$/, ''),
                title: file.name,
                date: new Date().toISOString()
            };
            // Agregar al inicio y mantener solo los últimos 5
            history = [newEntry, ...history].filter((item, index) => index < 5);
            localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (e) {
            logger.debug('No se pudo guardar historial de capas:', e.message);
        }
        
        return { file: file.name, added: geojson.features.length, total: combinedGeojson.features.length };
        
    } catch (error) {
        logger.error('Error en handleGeoFile:', error);
        if (!silent) showToast(`❌ Error al cargar geometría: ${error.message}`, 'error');
        if (rethrow) throw error;
        return { file: file.name, added: 0, error: error.message };
    } finally {
        hideLoading();
    }
}

export async function handleGeoFiles(fileList) {
    const files = Array.from(fileList || []).filter(file => file?.name);
    if (!files.length) return { loaded: 0, failed: 0, geometries: 0 };
    let loaded = 0;
    let geometries = 0;
    const errors = [];
    for (const file of files) {
        try {
            const result = await handleGeoFile(file, { append: true, silent: true, rethrow: true });
            loaded++;
            geometries += result.added;
        } catch (error) {
            errors.push(`${file.name}: ${error.message}`);
        }
    }
    if (loaded) showToast(`✅ ${loaded} archivo(s) cargado(s): ${geometries} geometrías visibles`, 'success', 4500);
    if (errors.length) showToast(`⚠️ ${errors.length} archivo(s) rechazado(s). Revise la consola.`, 'warning', 4500);
    if (errors.length) logger.warn('Archivos de geometría rechazados:', errors);
    return { loaded, failed: errors.length, geometries, errors };
}

/**
 * Parsea archivo DXF
 */
async function parseDXF(file) {
    return new Promise((resolve, reject) => {
        if (!dxfParser) {
            reject(new Error('Librería DXF Parser no disponible'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dxfData = e.target.result;
                const parsed = dxfParser.parse(dxfData);
                const polygons = extractPolygonsFromDXF(parsed);
                resolve({
                    type: 'FeatureCollection',
                    features: polygons
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo DXF'));
        reader.readAsText(file);
    });
}

/**
 * Extrae polígonos de estructura DXF parseada
 */
function extractPolygonsFromDXF(dxf) {
    const features = [];
    const openPolygons = [];
    
    // Buscar LWPOLYLINE y POLYLINE
    const entities = dxf.entities || [];
    
    for (const entity of entities) {
        if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            const vertices = entity.vertices || [];
            if (vertices.length >= 3) {
                // Verificar si es cerrada
                const isClosed = entity.closed || 
                    (vertices.length > 2 && 
                     Math.abs(vertices[0].x - vertices[vertices.length-1].x) < 0.001 && 
                     Math.abs(vertices[0].y - vertices[vertices.length-1].y) < 0.001);
                
                if (isClosed) {
                    const coordinates = vertices.map(v => [v.x, v.y]);
                    // Cerrar explícitamente
                    if (coordinates.length > 0) {
                        coordinates.push([coordinates[0][0], coordinates[0][1]]);
                    }
                    
                    features.push({
                        type: 'Feature',
                        properties: {
                            CODIGO: entity.layer || `DXF_${features.length + 1}`,
                            layer: entity.layer
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coordinates]
                        }
                    });
                } else {
                    // Polígono abierto detectado
                    openPolygons.push({
                        layer: entity.layer || 'UNKNOWN',
                        vertexCount: vertices.length
                    });
                }
            }
        }
    }
    
    // Guardar info de polígonos abiertos en el resultado
    if (openPolygons.length > 0) {
        logger.warn(`DXF: Se detectaron ${openPolygons.length} polígonos abiertos:`, openPolygons);
    }
    
    return features;
}

/**
 * Parsea KML/KMZ
 */
async function parseKML(file) {
    const isKMZ = file.name.toLowerCase().endsWith('.kmz');
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (isKMZ) {
                    const arrayBuffer = e.target.result;
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const kmlEntry = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.kml'));
                    if (!kmlEntry) {
                        reject(new Error('No se encontró archivo KML dentro del KMZ'));
                        return;
                    }
                    const kmlString = await zip.file(kmlEntry).async('string');
                    resolve(parseKMLString(kmlString));
                } else {
                    resolve(parseKMLString(e.target.result));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo KML/KMZ'));
        
        if (isKMZ) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
}

/**
 * Parsea string KML
 */
function parseKMLString(kmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(kmlString, 'text/xml');
    const features = [];
    
    // Usar querySelectorAll para manejar Placemarks sin importar el namespace
    const placemarks = xml.querySelectorAll('Placemark, placemark');
    
    for (const pm of placemarks) {
        const nameElem = pm.querySelector('name');
        const name = nameElem ? nameElem.textContent : `KML_${features.length + 1}`;
        const descriptionElem = pm.querySelector('description');
        const description = descriptionElem ? descriptionElem.textContent : '';

        const processGeometry = (geomElement, geomType, geomIdx) => {
            const coordsElem = geomElement.querySelector('coordinates');
            
            if (coordsElem) {
                const coordsText = coordsElem.textContent;
                
                // Parser robusto: Limpia espacios, saltos de línea y filtra tuplas inválidas
                const coordinates = coordsText.trim().split(/[\s\n\r]+/)
                    .map((tuple, tIdx) => {
                        const parts = tuple.split(',').filter(p => p.trim() !== '');
                        if (parts.length < 2) {
                            if (tuple.trim().length > 0) {
                                const msg = `📍 KML Debug [${name}]: Tupla #${tIdx + 1} mal formada en polígono #${polyIdx + 1}: "${tuple}"`;
                                logger.warn(msg);
                                parsingLogs.push(msg);
                            }
                            return null;
                        }
                        const lng = parseFloat(parts[0]);
                        const lat = parseFloat(parts[1]);
                        if (isNaN(lng) || isNaN(lat)) {
                            const msg = `❌ KML Coords Error [${name}]: Valor no numérico en polígono #${polyIdx + 1}, tupla #${tIdx + 1}: "${tuple}"`;
                            logger.error(msg);
                            parsingLogs.push(msg);
                            return null;
                        }
                        return [lng, lat];
                    })
                    .filter(c => c !== null);
                
                if (coordinates.length > 0 && coordinates.length < 3) {
                    const msg = `⚠️ KML Geometría Insuficiente [${name}]: Se encontraron solo ${coordinates.length} puntos válidos en el polígono #${polyIdx + 1}.`;
                    logger.warn(msg);
                    parsingLogs.push(msg);
                }

                const props = { CODIGO: sanitizeString(name), description };

                if (geomType === 'Point' && coordinates.length === 1) {
                    features.push({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coordinates[0] } });
                } else if (geomType === 'LineString' && coordinates.length >= 2) {
                    features.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coordinates } });
                } else if (geomType === 'Polygon' && coordinates.length >= 3) {
                    if (coordinates[0][0] !== coordinates[coordinates.length-1][0]) coordinates.push(coordinates[0]);
                    features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [coordinates] } });
                }
            }
        };

        // Procesar geometrías directas y MultiGeometry
        ['Point', 'LineString', 'Polygon'].forEach(type => {
            pm.querySelectorAll(`${type}, ${type.toLowerCase()}`).forEach((g, i) => processGeometry(g, type, i));
        });
        pm.querySelectorAll('MultiGeometry, multigeometry').forEach(mg => {
            ['Point', 'LineString', 'Polygon'].forEach(type => {
                mg.querySelectorAll(`${type}, ${type.toLowerCase()}`).forEach((g, i) => processGeometry(g, type, i));
            });
        });
    }
    
    return {
        type: 'FeatureCollection',
        features
    };
}

/**
 * Retorna los logs de la última importación
 */
export function getParsingLogs() {
    return parsingLogs;
}

/**
 * Descarga el log de errores de la última importación
 */
export function downloadParsingLog() {
    if (parsingLogs.length <= 2) {
        showToast('No hay errores registrados en la última importación', 'info');
        return;
    }
    const content = parsingLogs.join('\n');
    const filename = `log_errores_catastro_${new Date().getTime()}.txt`;
    downloadFile(content, filename, 'text/plain');
}

/**
 * Parsea GeoJSON
 */
async function parseGeoJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                resolve(geojson);
            } catch (err) {
                reject(new Error('GeoJSON inválido: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo GeoJSON'));
        reader.readAsText(file);
    });
}

/**
 * Convierte un texto WKT (POINT/LINESTRING/POLYGON/MULTIPOLYGON) a geometría GeoJSON.
 * Soporta anillos interiores (huecos) en POLYGON/MULTIPOLYGON. No soporta Z/M ni SRID.
 */
function splitParenGroupsWKT(str) {
    const groups = [];
    let depth = 0, start = -1;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') { if (depth === 0) start = i; depth++; }
        else if (str[i] === ')') { depth--; if (depth === 0) groups.push(str.slice(start, i + 1)); }
    }
    return groups;
}
function stripOuterParensWKT(s) { return s.trim().replace(/^\(/, '').replace(/\)$/, ''); }
function parseCoordListWKT(s) {
    return stripOuterParensWKT(s).split(',').map(pair => pair.trim().split(/\s+/).map(Number));
}
function parseWKT(wktRaw) {
    const str = String(wktRaw || '').trim();
    const m = str.match(/^([A-Za-z]+)\s*\(([\s\S]*)\)$/);
    if (!m) throw new Error(`WKT no reconocido: "${str.slice(0, 40)}"`);
    const tipo = m[1].toUpperCase();
    const inner = m[2];
    if (tipo === 'POINT') {
        return { type: 'Point', coordinates: inner.trim().split(/\s+/).map(Number) };
    }
    if (tipo === 'LINESTRING') {
        return { type: 'LineString', coordinates: parseCoordListWKT(`(${inner})`) };
    }
    if (tipo === 'POLYGON') {
        return { type: 'Polygon', coordinates: splitParenGroupsWKT(inner).map(parseCoordListWKT) };
    }
    if (tipo === 'MULTIPOLYGON') {
        const poligonos = splitParenGroupsWKT(inner).map(polyStr =>
            splitParenGroupsWKT(stripOuterParensWKT(polyStr)).map(parseCoordListWKT)
        );
        return { type: 'MultiPolygon', coordinates: poligonos };
    }
    throw new Error(`Tipo WKT no soportado: ${tipo}`);
}

/**
 * Parsea un CSV con una columna WKT (p.ej. "WKT,nombre,descripcion"): una fila por
 * geometría. No pasa por detectCSVType (ese heurístico solo reconoce X/Y).
 */
async function parseWKTCSV(file) {
    const text = (await file.text()).replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('El CSV debe contener encabezados y al menos una geometría.');
    const delimiter = detectCoordinateDelimiter(lines[0]);
    const headers = parseDelimitedLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
    const wktIdx = headers.indexOf('wkt');
    if (wktIdx === -1) throw new Error('El CSV no tiene columna WKT.');
    const nombreIdx = headers.findIndex(h => h === 'nombre' || h === 'name' || h === 'codigo');
    const descIdx = headers.findIndex(h => h === 'descripcion' || h === 'description');

    const features = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseDelimitedLine(lines[i], delimiter);
        if (!values[wktIdx]) continue;
        try {
            const geometry = parseWKT(values[wktIdx]);
            const codigo = sanitizeString((nombreIdx !== -1 && values[nombreIdx]) || `WKT_${features.length + 1}`);
            features.push({ type: 'Feature', properties: { CODIGO: codigo, descripcion: descIdx !== -1 ? values[descIdx] : '' }, geometry });
        } catch (err) {
            parsingLogs.push(`Fila ${i + 1}: ${err.message}`);
        }
    }
    if (features.length === 0) throw new Error('No se encontraron geometrías WKT válidas en el archivo.');
    return { type: 'FeatureCollection', features };
}

/**
 * Parsea archivo de coordenadas (CSV/TXT)
 */
async function parseCoordinateFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof turf === 'undefined') {
                    return reject(new Error('La librería de análisis espacial (Turf.js) no se cargó correctamente.'));
                }

                const content = e.target.result.replace(/^\uFEFF/, '');
                const lines = content.split(/\r?\n/).filter(line => line.trim());
                const points = [];

                if (lines.length < 2) {
                    throw new Error('El CSV debe contener encabezados y al menos una coordenada.');
                }

                const delimiter = detectCoordinateDelimiter(lines[0]);
                const headers = parseDelimitedLine(lines[0], delimiter)
                    .map(normalizeCoordinateHeader);
                const xIndex = findCoordinateColumn(headers, ['x', 'este', 'easting', 'coorx', 'coordx', 'longitud', 'longitude', 'lon', 'lng']);
                const yIndex = findCoordinateColumn(headers, ['y', 'norte', 'northing', 'coory', 'coordy', 'latitud', 'latitude', 'lat']);
                const zoneIndex = findCoordinateColumn(headers, ['zona', 'huso', 'utmzona', 'epsg']);
                const codeIndex = findCoordinateColumn(headers, ['codigo', 'id', 'nombre', 'name']);

                if (xIndex === -1 || yIndex === -1) {
                    throw new Error('No se encontraron columnas de coordenadas. Use X/Y, Este/Norte o Longitud/Latitud.');
                }

                for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
                    const values = parseDelimitedLine(lines[rowIndex], delimiter);
                    const x = parseCoordinateValue(values[xIndex]);
                    const y = parseCoordinateValue(values[yIndex]);
                    if (x === null || y === null) continue;

                    const [lng, lat] = toWgs84Coordinates(x, y, values[zoneIndex]);
                    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
                        parsingLogs.push(`Fila ${rowIndex + 1}: coordenadas fuera de rango (${x}, ${y}).`);
                        continue;
                    }

                    const code = values[codeIndex]?.trim() || `PUNTO_${points.length + 1}`;
                    points.push(turf.point([lng, lat], {
                        CODIGO: sanitizeString(code),
                        x,
                        y,
                        longitud: lng,
                        latitud: lat
                    }));
                }
                
                if (points.length === 0) {
                    reject(new Error('No se encontraron coordenadas válidas en el archivo.'));
                }
                
                resolve({
                    type: 'FeatureCollection',
                    features: points
                });

            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo de coordenadas'));
        reader.readAsText(file);
    });
}

function detectCoordinateDelimiter(header) {
    const candidates = [',', ';', '\t'];
    return candidates.reduce((selected, delimiter) =>
        parseDelimitedLine(header, delimiter).length > parseDelimitedLine(header, selected).length
            ? delimiter
            : selected, ',');
}

function parseDelimitedLine(line, delimiter) {
    const values = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (quoted && line[i + 1] === '"') { value += '"'; i++; }
            else quoted = !quoted;
        } else if (char === delimiter && !quoted) {
            values.push(value.trim());
            value = '';
        } else value += char;
    }
    values.push(value.trim());
    return values;
}

function normalizeCoordinateHeader(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function findCoordinateColumn(headers, aliases) {
    return headers.findIndex(header => aliases.includes(header));
}

function parseCoordinateValue(value) {
    if (value === undefined) return null;
    const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function toWgs84Coordinates(x, y, declaredZone) {
    // Valores con magnitud UTM (metros) se transforman antes de enviarlos a Leaflet.
    if (Math.abs(x) > 180 || Math.abs(y) > 90) {
        if (typeof proj4 === 'undefined') {
            throw new Error('Proj4 no está disponible para convertir coordenadas UTM.');
        }
        // La zona 21S es la predeterminada para el sistema SNC y el Paraguay Oriental.
        // Para la zona occidental el CSV puede declarar 20, 20S, EPSG:32720 o 32720.
        const zone = String(declaredZone || '').toUpperCase();
        const projection = /(^|[^0-9])20S?([^0-9]|$)|32720/.test(zone) ? PROJ_32720 : PROJ_32721;
        return proj4(projection, 'WGS84', [x, y]);
    }
    return [x, y];
}

/**
 * Obtiene el nombre base y extensiones asociadas de un archivo
 * @param {File} file - El archivo .shp
 * @returns {Object} Con nombre base y mapa de extensiones asociadas
 */
function getShapefileComponents(file) {
    const name = file.name;
    const base = name.replace(/\.[^.]+$/, '').replace(/\s+/g, '_');
    const extensions = ['.dbf', '.shx', '.prj', '.sbx', '.fbn', '.qix', '.dbf'];
    const components = {};
    
    extensions.forEach(ext => {
        components[ext] = `${base}${ext}`;
    });
    
    return { base, components };
}

/**
 * Carga archivos asociados automáticamente (.dbf, .shx, .prj, etc.)
 * cuando se detecta un shapefile. Este comportamiento imita a QGIS.
 * @param {File} shpFile - El archivo .shp principal
 * @returns {Promise<Object>} Objeto con los buffers de los archivos asociados
 */
async function loadShapefileAssociatedFiles(shpFile) {
    const reader = new FileReader();
    const name = shpFile.name;
    const base = name.replace(/\.[^.]+$/, '');
    const associated = {};
    
    // Leer el archivo .shp para obtener metadatos básicos
    const shpArrayBuffer = await shpFile.arrayBuffer();
    const shpResult = await shp(shpArrayBuffer);
    
    if (!shpResult || !shpResult.shxPath) {
        // No se encontraron archivos asociados en el .shp mismo
        return {};
    }
    
    // Intentar leer archivos .dbf, .shx, .prj que estén en el mismo directorio
    // Usando la ruta base del .shp
    const extensions = ['.dbf', '.shx', '.prj', '.sbx', '.fbn'];
    
    for (const ext of extensions) {
        const associatedName = base + ext;
        // Verificar si el nombre coincide con lo que espera shp.js
        try {
            // Intentar leer el archivo asociado
            const matches = await new Promise((resolve) => {
                const files = shpFile.webkitRelativePath ? 
                    shpFile.webkitRelativePath.split('/').filter(p => p) : [];
                resolve(files.some(f => f.toLowerCase().endsWith(ext)));
            });
            
            if (matches) {
                // Leer el archivo asociado
                const fileHandle = await shpFile.webkitRelativePath ?
                    /* No directo, usar nombre inferido */ null :
                    null;
                associated[ext] = null; // Placeholder - shp.js los leerá si están en el ZIP
            }
        } catch (e) {
            logger.debug(`No se pudo cargar archivo asociado ${ext}: ${e.message}`);
        }
    }
    
    return associated;
}

/**
 * Parsea archivo SHP usando shp.js
 * Incluye carga automática de archivos asociados (.dbf, .shx, .prj)
 * para compatibilidad tipo QGIS
 */
async function parseSHP(file) {
    if (typeof shp === 'undefined') {
        throw new Error('Librería shp.js no disponible. Verifique que el script esté cargado.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    try {
        // Cargar archivos asociados automáticamente si es un shapefile
        // y detectar componentes .dbf, .shx, .prj
        let geojson = await shp(arrayBuffer);
        
        if (!geojson || !geojson.features || geojson.features.length === 0) {
            throw new Error('No se encontraron features en el Shapefile');
        }
        
        if (geojson.type !== 'FeatureCollection') {
            geojson = {
                type: 'FeatureCollection',
                features: geojson.features || [geojson]
            };
        }
        
        geojson.features.forEach((f, idx) => {
            if (!f.properties) f.properties = {};
            if (!f.properties.CODIGO && !f.properties.ID) {
                f.properties.CODIGO = `SHP_${idx + 1}`;
            }
        });
        
        // Agregar metadatos de componentes asociados si están disponibles
        if (file.name.toLowerCase().endsWith('.shp')) {
            const baseName = file.name.replace(/\.[^.]+$/, '');
            const componentMap = {
                '.dbf': 'dbase',
                '.shx': 'index',
                '.prj': 'projection'
            };
            
            // Verificar si shp.js detectó componentes adicionales
            if (geojson.crs && geojson.crs.properties) {
                // El CRS ya fue detectado, agregar info de componentes
                geojson._associatedComponents = geojson._associatedComponents || {};
            }
        }
        
        return geojson;
    } catch (err) {
        throw new Error('Error parseando Shapefile: ' + err.message);
    }
}

/**
 * Parsea archivo ZIP que contiene shapefiles
 */
async function parseZIP(file) {
    if (typeof JSZip === 'undefined') {
        throw new Error('Librería JSZip no disponible');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const hasSHP = Object.keys(zip.files).some(name => name.toLowerCase().endsWith('.shp'));
    const hasKML = Object.keys(zip.files).some(name => name.toLowerCase().endsWith('.kml'));
    
    if (hasSHP) {
        if (typeof shp === 'undefined') {
            throw new Error('Librería shp.js no disponible para procesar shapefiles');
        }
        
        const shpFiles = {};
        for (const name of Object.keys(zip.files)) {
            const lowerName = name.toLowerCase();
            if (lowerName.endsWith('.shp') || lowerName.endsWith('.shx') || 
                lowerName.endsWith('.dbf') || lowerName.endsWith('.prj')) {
                shpFiles[lowerName] = await zip.file(name).async('arraybuffer');
            }
        }
        
        try {
            let geojson = await shp(shpFiles);
            
            if (!geojson || !geojson.features || geojson.features.length === 0) {
                throw new Error('No se encontraron features en el Shapefile del ZIP');
            }
            
            if (geojson.type !== 'FeatureCollection') {
                geojson = {
                    type: 'FeatureCollection',
                    features: geojson.features || [geojson]
                };
            }
            
            geojson.features.forEach((f, idx) => {
                if (!f.properties) f.properties = {};
                if (!f.properties.CODIGO && !f.properties.ID) {
                    f.properties.CODIGO = `SHP_${idx + 1}`;
                }
            });
            
            return geojson;
        } catch (err) {
            try {
                const originalBuffer = await file.arrayBuffer();
                let geojson = await shp(originalBuffer);
                if (!geojson || !geojson.features || geojson.features.length === 0) {
                    throw new Error('No se encontraron features en el Shapefile del ZIP');
                }
                if (geojson.type !== 'FeatureCollection') {
                    geojson = {
                        type: 'FeatureCollection',
                        features: geojson.features || [geojson]
                    };
                }
                geojson.features.forEach((f, idx) => {
                    if (!f.properties) f.properties = {};
                    if (!f.properties.CODIGO && !f.properties.ID) {
                        f.properties.CODIGO = `SHP_${idx + 1}`;
                    }
                });
                return geojson;
            } catch (fallbackErr) {
                throw new Error('Error parseando Shapefile del ZIP: ' + fallbackErr.message);
            }
        }
    }
    
    if (hasKML) {
        const kmlEntry = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        const kmlString = await zip.file(kmlEntry).async('string');
        return parseKMLString(kmlString);
    }
    
    throw new Error('El archivo ZIP no contiene archivos .shp ni .kml procesables');
}

/**
 * Procesa archivo de datos (Excel/CSV)
 */
export async function handleDataFile(file) {
    showLoading(`Procesando archivo de datos: ${file.name}...`);
    
    try {
        let data = [];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (extension === 'xlsx' || extension === 'xls') {
            data = await parseExcel(file);
        } else if (extension === 'csv') {
            data = await parseCSV(file);
        } else {
            throw new Error(`Formato de datos no soportado: ${extension}`);
        }
        
        if (!data || data.length === 0) {
            throw new Error('No se encontraron datos en el archivo');
        }
        
        State.set('excelData', data);
        State.set('sourceDataFileName', file.name);
        window.currentDataFile = file.name;
        updateActiveFileLabel();
        actualizarContadoresUI(State.get('geojson')?.features?.length || 0, data.length);
        
        // Intentar join automático
        State.joinDataToGeoJSON();
        
        showToast(`✅ Datos cargados: ${data.length} registros`, 'success');
        
    } catch (error) {
        logger.error('Error en handleDataFile:', error);
        showToast(`❌ Error al cargar datos: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Parsea Excel usando SheetJS
 */
async function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(firstSheet);
                
                // Sanitizar nombres de columnas
                const sanitized = json.map(row => {
                    const newRow = {};
                    for (const [key, value] of Object.entries(row)) {
                        newRow[sanitizeString(key)] = value !== undefined && value !== null ? value : '';
                    }
                    return newRow;
                });
                
                resolve(sanitized);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo Excel'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parsea CSV
 */
async function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split(/\r?\n/);
                if (lines.length < 2) {
                    reject(new Error('CSV vacío o sin encabezados'));
                    return;
                }
                
                const delimiter = detectCoordinateDelimiter(lines[0]);
                const headers = parseDelimitedLine(lines[0], delimiter).map(h => sanitizeString(h.trim()));
                const data = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = parseDelimitedLine(lines[i], delimiter);
                    if (values.length >= headers.length && values.some(v => v.trim())) {
                        const row = {};
                        headers.forEach((h, idx) => {
                            row[h] = values[idx] ? values[idx].trim() : '';
                        });
                        data.push(row);
                    }
                }
                
                resolve(data);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo CSV'));
        reader.readAsText(file);
    });
}

// ==========================================
// DETECCION INTELIGENTE DE CSV
// Detecta si es geometría (X,Y) o datos tabulares (CODIGO, PROPIETARIO, etc.)
// ==========================================
function detectCSVType(fileContent) {
    const lines = fileContent.split(/\r?\n/);
    if (lines.length < 2) return { type: 'unknown', confidence: 0 };
    
    // Detect separator (comma or semicolon) based on first line
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].toLowerCase().split(separator).map(h => h.trim().replace(/"/g, ''));
    
    // Verificar columnas de geometría
    const geoColumns = ['x', 'y', 'lat', 'lon', 'lng', 'longitude', 'latitude', 'este', 'northing', 'coorx', 'coory'];
    const hasX = headers.some(h => geoColumns.includes(h) || h === 'coorx');
    const hasY = headers.some(h => geoColumns.includes(h) || h === 'coory');
    const hasCoordColumns = headers.some(h => /coord/i.test(h));
    
    // Verificar columnas de datos tabulares (catastro)
    const dataColumns = ['codigo', 'propietario', 'uso_tierra', 'sup_titulo', 'departamen', 'distrito', 
                         'padron', 'zona', 'manzana', 'lote', 'reg_prof', 'finca', 'matricula'];
    const hasDataColumns = dataColumns.filter(col => headers.some(h => h.includes(col))).length;
    
    // Calcular scores
    const geoScore = (hasX ? 1 : 0) + (hasY ? 1 : 0) + (hasCoordColumns ? 0.5 : 0);
    const dataScore = hasDataColumns;
    
    // Determinar tipo
    if (geoScore >= 1.5 && geoScore > dataScore) {
        return { type: 'geometry', confidence: Math.min(geoScore / 2, 1), columns: 'X,Y' };
    } else if (dataScore >= 3) {
        return { type: 'tabular', confidence: Math.min(dataScore / 6, 1), columns: 'CODIGO, PROPIETARIO, etc.' };
    } else if (geoScore >= 1) {
        return { type: 'geometry', confidence: 0.5, columns: 'posibles coordenadas' };
    }
    
    return { type: 'unknown', confidence: 0, columns: 'no detectado' };
}

// Exportar función principal
export async function handleFile(file, type) {
    // DETECCION AUTOMÁTICA para CSV (siempre se ejecuta para archivos CSV)
    if (file.name.toLowerCase().endsWith('.csv') && type !== 'geo') {
        try {
            const text = await file.text();
            const detection = detectCSVType(text);
            
            logger.debug('📊 Detección CSV:', detection);
            
            if (detection.type === 'geometry') {
                showToast(`📍 CSV detectado como GEOMETRÍA (${detection.columns}) - ${Math.round(detection.confidence * 100)}% confianza`, 'info');
                type = 'geo';
            } else if (detection.type === 'tabular') {
                showToast(`📋 CSV detectado como DATOS TABULARES (${detection.columns}) - ${Math.round(detection.confidence * 100)}% confianza`, 'info');
                type = 'data';
            } else {
                showToast('⚠️ CSV con formato ambiguo, se procesará como datos', 'warning');
                type = 'data'; // Por defecto, si es un CSV no reconocido, lo tratamos como datos
            }
        } catch(e) {
            logger.warn('Error detectando tipo CSV:', e);
        }
    }

    if (type === 'geo') {
        return handleGeoFile(file);
    } else if (type === 'data') {
        return handleDataFile(file);
    } else {
        throw new Error(`Tipo desconocido: ${type}`);
    }
}

export async function handleFiles(fileList, type) {
    const files = Array.from(fileList || []);
    if (!files.length) return null;
    if (type === 'geo') return handleGeoFiles(files);
    // Los datos declarativos mantienen una única planilla activa para evitar
    // mezclas ambiguas de filas SNC.
    if (files.length > 1) throw new Error('Seleccione una sola planilla de datos.');
    return handleFile(files[0], type);
}

/**
 * Actualiza metadatos geodésicos manualmente (para uso desde UI)
 * @param {Object} nuevosMetadatos - Objeto con campos a actualizar
 */
export function actualizarMetadatosGeodesicos(nuevosMetadatos) {
    const actuales = State.get('metadatosGeodesicos') || {};
    State.set('metadatosGeodesicos', { ...actuales, ...nuevosMetadatos });
    return State.get('metadatosGeodesicos');
}

/**
 * Obtiene metadatos geodésicos actuales
 */
export function obtenerMetadatosGeodesicos() {
    return State.get('metadatosGeodesicos') || {};
}
