/**
 * Motor de Importación Universal
 * Procesa DXF, KML, KMZ, GeoJSON, CSV, TXT, SHP, ZIP y Excel
 */

import { State } from './state.js';
import { sanitizeString, showLoading, hideLoading, showToast, actualizarContadoresUI, downloadFile } from './utils.js';
import { CAMPOS_REQUERIDOS, PROJ_32720, PROJ_32721, METADATOS_GEODESICOS, CONFIG_MUNICIPAL } from './config.js';
import { explodePolygonFeatures } from './geoFeatures.js';
import { logger } from './logger.js';

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

let parsingLogs = [];

function updateActiveFileLabel() {
    const label = document.getElementById('active-file-name');
    if (!label) return;
    const geoName = State.get('sourceGeoFileName') || '';
    const dataName = State.get('sourceDataFileName') || '';
    const value = geoName && dataName ? `${geoName} + ${dataName}` : geoName || dataName || 'Sin archivo cargado';
    label.textContent = `Archivo: ${value}`;
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
            geojson = await parseCoordinateFile(file);
        } else if (extension === 'shp') {
            geojson = await parseSHP(file);
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
 * Parsea archivo SHP usando shp.js
 */
async function parseSHP(file) {
    if (typeof shp === 'undefined') {
        throw new Error('Librería shp.js no disponible. Verifique que el script esté cargado.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    try {
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
                
                const headers = lines[0].split(delimiter).map(h => sanitizeString(h.trim()));
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
