/**
 * Motor cartográfico basado en Leaflet.
 *
 * Responsabilidades principales:
 * - Inicializar el mapa y las capas base.
 * - Renderizar GeoJSON de parcelas, distritos y departamentos.
 * - Proveer modos auxiliares: medición, subdivisión, inspección de parcela,
 *   captura de pantalla y descarga de caché local.
 *
 * Nota: varios métodos conservan un `window.MapEngine` shim por compatibilidad
 * con scripts globales heredados.
 */

import { MAP_CONFIG, PROJ_32721, PROJ_32720, EPSG_32720, UTM_ZONE_RANGES } from './config.js';
import * as ParaguayRef from './paraguayRef.js';
import { State } from './state.js';
import { showToast, calcularCentroide, simplifyGeometryIfNeeded, formatNumber, calcularMetricasPlanasUTM } from './utils.js';
import LayerGuard from './layerGuard.js';
import { GeometryHistory } from './geometryHistory.js';
import { createLineageEvent, getParcelId } from './lineage.js';
import { calculateRingSegments, formatMeters } from './segmentLengths.js';
import { logger } from './logger.js';

let map = null;
let parcelasLayer = null;
let deptosLayer = null;
let distritosLayer = null;
let transitionLine = null;
let topologyErrorLayer = null;
let selectedVerticesLayer = null;
let parcelNumberLabelsLayer = null;
let renderedGeojson = null;
let sncReferenceLayer = null;
let localCacheLayer = null;
let baseLayers = null;
let parcelNumberAssignmentActive = false;
let nextParcelNumber = 1;
const geometryHistory = new GeometryHistory(50);
let selectedFeatureIndex = -1;
let vertexEditSession = null;
let vertexEditMode = 'move';
let keyboardShortcutsReady = false;

// Referencia cartográfica remota: se consume únicamente como imagen WMS.
// No se realizan consultas WFS, descargas de atributos ni persistencia local.
const SNC_REFERENCE_WMS = {
    url: 'https://www.catastro.gov.py/geoserver/ows',
    layers: 'snc:parcelas_activas',
    attribution: 'Referencia visual: Servicio Nacional de Catastro (SNC), Paraguay. No constituye certificación ni plano oficial.'
};

/**
 * Chequeo centralizado de librerías críticas del mapa.
 * @param {string[]} [required] Nombres globales a validar.
 * @returns {{missing:string[], ok:string[]}}
 */
export function checkMapDependencies(required = ['L', 'proj4', 'turf', 'domtoimage']) {
    const missing = [];
    const ok = [];
    required.forEach(name => {
        if (typeof window[name] !== 'undefined') ok.push(name);
        else missing.push(name);
    });
    return { missing, ok };
}

/**
 * Evalúa el resultado de dependencias y expone mensaje de diagnóstico.
 */
export function assertMapDependencies() {
    const result = checkMapDependencies();
    if (result.missing.length) {
        showToast(`❌ Dependencias faltantes: ${result.missing.join(', ')}`, 'error');
        logger.warn('Dependencias del mapa faltantes:', result.missing);
    }
    return result;
}

// URLs alternativas para capas (más confiables)
const TILE_LAYERS = {
    // OpenStreetMap - LA MÁS CONFIABLE (siempre funciona)
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        name: '🗺️ OpenStreetMap'
    },
    // Capa Satelital (ESRI)
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© ESRI World Imagery',
        name: '🛰️ Satélite'
    },
    // Curvas de nivel topográficas (OpenTopoMap)
    topo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap (CC-BY-SA) | Datos: © OpenStreetMap contributors',
        name: '⛰️ Curvas de nivel'
    },
    // Catastro oficial (WMS parcelas_activas) como capa base
    catastro: {
        url: 'https://www.catastro.gov.py/geoserver/ows',
        layers: 'snc:parcelas_activas',
        attribution: 'Referencia visual: Servicio Nacional de Catastro (SNC), Paraguay',
        name: '🏛️ Catastro SNC'
    },
    // Humanitarian - Bueno para zonas rurales
    humanitarian: {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '© Humanitarian OSM',
        name: '🚑 Humanitarian'
    }
};

/**
 * Inicializa el mapa Leaflet y configura capas base/controles.
 * @returns {Promise<L.Map|null>} Instancia de mapa o null si falla.
 */
export async function init() {
    ensureKeyboardShortcuts();
    return new Promise((resolve, reject) => {
        let attempts = 0;
        // Esperar a que el DOM esté listo
        const tryInit = () => {
            const mapDiv = document.getElementById('map');
            if (!mapDiv && attempts < 50) {
                logger.debug('Esperando elemento #map...');
                attempts++;
                setTimeout(tryInit, 100);
                return;
            } else if (!mapDiv) {
                logger.error('No se encontró el elemento #map después de 50 intentos');
                resolve(null); // Resolvemos con null para que el flujo continúe
                return;
            }
            if (map) {
                logger.debug('Mapa ya inicializado');
                resolve(map);
                return;
            }

            try {
                if (typeof L === 'undefined') throw new Error('Leaflet no cargado');
                assertMapDependencies();

                window.__sncMapLibStatus = checkMapDependencies();
                // Debugging solicitado
                logger.debug('Leaflet:', typeof L);
                logger.debug('Map container:', document.getElementById('map'));
                const rect = document.getElementById('map').getBoundingClientRect();
                logger.debug('Tamaño del mapa:', rect.width, 'x', rect.height);

                // Definir capas base
                const layers = {
                    osm: L.tileLayer(TILE_LAYERS.osm.url, {
                        attribution: TILE_LAYERS.osm.attribution, maxZoom: 19, id: 'base-osm', crossOrigin: true
                    }),
                    satellite: L.tileLayer(TILE_LAYERS.satellite.url, {
                        attribution: TILE_LAYERS.satellite.attribution, maxZoom: 19, id: 'base-satellite', crossOrigin: true
                    }),
                    topo: L.tileLayer(TILE_LAYERS.topo.url, {
                        attribution: TILE_LAYERS.topo.attribution, id: 'base-topo', crossOrigin: true
                    }),
                    catastro: L.tileLayer.wms(TILE_LAYERS.catastro.url, {
                        layers: TILE_LAYERS.catastro.layers,
                        format: 'image/png8',
                        transparent: false,
                        tiled: true,
                        version: '1.1.1',
                        crs: L.extend({}, L.CRS.EPSG4326, { code: 'CRS:84' }),
                        attribution: TILE_LAYERS.catastro.attribution,
                        maxZoom: 21,
                        crossOrigin: true
                    }),
                    humanitarian: L.tileLayer(TILE_LAYERS.humanitarian.url, {
                        attribution: TILE_LAYERS.humanitarian.attribution, id: 'base-humanitarian', crossOrigin: true
                    })
                };
                baseLayers = layers;

                map = L.map('map', {
                    center: MAP_CONFIG.center,
                    zoom: MAP_CONFIG.zoom,
                    layers: [layers.satellite]
                });
                
                // Inicializar LayerGuard con el mapa
                LayerGuard.init(map);

                const baseMaps = {};
                baseMaps[TILE_LAYERS.osm.name] = layers.osm;
                baseMaps[TILE_LAYERS.satellite.name] = layers.satellite;
                baseMaps[TILE_LAYERS.topo.name] = layers.topo;
                baseMaps[TILE_LAYERS.catastro.name] = layers.catastro;
                baseMaps[TILE_LAYERS.humanitarian.name] = layers.humanitarian;

                const overlayMaps = {};

                // Selector de capas removido del mapa para evitar solapamiento;
                // la selección de mapa base se hace desde el panel derecho.

                // Seguidor de coordenadas UTM 21S en tiempo real
                map.on('mousemove', (e) => {
                    _updateUtmCoordsDisplay(e.latlng.lng, e.latlng.lat);
                });

                // Escala
                L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

                // Botón para ir a Asunción
                const homeControl = L.control({ position: 'topleft' });
                homeControl.onAdd = () => {
                    const div = L.DomUtil.create('div', 'leaflet-bar home-button');
                    const button = L.DomUtil.create('a', 'home-map-button', div);
                    button.href = '#';
                    button.title = 'Vuelo a Asunción';
                    button.setAttribute('aria-label', 'Vuelo a Asunción');
                    button.innerHTML = '<i class="fas fa-plane-arrival"></i>';
                    button.style.display = 'flex';
                    button.style.alignItems = 'center';
                    button.style.justifyContent = 'center';
                    button.style.width = '34px';
                    button.style.height = '34px';
                    button.style.background = '#0f172a';
                    button.style.color = '#93c5fd';
                    button.style.fontSize = '15px';
                    button.style.textDecoration = 'none';
                    L.DomEvent.disableClickPropagation(div);
                    L.DomEvent.on(button, 'click', (event) => {
                        L.DomEvent.preventDefault(event);
                        map.setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
                        showToast('Vuelo a Asunción', 'info');
                    });
                    return div;
                };
                homeControl.addTo(map);

                // Control ubicado debajo del vuelo a Asunción: enfoca el polígono de trabajo.
                const focusParcelControl = L.control({ position: 'topleft' });
                focusParcelControl.onAdd = () => {
                    const div = L.DomUtil.create('div', 'leaflet-bar focus-parcel-control');
                    const button = L.DomUtil.create('a', 'focus-parcel-button', div);
                    button.href = '#';
                    button.title = 'Centrar polígono de trabajo';
                    button.setAttribute('aria-label', 'Centrar polígono de trabajo');
                    button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                    button.style.display = 'flex';
                    button.style.alignItems = 'center';
                    button.style.justifyContent = 'center';
                    button.style.width = '34px';
                    button.style.height = '34px';
                    button.style.background = '#0f172a';
                    button.style.color = '#93c5fd';
                    button.style.fontSize = '15px';
                    button.style.textDecoration = 'none';
                    L.DomEvent.disableClickPropagation(div);
                    L.DomEvent.on(button, 'click', (event) => {
                        L.DomEvent.preventDefault(event);
                        focusWorkPolygon();
                    });
                    return div;
                };
                focusParcelControl.addTo(map);

                // Integra el selector de mapas con los controles nativos en una sola barra visual.
                const leftControls = map.getContainer().querySelector('.leaflet-top.leaflet-left');
                const baseSelector = document.getElementById('map-base-selector');
                if (leftControls && baseSelector) {
                    baseSelector.classList.add('leaflet-control');
                    leftControls.appendChild(baseSelector);
                    L.DomEvent.disableClickPropagation(baseSelector);
                    L.DomEvent.disableScrollPropagation(baseSelector);
                }

                // Forzar redimensionamiento
                setTimeout(() => {
                    if (map) map.invalidateSize();
                    logger.debug('✅ Mapa inicializado correctamente');
                    logger.debug('📍 Centro:', map.getCenter());
                    
                    // Cargar capas de referencia y ajustar automáticamente a Paraguay
                    setTimeout(async () => {
                        try {
                            const geojson = await ParaguayRef.loadLayer('distritos');
                            if (geojson) {
                                const tempLayer = L.geoJSON(geojson);
                                const bounds = tempLayer.getBounds();
                                if (bounds.isValid()) {
                                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                                    logger.debug('📍 Mapa ajustado a Paraguay');
                                }
                            }
                        } catch (e) {
                            logger.warn('No se pudieron cargar capas de referencia:', e);
                        }
                        restoreStartupView();
                    }, 500);
                }, 200);

                // También al redimensionar ventana
                window.addEventListener('resize', () => {
                    setTimeout(() => map && map.invalidateSize(), 100);
                });

                resolve(map);

            } catch (error) {
                logger.error('Error creando mapa:', error);
                // Mostrar mensaje de error en el div del mapa
                const mapDiv = document.getElementById('map');
                if (mapDiv) {
                    mapDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">❌ Error cargando el mapa. Verifica la consola.</div>';
                }
                resolve(null);
            }
        };

        tryInit();
    });
}

/**
 * Función interna para actualizar el display de coordenadas UTM
 */
function _updateUtmCoordsDisplay(lng, lat) {
    if (typeof proj4 === 'undefined') return;

    State.set('lastMouseCoords', [lng, lat]); // Guardar últimas coordenadas del mouse

    // Siempre existe una proyección para que el panel del cursor no quede en 0.00.
    const currentProjCode = State.get('currentDisplayProjection') || EPSG_32721;
    const projDefinition = (currentProjCode === EPSG_32720) ? PROJ_32720 : PROJ_32721;
    const zoneInfo = UTM_ZONE_RANGES[currentProjCode] || UTM_ZONE_RANGES[EPSG_32721];

    const utm = proj4(projDefinition, [lng, lat]);
    const utmEl = document.getElementById('utmCoords');
    const eastEl = document.getElementById('coord-e');
    const northEl = document.getElementById('coord-n');
    const utmZoneNameEl = document.getElementById('utmZoneName');
    const warningEl = document.getElementById('utmZoneWarning');

    const isOutsideZone = (lng < zoneInfo.minLng || lng > zoneInfo.maxLng);

    if (utmEl) {
        utmEl.textContent = `${formatNumber(utm[0], 3)} E, ${formatNumber(utm[1], 3)} N`;
        utmEl.style.color = isOutsideZone ? '#f87171' : 'var(--text)'; // Usar var(--text)
    }
    if (eastEl) eastEl.textContent = formatNumber(utm[0], 3);
    if (northEl) northEl.textContent = formatNumber(utm[1], 3);
    if (utmZoneNameEl) { // Si existe, ajustar su color también
        utmZoneNameEl.style.color = isOutsideZone ? '#f87171' : 'var(--primary)';
        if (warningEl) warningEl.style.display = isOutsideZone ? 'inline' : 'none';
    }
}

function getPolygonVertices(geometry) {
    if (geometry?.type === 'Polygon') return geometry.coordinates[0].slice(0, -1);
    if (geometry?.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap(polygon => polygon[0].slice(0, -1));
    }
    return [];
}

function clearVertexMarkers() {
    if (selectedVerticesLayer && map) map.removeLayer(selectedVerticesLayer);
    selectedVerticesLayer = null;
}

function getPolygonFeatures() {
    return (State.get('geojson')?.features || []).filter(feature =>
        ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
    );
}

function renderParcelNumberLabels() {
    if (!map) return;
    if (parcelNumberLabelsLayer) map.removeLayer(parcelNumberLabelsLayer);
    parcelNumberLabelsLayer = null;
    const features = getPolygonFeatures();
    const button = document.getElementById('map-tool-number-parcels');
    if (button) button.classList.toggle('hidden', features.length < 2);
    if (features.length < 2) return;

    parcelNumberLabelsLayer = L.layerGroup().addTo(map);
    features.forEach((feature, index) => {
        const number = Number(feature.properties?.PARCELA_NUMERO) || index + 1;
        const point = turf.pointOnFeature(feature).geometry.coordinates;
        L.marker([point[1], point[0]], {
            interactive: false,
            icon: L.divIcon({
                className: 'parcel-number-marker',
                html: `<span>${number}</span>`,
                iconSize: [46, 46],
                iconAnchor: [23, 23]
            })
        }).addTo(parcelNumberLabelsLayer);
    });
}

function stopParcelNumberAssignment() {
    parcelNumberAssignmentActive = false;
    nextParcelNumber = 1;
    document.getElementById('map-tool-number-parcels')?.classList.remove('active');
}

function getEditableVertexRefs(geometry) {
    if (!geometry) return [];
    const rings = geometry.type === 'Polygon'
        ? [{ path: [0], ring: geometry.coordinates?.[0] }]
        : geometry.type === 'MultiPolygon'
            ? (geometry.coordinates || []).map((polygon, polygonIndex) => ({ path: [polygonIndex, 0], ring: polygon?.[0] }))
            : [];
    return rings.flatMap(({ path, ring }) => (ring || []).slice(0, -1).map((coordinate, index) => ({ path, index, coordinate })));
}

function getRingByPath(geometry, path) {
    return path.reduce((value, key) => value?.[key], geometry.coordinates);
}

function sameCoordinate(a, b, tolerance = 1e-10) {
    return Array.isArray(a) && Array.isArray(b)
        && Math.abs(Number(a[0]) - Number(b[0])) <= tolerance
        && Math.abs(Number(a[1]) - Number(b[1])) <= tolerance;
}

/** Mueve también los vértices coincidentes para conservar límites compartidos. */
function moveCoincidentVertices(geojson, sourceFeatureIndex, path, vertexIndex, nextCoordinate) {
    const sourceGeometry = geojson.features[sourceFeatureIndex]?.geometry;
    const sourceRing = getRingByPath(sourceGeometry, path);
    const previousCoordinate = sourceRing?.[vertexIndex];
    if (!previousCoordinate) return;
    geojson.features.forEach(feature => {
        getEditableVertexRefs(feature.geometry).forEach(ref => {
            if (!sameCoordinate(ref.coordinate, previousCoordinate)) return;
            const ring = getRingByPath(feature.geometry, ref.path);
            ring[ref.index] = [...nextCoordinate];
            if (ref.index === 0) ring[ring.length - 1] = [...nextCoordinate];
        });
    });
}

function updateHistoryControls() {
    const undo = document.getElementById('map-tool-undo');
    const redo = document.getElementById('map-tool-redo');
    const edit = document.getElementById('map-tool-edit-vertices');
    if (undo) undo.disabled = !geometryHistory.canUndo || Boolean(vertexEditSession);
    if (redo) redo.disabled = !geometryHistory.canRedo || Boolean(vertexEditSession);
    if (edit) edit.classList.toggle('active', Boolean(vertexEditSession));
    document.getElementById('map-edit-commit')?.classList.toggle('hidden', !vertexEditSession);
    document.getElementById('map-edit-cancel')?.classList.toggle('hidden', !vertexEditSession);
    document.getElementById('map-edit-settings')?.classList.toggle('hidden', !vertexEditSession);
}

function getSnapToleranceMeters() {
    const value = Number(document.getElementById('map-snap-tolerance')?.value);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 100) : 0.5;
}

function getGeometrySegments(feature, featureIndex) {
    const segments = [];
    const geometry = feature?.geometry;
    const rings = geometry?.type === 'Polygon'
        ? [{ path: [0], ring: geometry.coordinates?.[0] }]
        : geometry?.type === 'MultiPolygon'
            ? (geometry.coordinates || []).map((polygon, polygonIndex) => ({ path: [polygonIndex, 0], ring: polygon?.[0] }))
            : [];
    rings.forEach(({ path, ring }) => {
        for (let index = 0; index < (ring?.length || 0) - 1; index++) {
            segments.push({ featureIndex, path, index, start: ring[index], end: ring[index + 1] });
        }
    });
    return segments;
}

function findSnapCoordinate(latlng, excludedFeatureIndex, excludedRef) {
    if (!map) return [latlng.lng, latlng.lat];
    const toleranceMeters = getSnapToleranceMeters();
    let best = null;
    let bestDistance = toleranceMeters + 1;
    const features = vertexEditSession?.draft?.features || [];
    const segments = [];
    features.forEach((feature, featureIndex) => {
        getEditableVertexRefs(feature.geometry).forEach(ref => {
            if (featureIndex === excludedFeatureIndex && ref.index === excludedRef.index && String(ref.path) === String(excludedRef.path)) return;
            const distance = map.distance(latlng, [ref.coordinate[1], ref.coordinate[0]]);
            if (distance <= toleranceMeters && distance < bestDistance) {
                best = ref.coordinate;
                bestDistance = distance;
            }
        });
        segments.push(...getGeometrySegments(feature, featureIndex));
    });
    const pointerFeature = turf.point([latlng.lng, latlng.lat]);
    segments.forEach(segment => {
        try {
            const nearest = turf.nearestPointOnLine(turf.lineString([segment.start, segment.end]), pointerFeature);
            const coordinate = nearest.geometry.coordinates;
            const distance = map.distance(latlng, [coordinate[1], coordinate[0]]);
            if (distance <= toleranceMeters && distance < bestDistance) { best = coordinate; bestDistance = distance; }
        } catch (_) { /* segmento inválido */ }
    });
    const intersectionLimit = Math.min(segments.length, 80);
    for (let i = 0; i < intersectionLimit; i++) {
        for (let j = i + 1; j < intersectionLimit; j++) {
            try {
                const intersections = turf.lineIntersect(
                    turf.lineString([segments[i].start, segments[i].end]),
                    turf.lineString([segments[j].start, segments[j].end])
                );
                intersections.features.forEach(point => {
                    const coordinate = point.geometry.coordinates;
                    const distance = map.distance(latlng, [coordinate[1], coordinate[0]]);
                    if (distance <= toleranceMeters && distance < bestDistance) { best = coordinate; bestDistance = distance; }
                });
            } catch (_) { /* intersección no calculable */ }
        }
    }
    return best ? [...best] : [latlng.lng, latlng.lat];
}

function deleteDraftVertex(ref) {
    const geometry = vertexEditSession?.draft?.features?.[vertexEditSession.featureIndex]?.geometry;
    const ring = geometry ? getRingByPath(geometry, ref.path) : null;
    if (!ring || ring.length <= 4) {
        showToast('Un polígono debe conservar al menos tres vértices.', 'warning');
        return false;
    }
    ring.splice(ref.index, 1);
    ring[ring.length - 1] = [...ring[0]];
    renderVertexEditor();
    return true;
}

function addDraftVertex(latlng) {
    const feature = vertexEditSession?.draft?.features?.[vertexEditSession.featureIndex];
    const segments = getGeometrySegments(feature, vertexEditSession.featureIndex);
    const pointer = map.latLngToContainerPoint(latlng);
    let selected = null;
    let selectedCoordinate = null;
    let bestPixels = 20;
    segments.forEach(segment => {
        const nearest = turf.nearestPointOnLine(turf.lineString([segment.start, segment.end]), turf.point([latlng.lng, latlng.lat]));
        const coordinate = nearest.geometry.coordinates;
        const pixels = pointer.distanceTo(map.latLngToContainerPoint([coordinate[1], coordinate[0]]));
        if (pixels < bestPixels) { selected = segment; selectedCoordinate = coordinate; bestPixels = pixels; }
    });
    if (!selected) {
        showToast('Haga clic sobre un segmento de la parcela.', 'warning');
        return false;
    }
    const ring = getRingByPath(feature.geometry, selected.path);
    ring.splice(selected.index + 1, 0, [...selectedCoordinate]);
    ring[ring.length - 1] = [...ring[0]];
    setVertexEditMode('move');
    renderVertexEditor();
    return true;
}

function onVertexEditMapClick(event) {
    if (vertexEditSession && vertexEditMode === 'add') addDraftVertex(event.latlng);
}

function renderVertexEditor() {
    if (!vertexEditSession || !map) return;
    clearVertexMarkers();
    selectedVerticesLayer = L.layerGroup().addTo(map);
    const feature = vertexEditSession.draft.features[vertexEditSession.featureIndex];
    getEditableVertexRefs(feature.geometry).forEach((ref, ordinal) => {
        const marker = L.marker([ref.coordinate[1], ref.coordinate[0]], {
            draggable: vertexEditMode === 'move',
            icon: L.divIcon({ className: 'vertex-edit-marker', html: `<span>${ordinal + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] })
        }).addTo(selectedVerticesLayer);
        marker.on('dragend', event => {
            const snapped = findSnapCoordinate(event.target.getLatLng(), vertexEditSession.featureIndex, ref);
            moveCoincidentVertices(vertexEditSession.draft, vertexEditSession.featureIndex, ref.path, ref.index, snapped);
            renderVertexEditor();
        });
        marker.on('click', event => {
            if (vertexEditMode !== 'delete') return;
            if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
            deleteDraftVertex(ref);
        });
    });
}

export function setVertexEditMode(mode) {
    if (!vertexEditSession || !['move', 'add', 'delete'].includes(mode)) return false;
    vertexEditMode = mode;
    ['move', 'add', 'delete'].forEach(name => document.getElementById(`map-edit-mode-${name}`)?.classList.toggle('active', name === mode));
    if (map) map.getContainer().style.cursor = mode === 'add' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : '';
    renderVertexEditor();
    return true;
}

export function startVertexEdit() {
    const current = State.get('geojson');
    if (!current?.features?.length || selectedFeatureIndex < 0) {
        showToast('Seleccione primero una parcela en el mapa.', 'info');
        return false;
    }
    if (vertexEditSession) return true;
    vertexEditSession = { original: current, draft: GeometryHistory.clone(current), featureIndex: selectedFeatureIndex };
    vertexEditMode = 'move';
    map?.on('click', onVertexEditMapClick);
    map?.closePopup();
    renderVertexEditor();
    updateHistoryControls();
    showToast('Edición topológica activa. Arrastre vértices; se ajustarán a puntos cercanos.', 'info', 5000);
    return true;
}

export function cancelVertexEdit() {
    if (!vertexEditSession) return false;
    vertexEditSession = null;
    map?.off('click', onVertexEditMapClick);
    if (map) map.getContainer().style.cursor = '';
    clearVertexMarkers();
    updateHistoryControls();
    showToast('Edición cancelada; no se modificó el expediente.', 'info');
    return true;
}

function validateEditedGeoJSON(geojson) {
    for (const [index, feature] of geojson.features.entries()) {
        if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) continue;
        if (turf.area(feature) <= 0.0001) return `La parcela ${index + 1} no tiene superficie válida.`;
        if (turf.kinks(feature).features.length) return `La parcela ${index + 1} presenta auto-intersecciones.`;
    }
    for (let i = 0; i < geojson.features.length; i++) {
        for (let j = i + 1; j < geojson.features.length; j++) {
            try {
                const overlap = turf.intersect(geojson.features[i], geojson.features[j]);
                if (overlap && turf.area(overlap) > 0.1) return `La edición genera solapamiento entre parcelas ${i + 1} y ${j + 1}.`;
            } catch (_) { /* geometrías no poligonales */ }
        }
    }
    return '';
}

export async function commitVertexEdit() {
    if (!vertexEditSession) return false;
    if (!State.getBackendToken() || !State.getBackendExpediente()) {
        showToast('Inicie sesión y abra un expediente permanente antes de guardar la edición.', 'warning', 6000);
        return false;
    }
    const error = validateEditedGeoJSON(vertexEditSession.draft);
    if (error) {
        showToast(`No se guardó: ${error}`, 'error', 6000);
        return false;
    }
    const { original, draft } = vertexEditSession;
    vertexEditSession = null;
    map?.off('click', onVertexEditMapClick);
    if (map) map.getContainer().style.cursor = '';
    geometryHistory.commit(original, draft, 'Edición de vértices');
    State.set('geojson', draft);
    State.set('validationResults', null);
    if (!await State.syncToBackend()) {
        geometryHistory.rollbackLastCommit();
        State.set('geojson', original);
        showToast('La base de datos rechazó la edición. Se restauró la geometría anterior.', 'error', 7000);
        return false;
    }
    updateHistoryControls();
    showToast('Edición topológica guardada.', 'success');
    return true;
}

export async function undoGeometryEdit() {
    if (vertexEditSession) return false;
    const previous = State.get('geojson');
    const result = geometryHistory.undo(previous);
    if (!result) return false;
    State.set('geojson', result.value);
    State.set('validationResults', null);
    if (!await State.syncToBackend()) {
        geometryHistory.redo(result.value);
        State.set('geojson', previous);
        showToast('No se pudo deshacer en la base de datos.', 'error');
        return false;
    }
    updateHistoryControls();
    showToast(`Deshacer: ${result.label}`, 'info');
    return true;
}

export async function redoGeometryEdit() {
    if (vertexEditSession) return false;
    const previous = State.get('geojson');
    const result = geometryHistory.redo(previous);
    if (!result) return false;
    State.set('geojson', result.value);
    State.set('validationResults', null);
    if (!await State.syncToBackend()) {
        geometryHistory.undo(result.value);
        State.set('geojson', previous);
        showToast('No se pudo rehacer en la base de datos.', 'error');
        return false;
    }
    updateHistoryControls();
    showToast(`Rehacer: ${result.label}`, 'info');
    return true;
}

export function toggleVertexEdit() {
    return vertexEditSession ? cancelVertexEdit() : startVertexEdit();
}

function ensureKeyboardShortcuts() {
    if (keyboardShortcutsReady || typeof document === 'undefined') return;
    keyboardShortcutsReady = true;
    document.addEventListener('keydown', event => {
        const tag = event.target?.tagName?.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        if (event.key === 'Escape' && vertexEditSession) {
            event.preventDefault();
            cancelVertexEdit();
            return;
        }
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
            event.preventDefault();
            undoGeometryEdit();
        } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
            event.preventDefault();
            redoGeometryEdit();
        }
    });
}

export function toggleParcelNumberAssignment() {
    const features = getPolygonFeatures();
    if (features.length < 2) {
        showToast('Se requieren al menos dos polígonos para asignar el orden.', 'warning');
        return false;
    }
    if (parcelNumberAssignmentActive) {
        stopParcelNumberAssignment();
        showToast('Asignación de parcelas cancelada.', 'info');
        return false;
    }
    parcelNumberAssignmentActive = true;
    nextParcelNumber = 1;
    document.getElementById('map-tool-number-parcels')?.classList.add('active');
    showToast('Seleccione en el mapa la parcela Nº 1 y luego la Nº 2.', 'info', 5000);
    return true;
}

function assignNumberFromMap(feature) {
    if (!parcelNumberAssignmentActive) return false;
    const featureId = feature.properties?.SNC_PARCELA_ID;
    if (!featureId || !State.assignParcelNumber(featureId, nextParcelNumber)) return false;
    const assigned = nextParcelNumber;
    nextParcelNumber++;
    renderParcelNumberLabels();
    window.DataTable?.render?.();
    if (nextParcelNumber > getPolygonFeatures().length) {
        stopParcelNumberAssignment();
        showToast('Orden de parcelas guardado en la planilla.', 'success');
    } else {
        showToast(`Parcela Nº ${assigned} asignada. Seleccione la Nº ${nextParcelNumber}.`, 'info');
    }
    return true;
}

export function closeParcelInspector() {
    if (!vertexEditSession) selectedFeatureIndex = -1;
    clearVertexMarkers();
    const inspector = document.getElementById('parcel-inspector');
    inspector?.classList.add('hidden');
    inspector?.querySelector('#parcel-inspector-vertices')?.replaceChildren();
    window.DataTable?.clearSelection?.();
    map?.closePopup?.();
}

function showParcelInspector(feature) {
    const inspector = document.getElementById('parcel-inspector');
    if (!inspector || !map || !feature?.geometry) return;

    clearVertexMarkers();
    selectedFeatureIndex = State.get('geojson')?.features?.indexOf(feature) ?? -1;
    const props = feature.properties || {};
    const vertexRefs = getEditableVertexRefs(feature.geometry);
    const vertices = vertexRefs.map(ref => ref.coordinate);
    const currentProjCode = State.get('currentDisplayProjection');
    const projection = currentProjCode === EPSG_32720 ? PROJ_32720 : PROJ_32721;
    const metrics = calcularMetricasPlanasUTM(feature, currentProjCode);
    const areaM2 = metrics.areaM2;
    props.SUP_GEOM = metrics.areaM2;
    props.PERIMETRO_M = metrics.perimeterM;

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText('parcel-inspector-title', `Parcela Nº ${props.PARCELA_NUMERO || '—'} · ${props.PADRON || props.CODIGO || props.ID || 'S/D'}`);
    setText('parcel-inspector-area', `${formatNumber(areaM2, 2)} m²`);
    setText('parcel-inspector-perimeter', `${formatNumber(metrics.perimeterM, 2)} m`);
    setText('parcel-inspector-count', String(vertices.length));
    setText('lote-area', `${formatNumber(areaM2, 2)} m²`);

    const vertexList = document.getElementById('parcel-inspector-vertices');
    if (vertexList) vertexList.replaceChildren();
    if (vertices.length > 0) {
        selectedVerticesLayer = L.layerGroup().addTo(map);
        const primaryRing = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates[0]
            : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates[0]?.[0] : [];
        const segments = calculateRingSegments(primaryRing, coordinate => typeof proj4 !== 'undefined' ? proj4(projection, coordinate) : coordinate);
        vertices.forEach(([lng, lat], index) => {
            const [east, north] = typeof proj4 !== 'undefined' ? proj4(projection, [lng, lat]) : [lng, lat];
            const item = document.createElement('li');
            item.className = 'vertex-coordinate-row rounded bg-slate-900 px-2 py-2 text-slate-200';
            item.innerHTML = `
                <span class="vertex-coordinate-number">${index + 1}</span>
                <label><span>E</span><input type="number" step="0.001" value="${Number(east).toFixed(3)}" aria-label="Este del vértice ${index + 1}"></label>
                <label><span>N</span><input type="number" step="0.001" value="${Number(north).toFixed(3)}" aria-label="Norte del vértice ${index + 1}"></label>
                <button type="button" title="Guardar coordenada en el expediente y la base de datos" aria-label="Guardar coordenada ${index + 1}"><i class="fas fa-floppy-disk"></i></button>
                ${segments[index] ? `<span class="col-span-full mt-1 text-[10px] font-sans text-cyan-300">Tramo ${segments[index].startVertex}–${segments[index].endVertex}: ${formatMeters(segments[index].lengthMeters)} m</span>` : ''}`;
            const inputs = item.querySelectorAll('input');
            item.querySelector('button').addEventListener('click', async () => {
                const button = item.querySelector('button');
                button.disabled = true;
                try {
                    await updateVertexCoordinate(selectedFeatureIndex, vertexRefs[index].path, vertexRefs[index].index, inputs[0].value, inputs[1].value);
                } finally {
                    button.disabled = false;
                }
            });
            vertexList?.appendChild(item);

            L.circleMarker([lat, lng], { radius: 8, color: '#bfdbfe', weight: 2, fillColor: '#1d4ed8', fillOpacity: 1 })
                .bindTooltip(String(index + 1), { permanent: true, direction: 'center', className: 'vertex-number-label' })
                .addTo(selectedVerticesLayer);
        });
        segments.forEach(segment => {
            const startPoint = map.latLngToLayerPoint([segment.start[1], segment.start[0]]);
            const endPoint = map.latLngToLayerPoint([segment.end[1], segment.end[0]]);
            let angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180 / Math.PI;
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;
            L.marker([segment.midpoint[1], segment.midpoint[0]], {
                interactive: false,
                icon: L.divIcon({
                    className: 'segment-length-marker',
                    html: `<span style="--segment-angle:${angle.toFixed(2)}deg">${formatMeters(segment.lengthMeters)} m</span>`,
                    iconSize: [110, 20], iconAnchor: [55, 10]
                })
            }).addTo(selectedVerticesLayer);
        });
    } else if (vertexList) {
        const item = document.createElement('li');
        item.className = 'rounded bg-slate-900 px-2 py-1 text-slate-400';
        item.textContent = 'Seleccione un polígono para ver sus vértices.';
        vertexList.appendChild(item);
    }

    inspector.classList.remove('hidden');
    if (vertices.length > 0) {
        const bounds = L.latLngBounds(vertices.map(([lng, lat]) => [lat, lng]));
        if (bounds.isValid()) map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [360, 50], maxZoom: 19 });
    }
}

/** Actualiza un vértice desde coordenadas UTM y persiste el expediente. */
export async function updateVertexCoordinate(featureIndex, path, vertexIndex, easting, northing) {
    if (!State.getBackendToken() || !State.getBackendExpediente()) {
        showToast('Inicie sesión y abra un expediente permanente antes de modificar coordenadas.', 'warning', 6000);
        return false;
    }
    const east = Number(easting);
    const north = Number(northing);
    if (!Number.isFinite(east) || !Number.isFinite(north)) {
        showToast('Ingrese coordenadas Este y Norte válidas.', 'error');
        return false;
    }
    if (east < 100000 || east > 900000 || north < 0 || north > 10000000) {
        showToast('La coordenada UTM está fuera del rango técnico permitido.', 'error');
        return false;
    }
    const current = State.get('geojson');
    const feature = current?.features?.[featureIndex];
    if (!feature?.geometry) return false;
    const projection = State.get('currentDisplayProjection') === EPSG_32720 ? PROJ_32720 : PROJ_32721;
    let geographic;
    try {
        geographic = proj4(projection, 'WGS84', [east, north]);
    } catch (error) {
        showToast(`No se pudo reproyectar la coordenada: ${error.message}`, 'error');
        return false;
    }
    const draft = GeometryHistory.clone(current);
    moveCoincidentVertices(draft, featureIndex, path, Number(vertexIndex), geographic);
    const error = validateEditedGeoJSON(draft);
    if (error) {
        showToast(`No se guardó: ${error}`, 'error', 6000);
        return false;
    }
    const previousValidation = State.get('validationResults');
    geometryHistory.commit(current, draft, `Coordenada UTM del vértice ${Number(vertexIndex) + 1}`);
    State.set('geojson', draft);
    State.set('validationResults', null);
    const persisted = await State.syncToBackend();
    if (!persisted) {
        geometryHistory.rollbackLastCommit();
        State.set('geojson', current);
        State.set('validationResults', previousValidation);
        showToast('La base de datos rechazó el cambio. La coordenada anterior fue restaurada.', 'error', 7000);
        return false;
    }
    selectedFeatureIndex = featureIndex;
    showParcelInspector(draft.features[featureIndex]);
    updateHistoryControls();
    showToast('Coordenada actualizada y guardada en la base de datos.', 'success', 6000);
    return true;
}

/** Confirma una geometría producida por COGO/geoprocesamiento con las mismas garantías. */
export async function commitExternalGeometry(nextGeojson, label = 'Operación geométrica', { lineageEvent = null } = {}) {
    if (!State.getBackendToken() || !State.getBackendExpediente()) {
        showToast('Inicie sesión y abra un expediente permanente antes de crear geometrías.', 'warning', 6000);
        return false;
    }
    const error = validateEditedGeoJSON(nextGeojson);
    if (error) { showToast(`No se guardó: ${error}`, 'error', 7000); return false; }
    const current = State.get('geojson') || { type: 'FeatureCollection', features: [] };
    const previousLineage = State.get('parcelLineage') || [];
    geometryHistory.commit(current, nextGeojson, label);
    if (lineageEvent) State.set('parcelLineage', [...previousLineage, lineageEvent]);
    State.set('geojson', nextGeojson);
    State.set('validationResults', null);
    if (!await State.syncToBackend()) {
        geometryHistory.rollbackLastCommit();
        if (lineageEvent) State.set('parcelLineage', previousLineage);
        State.set('geojson', current);
        showToast('La base de datos rechazó la operación geométrica.', 'error', 7000);
        return false;
    }
    updateHistoryControls();
    showToast(`${label} guardada en la base de datos.`, 'success');
    return true;
}

export function getMap() { return map; }

/** Limpia la capa del expediente únicamente al iniciar un expediente nuevo. */
export function clearProjectLayer() {
    if (vertexEditSession) cancelVertexEdit();
    geometryHistory.reset(null);
    updateHistoryControls();
    closeParcelInspector();
    if (parcelasLayer && map?.hasLayer(parcelasLayer)) map.removeLayer(parcelasLayer);
    if (transitionLine && map?.hasLayer(transitionLine)) map.removeLayer(transitionLine);
    parcelasLayer = null;
    if (parcelNumberLabelsLayer && map) map.removeLayer(parcelNumberLabelsLayer);
    parcelNumberLabelsLayer = null;
    stopParcelNumberAssignment();
    transitionLine = null;
    renderedGeojson = null;
}

/**
 * Carga y renderiza un GeoJSON en el mapa.
 * @param {Object} geojson GeoJSON FeatureCollection de parcelas.
 */
export function loadGeoJSON(geojson) {
    if (!map) {
        logger.error('Mapa no inicializado');
        return;
    }

    geometryHistory.syncExternal(geojson);
    updateHistoryControls();

    // Una actualización de atributos puede notificar el mismo GeoJSON. No se
    // debe quitar ni recrear una parcela que ya está en el mapa.
    if (parcelasLayer && renderedGeojson === geojson && map.hasLayer(parcelasLayer)) {
        renderParcelNumberLabels();
        return;
    }

    // Limpiar capa anterior solo al cargar una geometría distinta.
    if (parcelasLayer) {
        map.removeLayer(parcelasLayer);
    }
    closeParcelInspector();

    // Limpiar línea de transición previa
    if (transitionLine && map) {
        map.removeLayer(transitionLine);
        transitionLine = null;
    }

    if (!geojson || !geojson.features || geojson.features.length === 0) {
        showToast('No hay geometrías para mostrar', 'warning');
        return;
    }

    // Detectar si la propiedad cruza el meridiano -60 (Zona de Transición)
    try {
        // Solo calcular bbox y area si hay al menos un poligono o linea
        if (geojson.features.some(f => f.geometry.type !== 'Point')) {
            const bbox = turf.bbox(geojson);
            if (bbox[0] < -60 && bbox[2] > -60) {
                // Dibujar línea roja de división en el meridiano -60
                transitionLine = L.polyline([
                    [bbox[1] - 0.02, -60],
                    [bbox[3] + 0.02, -60]
                ], {
                    color: '#ef4444', // Rojo intenso
                    weight: 4,
                    dashArray: '10, 10',
                    interactive: false
                }).addTo(map);

                // Calcular porcentajes para el mensaje flotante inmediato
                const totalArea = turf.area(geojson);
                if (totalArea > 0) {
                    const westBox = turf.bboxPolygon([-100, -90, -60, 90]);
                    let westArea = 0;
                    geojson.features.forEach(f => {
                        const inter = turf.intersect(f, westBox);
                        if (inter) westArea += turf.area(inter);
                    });
                    const pWest = ((westArea / totalArea) * 100).toFixed(1);
                    const pEast = (100 - pWest).toFixed(1);
                    
                    showToast(`⚠️ Propiedad en Transición: ${pWest}% Chaco (20S) / ${pEast}% Oriental (21S)`, 'warning');
                }
            }
        }
    } catch (e) { logger.warn('Error en análisis visual de zonas:', e); }

    parcelasLayer = L.geoJSON(geojson, {
        style: {
            color: '#4f46e5',
            weight: 3,
            fillColor: '#4f46e5',
            fillOpacity: 0.2
        },
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: '#f59e0b',
                color: '#b45309',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            
            if (feature.geometry.type === 'Point') {
                layer.bindPopup(`
                    <div class="popup-header">Punto ${props.CODIGO || ''}</div>
                    <div class="popup-body">
                        <div class="popup-info-row">
                            <span class="popup-info-label">Este (X)</span>
                            <span class="popup-info-value">${props.x?.toFixed(6) || 'N/A'}</span>
                        </div>
                        <div class="popup-info-row">
                            <span class="popup-info-label">Norte (Y)</span>
                            <span class="popup-info-value">${props.y?.toFixed(6) || 'N/A'}</span>
                        </div>
                    </div>
                `);
                layer.on('click', () => {
                    if (assignNumberFromMap(feature)) return;
                    window.DataTable?.selectByParcelNumber?.(feature.properties?.PARCELA_NUMERO, true);
                    showParcelInspector(feature);
                });
                return;
            }

            const valGeom = props.SUP_GEOM || 0;
            const valTitulo = parseFloat(props.SUP_TITULO) || 0;

            // Calcular discrepancia para el color de la barra (5% tolerancia)
            const diffPercent = valTitulo > 0 ? Math.abs(valGeom - valTitulo) / valTitulo : 0;
            const isHighDiff = diffPercent > 0.05;
            const diffLabel = valTitulo > 0 ? `${(diffPercent * 100).toFixed(2)}%` : '0.00%';

            // Calcular porcentajes relativos para las barras
            const maxArea = Math.max(valGeom, valTitulo);
            const wGeom = maxArea > 0 ? (valGeom / maxArea * 100) : 0;
            const wTitulo = maxArea > 0 ? (valTitulo / maxArea * 100) : 0;

            const chartHtml = `
                <div class="mt-4 pt-3 border-t border-slate-100">
                    <div class="text-[10px] font-bold text-slate-400 uppercase mb-2">Comparativa de Áreas</div>
                    <div class="space-y-2">
                        <div>
                            <div class="flex justify-between text-[10px] mb-1">
                                <span class="text-slate-500">Título</span>
                                <span class="font-bold text-slate-700">${valTitulo.toFixed(2)} m²</span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div class="bg-indigo-400 h-full rounded-full transition-all" style="width: ${wTitulo}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-[10px] mb-1">
                                <span class="text-slate-500">SIG (Dibujado) <span class="${isHighDiff ? 'text-red-500' : 'text-slate-400'} font-normal text-[9px] ml-1">(${diffLabel} diff)</span></span>
                                <span class="font-bold ${isHighDiff ? 'text-red-600' : 'text-emerald-600'}">${valGeom.toFixed(2)} m²</span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div class="${isHighDiff ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full transition-all" style="width: ${wGeom}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            layer.bindPopup(`
                <div class="popup-header">Parcela ${props.CODIGO || 'S/N'}</div>
                <div class="popup-body">
                    <div class="text-2xl font-black text-indigo-600 mb-2">${valGeom.toFixed(2)} <span class="text-xs font-normal text-slate-400">m²</span></div>
                    <div class="popup-info-row">
                        <span class="popup-info-label">Propietario</span>
                        <span class="popup-info-value truncate max-w-[100px]">${props.PROPIETARIO || 'N/A'}</span>
                    </div>
                    <div class="popup-info-row">
                        <span class="popup-info-label">Uso</span>
                        <span class="popup-info-value">${props.USO_TIERRA || 'N/A'}</span>
                    </div>
                    ${chartHtml}
                    <div class="text-[9px] text-slate-400 mt-2 italic text-center">Click para más detalles</div>
                </div>
            `, { closeButton: false });
            layer.on('click', () => {
                if (assignNumberFromMap(feature)) return;
                window.DataTable?.selectByParcelNumber?.(feature.properties?.PARCELA_NUMERO, true);
                showParcelInspector(feature);
            });

            if (props._validationError) {
                layer.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
            }
        }
    }).addTo(map);
    // Harmonize duplicates: if layer wasn't added, guard using internal map reference
    if (!parcelasLayer._map) {
        parcelasLayer.addTo(map);
    }
    if (parcelasLayer) parcelasLayer.options.id = 'parcelas';
    renderedGeojson = geojson;
    renderParcelNumberLabels();

    // Ajustar vista
    try {
        const bounds = parcelasLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } catch (e) {
        logger.warn('Error ajustando vista:', e);
    }
}

export function selectParcelByNumber(parcelNumber) {
    const number = Number(parcelNumber);
    const feature = getPolygonFeatures().find(item => Number(item.properties?.PARCELA_NUMERO) === number);
    if (!feature) return false;
    showParcelInspector(feature);
    return true;
}

/**
 * Activa/desactiva la capa visual de referencia SNC.
 * @param {boolean} visible Si se muestra la capa.
 * @returns {boolean} Resultado de la operación.
 */
/** Centra y ajusta la vista a todos los polígonos actualmente cargados. */
/** Restablece la vista determinista después de actualizar la aplicación. */
export function restoreStartupView() {
    if (!map) return false;
    const geojson = State.get('geojson');
    if (geojson?.features?.length) {
        if (!parcelasLayer || renderedGeojson !== geojson) loadGeoJSON(geojson);
        return focusWorkPolygon();
    }
    map.setView(MAP_CONFIG.center, MAP_CONFIG.zoom, { animate: false });
    return true;
}

export function focusWorkPolygon() {
    if (!map || !parcelasLayer) {
        showToast('Primero cargue el polígono de trabajo.', 'info');
        return false;
    }
    const bounds = parcelasLayer.getBounds();
    if (!bounds || !bounds.isValid()) {
        showToast('La geometría cargada no tiene una extensión válida.', 'warning');
        return false;
    }
    map.fitBounds(bounds, { padding: [55, 55], maxZoom: 19, animate: true });
    showToast('Polígono de trabajo centrado.', 'success');
    return true;
}

export function toggleSNCReferenceLayer(visible) {
    if (!map) {
        showToast('Mapa no inicializado', 'error');
        return false;
    }

    const setSncStatus = (text) => {
        const a = document.getElementById('sncLayerStatus');
        const b = document.getElementById('snc-layer-status');
        if (a) a.textContent = text;
        if (b) b.textContent = text;
    };

    if (visible) {
        if (!sncReferenceLayer) {
            // El servicio SNC publica esta capa en CRS:84, no en Web Mercator.
            // Leaflet transforma cada tesela desde el mapa base (EPSG:3857).
            const sncCrs84 = L.extend({}, L.CRS.EPSG4326, { code: 'CRS:84' });
            sncReferenceLayer = L.tileLayer.wms(SNC_REFERENCE_WMS.url, {
                layers: SNC_REFERENCE_WMS.layers,
                styles: 'parcelas',
                format: 'image/png8', // png8 es mucho más ligero que png normal para vectores
                transparent: true,
                tiled: true,
                version: '1.1.1',
                crs: sncCrs84,
                opacity: 0.58,
                attribution: SNC_REFERENCE_WMS.attribution,
                maxZoom: 21,
                crossOrigin: true,
                // Optimizaciones de rendimiento:
                keepBuffer: 4, // Mantiene más tiles en memoria (evita recargar al mover un poco)
                updateWhenIdle: true, // Solo pide tiles cuando el usuario deja de moverse
                updateWhenZooming: false, // No pide tiles intermedios durante el zoom
                updateInterval: 200 // Demora la petición de tiles para evitar spam al servidor
            });
            sncReferenceLayer.on('tileerror', () => {
                setSncStatus('Capa remota: sin conexión');
                showToast('No se pudo cargar la referencia SNC. Verifique conectividad y condiciones de acceso.', 'warning');
            });
        }
        sncReferenceLayer.addTo(map);
        setSncStatus('Capa remota: activada');
        showToast('Referencia visual SNC activada', 'info');
    } else if (sncReferenceLayer) {
        map.removeLayer(sncReferenceLayer);
        setSncStatus('Capa remota: desactivada');
        showToast('Referencia visual SNC desactivada', 'info');
    }
    return true;
}

/**
 * Activa/desactiva la capa de departamentos.
 * @param {boolean} visible Si se muestra la capa.
 */
export async function toggleDeptos(visible) {
    if (!map) {
        showToast('Mapa no inicializado', 'error');
        return;
    }

    if (visible) {
        if (deptosLayer) {
            map.addLayer(deptosLayer);
            showToast('📍 Capas PY: 🟣 Departamentos activados', 'info');
        } else {
            showToast('Cargando departamentos...', 'info');
            const deptosGeoJSON = await ParaguayRef.loadLayer('deptos');
            if (deptosGeoJSON) {
                deptosLayer = L.geoJSON(deptosGeoJSON, {
                    style: {
                        color: '#8b5cf6', // Purple
                        weight: 2,
                        fillColor: '#c4b5fd', // Light purple
                        fillOpacity: 0.3
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const name = props.DPTO_DESC ||
                            props.NAM_DPTO ||
                            props.DEPARTAMENTO ||
                            props.NOMBRE ||
                            'N/A';
                        layer.bindPopup(`<strong>Departamento:</strong> ${name}`);
                    }
                }).addTo(map);
                if (!deptosLayer._map) deptosLayer.addTo(map);
                if (deptosLayer) deptosLayer.options.id = 'deptos';
                // Ajustar vista a la nueva capa
                try {
                    const bounds = deptosLayer.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                } catch (e) {
                    logger.warn('Error ajustando vista a departamentos:', e);
                }
                showToast('📍 Capas PY: 🟣 Departamentos cargados', 'success');
            } else {
                showToast('📍 Capas PY: 🟣 No se pudieron cargar los departamentos', 'error');
            }
        }
    } else {
        if (deptosLayer) {
            map.removeLayer(deptosLayer);
            showToast('📍 Capas PY: 🟣 Departamentos desactivados', 'info');
        }
    }
}

/**
 * Activa/desactiva la capa de distritos.
 * @param {boolean} visible Si se muestra la capa.
 */
export async function toggleDistritos(visible) {
    if (!map) {
        showToast('Mapa no inicializado', 'error');
        return;
    }

    if (visible) {
        if (distritosLayer) {
            map.addLayer(distritosLayer);
            showToast('📍 Capas PY: 🔵 Distritos activados', 'info');
        } else {
            showToast('Cargando distritos...', 'info');
            const distritosGeoJSON = await ParaguayRef.loadLayer('distritos');
            if (distritosGeoJSON) {
                distritosLayer = L.geoJSON(distritosGeoJSON, {
                    style: {
                        color: '#3b82f6', // Blue
                        weight: 1,
                        fillColor: '#bfdbfe', // Light blue
                        fillOpacity: 0.2
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const name = props.DIST_DESC ||
                            props.NAM_DISTRI ||
                            props.DISTRITO ||
                            props.NOMBRE ||
                            'N/A';
                        layer.bindPopup(`<strong>Distrito:</strong> ${name}`);
                    }
                }).addTo(map);
                if (!distritosLayer._map) distritosLayer.addTo(map);
                if (distritosLayer) distritosLayer.options.id = 'distritos';
                // Ajustar vista a la nueva capa
                try {
                    const bounds = distritosLayer.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                } catch (e) {
                    logger.warn('Error ajustando vista a distritos:', e);
                }
                showToast('📍 Capas PY: 🔵 Distritos cargados', 'success');
            } else {
                showToast('📍 Capas PY: 🔵 No se pudieron cargar los distritos', 'error');
            }
        }
    } else {
        if (distritosLayer) {
            map.removeLayer(distritosLayer);
            showToast('📍 Capas PY: 🔵 Distritos desactivados', 'info');
        }
    }
}

/**
 * Activa/desactiva el modo de medición interactiva.
 * @param {boolean} [force] Estado forzado opcional.
 * @returns {boolean} Nuevo estado del modo.
 */
export function toggleMeasureMode() {
    if (!map) return false;

    const measureMode = !State.get('measureMode');
    State.set('measureMode', measureMode);

    if (measureMode) {
        map.getContainer().style.cursor = 'crosshair';
        showToast('📏 Modo medición: haz clic en el mapa', 'info');

        let points = [];
        let line = null;
        let markers = [];

        const onClick = (e) => {
            const { lat, lng } = e.latlng;
            points.push([lat, lng]);

            const marker = L.marker([lat, lng]).addTo(map);
            markers.push(marker);

            if (points.length >= 2) {
                if (line) map.removeLayer(line);
                line = L.polyline(points, { color: '#ef4444', weight: 3 }).addTo(map);

                let totalDist = 0;
                for (let i = 1; i < points.length; i++) {
                    const from = turf.point([points[i - 1][1], points[i - 1][0]]);
                    const to = turf.point([points[i][1], points[i][0]]);
                    totalDist += turf.distance(from, to, { units: 'meters' });
                }
                showToast(`📏 Distancia: ${totalDist.toFixed(2)} m`, 'info');
            }
        };

        map.on('click', onClick);
        const measureCleanup = () => {
            map.off('click', onClick);
            markers.forEach(m => map.removeLayer(m));
            if (line) map.removeLayer(line);
        };

        // Exponer cleanup localmente para la desactivación controlada.
        State._measureCleanup = measureCleanup;
    } else {
        if (State._measureCleanup) State._measureCleanup();
        map.getContainer().style.cursor = '';
        showToast('📏 Modo medición desactivado', 'info');
    }

    return measureMode;
}

/**
 * Activa/desactiva el modo de subdivisión por línea de corte.
 */
export function toggleSplitMode() {
    if (!map) {
        showToast('Mapa no inicializado', 'error');
        return;
    }

    const splitModeActive = !State.get('splitModeActive');
    State.set('splitModeActive', splitModeActive);

    if (splitModeActive) {
        map.getContainer().style.cursor = 'crosshair';
        showToast('✂️ Modo subdivisión: Dibuja una línea de corte', 'info');

        let splitLine = null;
        let splitPoints = [];
        let markers = [];

        const onClick = (e) => {
            const { lat, lng } = e.latlng;
            splitPoints.push([lat, lng]);

            const marker = L.circleMarker([lat, lng], {
                radius: 6,
                color: '#dc2626',
                fillColor: '#f87171',
                fillOpacity: 1
            }).addTo(map);
            markers.push(marker);

            if (splitPoints.length >= 2) {
                if (splitLine) map.removeLayer(splitLine);
                splitLine = L.polyline(splitPoints, {
                    color: '#dc2626',
                    weight: 3,
                    dashArray: '10, 5'
                }).addTo(map);
            }
        };

        const onDblClick = (e) => {
            e.originalEvent.preventDefault();
            if (splitPoints.length < 2) {
                showToast('Se necesitan al menos 2 puntos para la línea de corte', 'warning');
                return;
            }

            performSplit(splitPoints);
            cleanup();
            State.set('splitModeActive', false);
            map.getContainer().style.cursor = '';
        };

        const cleanup = () => {
            map.off('click', onClick);
            map.off('dblclick', onDblClick);
            markers.forEach(m => map.removeLayer(m));
            if (splitLine) map.removeLayer(splitLine);
            splitLine = null;
            splitPoints = [];
            markers = [];
        };

        State._splitCleanup = cleanup;
        map.on('click', onClick);
        map.on('dblclick', onDblClick);

    } else {
        if (State._splitCleanup) State._splitCleanup();
        map.getContainer().style.cursor = '';
        showToast('✂️ Modo subdivisión desactivado', 'info');
    }
}

/**
 * Realiza la subdivisión de polígonos usando la línea de corte
 */
function performSplitLegacy(splitPoints) {
    const geojson = State.get('geojson');
    if (!geojson || !geojson.features) {
        showToast('No hay geometrías para subdividir', 'error');
        return;
    }

    const cutLineCoords = splitPoints.map(p => [p[1], p[0]]);
    const cutLine = turf.lineString(cutLineCoords);

    const newFeatures = [];
    let splitCount = 0;

    geojson.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            try {
                const geom = feature.geometry;
                let result;

                if (geom.type === 'Polygon') {
                    result = turf.polygonSplit(geom, cutLine);
                } else if (geom.type === 'MultiPolygon') {
                    const polygons = turf.multiPolygon([geom.coordinates]);
                    result = turf.polygonSplit(polygons, cutLine);
                }

                if (result && result.features) {
                    result.features.forEach((f, idx) => {
                        newFeatures.push({
                            type: 'Feature',
                            properties: {
                                ...feature.properties,
                                CODIGO: `${feature.properties?.CODIGO || 'PARCELA'}_${idx + 1}`,
                                SUP_GEOM: f.geometry.type !== 'LineString' ? calcularMetricasPlanasUTM(f, State.get('currentDisplayProjection')).areaM2 : null,
                                PERIMETRO_M: f.geometry.type !== 'LineString' ? calcularMetricasPlanasUTM(f, State.get('currentDisplayProjection')).perimeterM : null,
                                originalCode: feature.properties?.CODIGO
                            },
                            geometry: f.geometry
                        });
                        if (f.geometry.type === 'Polygon') splitCount++;
                    });
                }
            } catch (err) {
                logger.warn('No se pudo subdividir parcela:', err.message);
                newFeatures.push(feature);
            }
        } else {
            newFeatures.push(feature);
        }
    });

    if (newFeatures.length > 0) {
        const newGeojson = {
            type: 'FeatureCollection',
            features: newFeatures.filter(f => f.geometry.type !== 'LineString')
        };
        const hasKinks = typeof turf.kinks === 'function' && turf.kinks(feature.geometry).features.length > 0;
        State.set('geojson', newGeojson);
        if (hasKinks) {
            showToast('La secuencia tiene tramos cruzados. Ejecute Validar para ver los puntos a corregir.', 'warning');
        }
        showToast(`✅ Subdivisión completada: ${splitCount} parcelas creadas`, 'success');
    } else {
        showToast('No se pudo realizar la subdivisión', 'error');
    }
}

/**
 * Convierte puntos a polígono usando algoritmo de envolvente convexa
 * Ordena los puntos por ángulo para cerrar el polígono correctamente
 */
async function performSplit(splitPoints) {
    const geojson = State.get('geojson');
    if (!geojson?.features?.length) {
        showToast('No hay geometrías para subdividir', 'error');
        return;
    }
    const coordinates = splitPoints.map(point => [point[1], point[0]]);
    const start = coordinates[0];
    const end = coordinates.at(-1);
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lineLength = Math.hypot(dx, dy);
    if (!Number.isFinite(lineLength) || lineLength < 1e-12) {
        showToast('La línea de corte debe contener dos puntos distintos', 'error');
        return;
    }
    const bounds = turf.bbox(geojson);
    const span = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1], 0.01) * 20;
    const ux = dx / lineLength;
    const uy = dy / lineLength;
    const nx = -uy;
    const ny = ux;
    const middle = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const a = [middle[0] - ux * span, middle[1] - uy * span];
    const b = [middle[0] + ux * span, middle[1] + uy * span];
    const halfPlanes = [1, -1].map(side => turf.polygon([[
        a, b,
        [b[0] + nx * span * side, b[1] + ny * span * side],
        [a[0] + nx * span * side, a[1] + ny * span * side],
        a
    ]]));
    const nextFeatures = [];
    const sourceIds = [];
    const resultIds = [];
    geojson.features.forEach((feature, featureIndex) => {
        if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) {
            nextFeatures.push(feature);
            return;
        }
        try {
            const pieces = halfPlanes
                .map(halfPlane => turf.intersect(turf.featureCollection([feature, halfPlane])))
                .filter(piece => piece && turf.area(piece) > 0.0001);
            if (pieces.length < 2) {
                nextFeatures.push(feature);
                return;
            }
            const sourceId = getParcelId(feature, featureIndex);
            sourceIds.push(sourceId);
            pieces.forEach((piece, pieceIndex) => {
                const resultId = crypto.randomUUID();
                resultIds.push(resultId);
                const metrics = calcularMetricasPlanasUTM(piece, State.get('currentDisplayProjection'));
                nextFeatures.push({
                    type: 'Feature',
                    properties: {
                        ...feature.properties,
                        SNC_PARCELA_ID: resultId,
                        CODIGO: `${feature.properties?.CODIGO || 'PARCELA'}_${pieceIndex + 1}`,
                        SUP_GEOM: metrics.areaM2,
                        PERIMETRO_M: metrics.perimeterM,
                        originalCode: feature.properties?.CODIGO,
                        PARCELA_ESTADO: 'VIGENTE',
                        PARCELAS_ORIGEN: [sourceId]
                    },
                    geometry: piece.geometry
                });
            });
        } catch (error) {
            logger.warn('No se pudo subdividir parcela:', error.message);
            nextFeatures.push(feature);
        }
    });
    if (!resultIds.length) {
        showToast('La línea no atraviesa ninguna parcela o no produce dos áreas válidas', 'warning');
        return;
    }
    const lineageEvent = createLineageEvent({ operation: 'SUBDIVISION', sources: sourceIds, results: resultIds, user: State.getBackendUser() });
    resultIds.forEach(id => {
        const result = nextFeatures.find(feature => feature.properties?.SNC_PARCELA_ID === id);
        if (result) result.properties.CREADA_POR_ACTO = lineageEvent.id;
    });
    const saved = await commitExternalGeometry({ type: 'FeatureCollection', features: nextFeatures }, 'Subdivisión parcelaria', { lineageEvent });
    if (saved) showToast(`Subdivisión completada: ${resultIds.length} parcelas resultantes`, 'success');
}

export function convertPointsToPolygon() {
    const geojson = State.get('geojson');
    if (!geojson) {
        showToast('No hay geometrías cargadas', 'error');
        return;
    }

    const points = geojson.features.filter(f => f.geometry.type === 'Point');
    if (points.length < 3) {
        showToast('Se necesitan al menos 3 puntos para crear un polígono', 'warning');
        return;
    }

    try {
        // Se respeta estrictamente el orden de ingreso: P1 → P2 → … → PN → P1.
        const sameCoordinate = (a, b) => a[0] === b[0] && a[1] === b[1];
        const inputCoords = points.map(point => point.geometry.coordinates);
        const polygonCoords = inputCoords.filter((coord, index) =>
            index === 0 || !sameCoordinate(coord, inputCoords[index - 1])
        );
        if (polygonCoords.length > 1 && sameCoordinate(polygonCoords[0], polygonCoords.at(-1))) {
            polygonCoords.pop();
        }
        if (polygonCoords.length < 3) {
            showToast('La secuencia debe contener al menos 3 puntos distintos', 'warning');
            return;
        }
        polygonCoords.push([...polygonCoords[0]]);

        const polygon = turf.polygon([polygonCoords]);
        const metrics = calcularMetricasPlanasUTM(polygon, State.get('currentDisplayProjection'));
        const areaHas = metrics.areaM2;

        const newGeojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    CODIGO: 'CONVERTIDO_' + Date.now(),
                    SUP_GEOM: areaHas,
                    SUP_GEOM_HAS: areaHas / 10000,
                    PERIMETRO_M: metrics.perimeterM,
                    PUNTOS_ORIG: points.length,
                    TIPO: 'secuencia_de_puntos',
                    CIERRE: `P${polygonCoords.length - 1} → P1`
                },
                geometry: polygon.geometry
            }]
        };

        State.set('geojson', newGeojson);
        loadGeoJSON(newGeojson);
        showToast(`✅ Polígono creado: ${areaHas.toFixed(2)} m² (${(areaHas / 10000).toFixed(4)} has)`, 'success');

    } catch (err) {
        logger.error('Error convirtiendo puntos:', err);
        showToast('Error al convertir puntos a polígono: ' + err.message, 'error');
    }
}

/**
 * Visualiza errores de solapamiento y huecos en el mapa
 */
export function showTopologyErrors() {
    const results = State.get('validationResults');
    if (!results || !results.topologyErrors) {
        showToast('No hay resultados de validación disponibles', 'warning');
        return;
    }

    if (topologyErrorLayer) map.removeLayer(topologyErrorLayer);

    const features = [
        ...results.topologyErrors.overlaps.map(f => ({ ...f, properties: { ...f.properties, type: 'overlap' } })),
        ...results.topologyErrors.gaps.map(f => ({ ...f, properties: { ...f.properties, type: 'gap' } }))
    ];

    if (features.length === 0) {
        showToast('No se detectaron errores topológicos para mostrar', 'info');
        return;
    }

    topologyErrorLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: (feature) => ({
            color: feature.properties.type === 'overlap' ? '#ef4444' : '#f59e0b',
            weight: 3,
            fillColor: feature.properties.type === 'overlap' ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.6,
            dashArray: feature.properties.type === 'gap' ? '5, 5' : null
        }),
        onEachFeature: (f, layer) => {
            layer.bindPopup(`<strong>Error Topológico:</strong><br>${f.properties.desc}`);
        }
    }).addTo(map);

    const bounds = topologyErrorLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [100, 100] });

    showToast('⚠️ Errores resaltados: Rojo (Solapamiento), Naranja (Hueco)', 'warning');
    if (window.App && window.App.closeModal) window.App.closeModal();
}

/**
 * Limpia la capa de errores topológicos del mapa
 */
export function clearTopologyErrors() {
    if (topologyErrorLayer) {
        map.removeLayer(topologyErrorLayer);
        topologyErrorLayer = null;
        showToast('✅ Errores topológicos limpiados', 'info');
    } else {
        showToast('No hay errores topológicos para limpiar', 'info');
    }
}

/**
 * Invalida tamaño del mapa
 */
export function invalidateSize() {
    if (map) setTimeout(() => map && map.invalidateSize(), 100);
}

export function setBaseLayer(name) {
    if (!map || !baseLayers) return false;
    const layer = baseLayers[name];
    if (!layer) return false;
    Object.entries(baseLayers).forEach(([key, lyr]) => {
        if (lyr === layer) return;
        if (map.hasLayer(lyr)) map.removeLayer(lyr);
    });
    if (!map.hasLayer(layer)) layer.addTo(map);
    document.querySelectorAll('[data-layer]').forEach(btn => btn.classList.toggle('active', btn.dataset.layer === name));
    const isLight = ['osm', 'topo', 'catastro'].includes(name);
    document.body.classList.toggle('map-base-light', isLight);
    document.body.classList.toggle('map-base-dark', !isLight);
    return true;
}

// Exponer a window para compatibilidad con scripts globales
window.MapEngine = { init, loadGeoJSON, clearProjectLayer, focusWorkPolygon, restoreStartupView, toggleSNCReferenceLayer, toggleDeptos, toggleDistritos, toggleMeasureMode, toggleSplitMode, toggleParcelNumberAssignment, selectParcelByNumber, convertPointsToPolygon, showTopologyErrors, clearTopologyErrors, closeParcelInspector, invalidateSize, getMap, _updateUtmCoordsDisplay, downloadEnvironmentCache, takeMapScreenshot, captureCertificateMapImages, setBaseLayer, toggleVertexEdit, setVertexEditMode, commitVertexEdit, cancelVertexEdit, undoGeometryEdit, redoGeometryEdit, updateVertexCoordinate, commitExternalGeometry };

export async function downloadEnvironmentCache() {
    if(!map) return;
    const token = State.getBackendToken();
    if (!token) {
        showToast('Inicie sesión antes de descargar el entorno SNC.', 'warning');
        return;
    }
    try {
        const center = map.getCenter();
        const response = await fetch(`/api/entorno?lat=${center.lat}&lng=${center.lng}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) throw new Error('La sesión expiró. Vuelva a iniciar sesión.');
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'No se pudo consultar el entorno SNC.');
        }
        const geojson = await response.json();
        
        if(localCacheLayer && map.hasLayer(localCacheLayer)) {
            map.removeLayer(localCacheLayer);
        }
        
        localCacheLayer = L.geoJSON(geojson, {
            style: {color: '#0ea5e9', weight: 1, fillColor: '#0ea5e9', fillOpacity: 0.1, dashArray: '3,3'}
        }).addTo(map);
        
        showToast(`✅ Caché actualizado: ${geojson.features.length} parcelas locales cargadas`, 'success');
    } catch(e) {
        logger.error(e);
        showToast(`❌ ${e.message || 'Error descargando entorno'}`, 'error');
    }
}

/**
 * Toma una captura de pantalla del mapa actual usando dom-to-image
 * @returns {Promise<string>} Base64 image data URL
 */
export async function takeMapScreenshot() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        const msg = 'Contenedor del mapa no encontrado. No se puede capturar.';
        showToast('❌ ' + msg, 'error');
        throw new Error(msg);
    }
    
    if (typeof window.domtoimage === 'undefined') {
        const msg = 'dom-to-image no está cargado. Instale la dependencia o verifique el CDN.';
        showToast('❌ ' + msg, 'error');
        throw new Error(msg);
    }
    
    const controls = mapElement.querySelectorAll('.leaflet-control-container');
    const wasVisible = [];
    controls.forEach((c, idx) => {
        wasVisible[idx] = c.style.display;
        c.style.display = 'none';
    });
    
    try {
        showToast('⏳ Preparando captura del mapa...', 'info');
        const dataUrl = await window.domtoimage.toJpeg(mapElement, {
            quality: 0.85,
            bgcolor: '#ffffff',
            cacheBust: true
        });
        showToast('✅ Captura del mapa generada', 'success');
        return dataUrl;
    } catch (error) {
        logger.error('Error capturando el mapa:', error);
        const msg = `No se pudo capturar el mapa: ${error?.message || 'error desconocido'}`;
        showToast('❌ ' + msg, 'error');
        throw new Error(msg);
    } finally {
        controls.forEach((c, idx) => {
            c.style.display = wasVisible[idx] || '';
        });
    }
}

/**
 * Obtiene las dos vistas cartogrÃ¡ficas que integran el plano de certificaciÃ³n.
 * La capa SNC se usa solamente como referencia visual; no se consulta ni se
 * incorporan atributos del servicio remoto.
 * @returns {Promise<{snc: string, satellite: string}>}
 */
export async function captureCertificateMapImages() {
    if (!map || !baseLayers?.satellite) {
        throw new Error('El mapa no está inicializado para generar los planos de certificación.');
    }

    const activeBaseLayer = Object.values(baseLayers).find(layer => map.hasLayer(layer));
    const sncWasVisible = Boolean(sncReferenceLayer && map.hasLayer(sncReferenceLayer));
    const certificateVertexLayer = L.layerGroup().addTo(map);
    const currentProjCode = State.get('currentDisplayProjection') || 'EPSG:32721';
    const projDefinition = (currentProjCode === 'EPSG:32720') ? PROJ_32720 : PROJ_32721;

    let vertexNumber = 1;
    (renderedGeojson?.features || []).forEach(feature => {
        const vertices = getPolygonVertices(feature.geometry);
        vertices.forEach(([lng, lat], index) => {
            // Dibujar punto y tooltip con coordenadas
            const utm = proj4(projDefinition, [lng, lat]);
            const tooltipHtml = `
                <div style="background: rgba(255,255,255,0.9); border: 1px solid #1d4ed8; padding: 2px 4px; border-radius: 4px; color: #0f172a; text-align: center; line-height: 1.2;">
                    <b style="color: #1d4ed8; font-size: 1.1em;">${vertexNumber++}</b><br>
                    <span style="font-size: 0.65em;">E: ${utm[0].toFixed(2)}<br>N: ${utm[1].toFixed(2)}</span>
                </div>
            `;
            
            L.circleMarker([lat, lng], {
                radius: 4,
                color: '#1d4ed8',
                weight: 1,
                fillColor: '#ffffff',
                fillOpacity: 1,
                interactive: false
            }).bindTooltip(tooltipHtml, {
                permanent: true,
                direction: 'right',
                className: 'custom-cert-tooltip',
                offset: [5, 0]
            }).addTo(certificateVertexLayer);

            // Dibujar distancia del segmento
            if (index < vertices.length) {
                const nextPt = vertices[(index + 1) % vertices.length];
                const from = turf.point([lng, lat]);
                const to = turf.point([nextPt[0], nextPt[1]]);
                const distance = turf.distance(from, to, { units: 'meters' });
                const midLng = (lng + nextPt[0]) / 2;
                const midLat = (lat + nextPt[1]) / 2;
                
                const distIcon = L.divIcon({
                    html: `<div style="background: rgba(15,23,42,0.85); border: 1px solid #38bdf8; border-radius: 3px; padding: 1px 4px; font-size: 0.65em; font-weight: bold; color: #e0f2fe; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.5);">${distance.toFixed(2)} m</div>`,
                    className: 'segment-length-marker',
                    iconSize: [null, null]
                });
                L.marker([midLat, midLng], { icon: distIcon, interactive: false }).addTo(certificateVertexLayer);
            }
        });
    });

    const switchToSatellite = () => {
        Object.values(baseLayers).forEach(layer => {
            if (layer !== baseLayers.satellite && map.hasLayer(layer)) map.removeLayer(layer);
        });
        if (!map.hasLayer(baseLayers.satellite)) baseLayers.satellite.addTo(map);
    };
    const clearBaseLayers = () => {
        Object.values(baseLayers).forEach(layer => {
            if (map.hasLayer(layer)) map.removeLayer(layer);
        });
    };

    try {
        clearBaseLayers();
        toggleSNCReferenceLayer(true);
        await new Promise(resolve => setTimeout(resolve, 700));
        const snc = await takeMapScreenshot();

        toggleSNCReferenceLayer(false);
        switchToSatellite();
        await new Promise(resolve => setTimeout(resolve, 250));
        const satellite = await takeMapScreenshot();
        return { snc, satellite };
    } finally {
        if (map.hasLayer(certificateVertexLayer)) map.removeLayer(certificateVertexLayer);
        if (sncWasVisible) toggleSNCReferenceLayer(true);
        else toggleSNCReferenceLayer(false);

        if (activeBaseLayer && activeBaseLayer !== baseLayers.satellite) {
            if (map.hasLayer(baseLayers.satellite)) map.removeLayer(baseLayers.satellite);
            if (!map.hasLayer(activeBaseLayer)) activeBaseLayer.addTo(map);
        } else if (!activeBaseLayer && map.hasLayer(baseLayers.satellite)) {
            map.removeLayer(baseLayers.satellite);
        }
    }
}

/**
 * Abre la vista de plano de certificación utilizando el modal existente
 * y alimentándolo con imágenes reales del mapa y datos del expediente.
 */
export async function openCertificateMap(results) {
    const modal = document.getElementById('certificationModal');
    const canvas = document.getElementById('certCanvas');
    const coordsEl = document.getElementById('certCoords');
    const expedienteEl = document.getElementById('certExpediente');
    const filesEl = document.getElementById('certFiles');
    const metaEl = document.getElementById('certificationMeta');

    if (!modal || !canvas) {
        throw new Error('Vista de certificación no disponible en el DOM');
    }

    const geojson = State.get('geojson');
    if (!geojson) {
        showToast('Primero cargue la geometría del expediente', 'warning');
        return;
    }

    const now = new Date();
    if (metaEl) metaEl.textContent = 'Generado: ' + now.toLocaleString('es-PY');

    const project = State.getBackendProject ? State.getBackendProject() : '';
    const expedient = State.getBackendExpediente ? State.getBackendExpediente() : '';
    if (expedienteEl) {
        const projectText = String(project || 'Proyecto actual').slice(0, 12);
        const expedientText = String(expedient || 'Expediente 1').slice(0, 12);
        expedienteEl.innerHTML =
            '<div class="flex justify-between"><span class="text-slate-500">ID Proyecto</span><span class="text-slate-200">' + projectText + '</span></div>' +
            '<div class="flex justify-between"><span class="text-slate-500">Expediente</span><span class="text-slate-200">' + expedientText + '</span></div>';
    }

    const zoneLabel = (State.get('currentDisplayProjection') || State.get('projection') || '').includes('32720') ? '20S / WGS84' : '21S / WGS84';
    const parcelas = (geojson.features || []).filter(feature => ['Polygon', 'MultiPolygon'].includes(feature?.geometry?.type));
    const supM2 = parcelas.reduce((sum, feature) => {
        try { return sum + calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection') || 'EPSG:32721').areaM2; }
        catch { return sum; }
    }, 0);
    const supHa = supM2 / 10000;

    if (coordsEl) {
        let centroide = null;
        try { centroide = calcularCentroide(parcelas[0]); } catch {}
        const este = centroide ? centroide[0].toFixed(2) : '0.00';
        const norte = centroide ? centroide[1].toFixed(2) : '0.00';
        coordsEl.innerHTML =
            '<div class="flex justify-between"><span class="text-slate-500">Este (X)</span><span class="text-blue-400">' + este + '</span></div>' +
            '<div class="flex justify-between"><span class="text-slate-500">Norte (Y)</span><span class="text-blue-400">' + norte + '</span></div>' +
            '<div class="flex justify-between"><span class="text-slate-500">Zona</span><span class="text-slate-200">' + zoneLabel + '</span></div>' +
            '<div class="flex justify-between"><span class="text-slate-500">Superficie</span><span class="text-emerald-300">' + formatNumber(supM2, 2) + ' m² / ' + formatNumber(supHa, 4) + ' ha</span></div>';
    }

    const filesList = [];
    const geoName = State.get ? State.get('sourceGeoFileName') : (window.currentGeoFile || '');
    const dataName = State.get ? State.get('sourceDataFileName') : (window.currentDataFile || '');
    if (geoName) filesList.push({name: geoName, type:'geometría'});
    if (dataName) filesList.push({name: dataName, type:'datos'});
    filesList.push({name: 'Expediente SHP', type:'shp'});
    filesList.push({name: 'Certificado PDF', type:'certificación'});
    if (filesEl) {
        filesEl.innerHTML = filesList.map(f=>'<div class="flex justify-between"><span class="text-slate-400">' + f.name + '</span><span class="text-slate-500">' + f.type + '</span></div>').join('');
    }

    modal.style.display = 'flex';
    requestAnimationFrame(async () => {
        try {
            const images = await captureCertificateMapImages();
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const img = new Image();
            img.src = images.snc;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.drawImage(img, 0, 0, rect.width, rect.height);

            const label = document.createElement('div');
            label.className = 'pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-mono text-slate-300';
            label.textContent = 'Parcelas catastrales de fondo · ' + parcelas.length + ' parcela(s)';
            const container = canvas.parentElement;
            const existing = container.querySelector('.pointer-events-none');
            if (existing) existing.remove();
            container.appendChild(label);
        } catch (e) {
            logger.error('No se pudo renderizar el plano de certificación:', e);
            showToast('No se pudo generar la vista previa del plano', 'error');
        }
    });
}
