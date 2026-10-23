/**
 * overviewMap.js — Mini-mapa de ubicación contextual para el visor cartográfico.
 *
 * Implementa la estructura jerárquica territorial solicitada:
 *  1. Base: OpenStreetMap.
 *  2. Contorno del Departamento: Delimitación macro de los 18 departamentos de Paraguay (DEPTOS_GEOJSON).
 *  3. Contorno del Distrito y Relleno del Barrio / Localidad: Identificación automática en tiempo real.
 *  4. Entidad Específica (Parcela del expediente / objeto de estudio): En primer plano con símbolo de contraste.
 *  5. Recuadro interactivo (Bounding Box) con la extensión visible del mapa principal.
 *
 * Ubicado en la barra inferior izquierda (al lado de la leyenda), libre de cualquier
 * solapamiento con las herramientas del mapa (#map-tools) y adaptado a --at-open-h.
 */

import { State } from './state.js';
import { logger } from './logger.js';
import { DEPTOS_GEOJSON } from './deptosData.js';

let hostEl = null;
let boxEl = null;
let miniMapEl = null;
let miniMap = null;
let bboxRect = null;
let centerMarker = null;
let deptosLayer = null;
let barrioLayer = null;
let vectorGroup = null;
let mainMapRef = null;
let isCollapsed = false;
let currentBarrioInfo = null;

function buildDom() {
    boxEl = document.createElement('div');
    boxEl.id = 'map-overview';
    boxEl.className = 'map-overview-box';
    boxEl.setAttribute('role', 'region');
    boxEl.setAttribute('aria-label', 'Mapa de ubicación');

    boxEl.innerHTML = `
        <button type="button" class="ov-head" id="ov-toggle"
                aria-label="Alternar mapa de ubicación" title="Mapa de ubicación territorial"
                aria-expanded="${isCollapsed ? 'false' : 'true'}" aria-controls="ov-body">
            <i class="fas fa-map-location-dot text-sky-400" aria-hidden="true"></i>
            <span class="ov-title">Ubicación</span>
            <span id="ov-sublabel" class="ov-badge text-[9px] text-amber-400 font-mono truncate max-w-[90px]"></span>
            <i class="fas fa-chevron-${isCollapsed ? 'up' : 'down'} ov-caret" aria-hidden="true"></i>
        </button>
        <div id="ov-body" class="ov-body" ${isCollapsed ? 'hidden' : ''}>
            <div id="overview-map-canvas" class="ov-map-canvas"></div>
            <div id="ov-footer" class="ov-footer flex items-center justify-between pt-1 px-1 text-[8px] text-slate-400">
                <span id="ov-dpto-dist" class="truncate font-semibold text-slate-300">Paraguay</span>
                <span class="text-amber-400 font-mono">INE / SNC</span>
            </div>
        </div>
    `;

    hostEl.appendChild(boxEl);
    miniMapEl = boxEl.querySelector('#overview-map-canvas');

    if (typeof L !== 'undefined' && L.DomEvent) {
        L.DomEvent.disableClickPropagation(boxEl);
        L.DomEvent.disableScrollPropagation(boxEl);
    }

    boxEl.querySelector('#ov-toggle').addEventListener('click', toggleCollapse);
}

function initMiniMap() {
    if (!miniMapEl || typeof L === 'undefined') return;

    try {
        const fallbackCenter = [-25.2637, -57.5759];
        const mainCenter = mainMapRef?.getCenter?.();
        const center = (mainCenter && typeof mainCenter.lat === 'number') ? mainCenter : fallbackCenter;
        const mainZoom = mainMapRef?.getZoom?.();
        const zoom = typeof mainZoom === 'number' ? Math.max(2, mainZoom - 4) : 8;

        miniMap = L.map(miniMapEl, {
            center,
            zoom,
            attributionControl: false,
            zoomControl: false,
            boxZoom: false,
            doubleClickZoom: false,
            keyboard: false,
            scrollWheelZoom: false,
            dragging: true
        });

        // Capa base oficial OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            minZoom: 2,
            attribution: ''
        }).addTo(miniMap);

        // 1. NIVEL JERÁRQUICO MACRO: Contornos de Departamentos de Paraguay
        if (DEPTOS_GEOJSON) {
            deptosLayer = L.geoJSON(DEPTOS_GEOJSON, {
                style: {
                    color: '#64748b',
                    weight: 1.2,
                    fillColor: '#0f172a',
                    fillOpacity: 0.05
                },
                interactive: false
            }).addTo(miniMap);
        }

        // Capa para relleno del barrio/localidad y contorno distrital
        barrioLayer = L.layerGroup().addTo(miniMap);

        // Grupo para entidades específicas (parcelas del expediente)
        vectorGroup = L.layerGroup().addTo(miniMap);

        // Sincronizar recuadro visible del mapa principal
        syncBbox();

        // Clic en el minimapa centra el visor principal
        miniMap.on('click', (e) => {
            if (mainMapRef && e.latlng) {
                mainMapRef.panTo(e.latlng);
            }
        });

        miniMap.on('dragend', () => {
            if (mainMapRef) {
                mainMapRef.panTo(miniMap.getCenter());
            }
        });

    } catch (err) {
        logger.error('Error inicializando OverviewMap:', err);
    }
}

function syncBbox() {
    if (!miniMap || !mainMapRef) return;
    try {
        const bounds = mainMapRef.getBounds?.();
        if (bounds && bounds.isValid?.()) {
            if (!bboxRect) {
                bboxRect = L.rectangle(bounds, {
                    color: '#0284c7',
                    weight: 2,
                    fillColor: '#38bdf8',
                    fillOpacity: 0.22,
                    interactive: false
                }).addTo(miniMap);
            } else {
                bboxRect.setBounds(bounds);
            }

            const c = bounds.getCenter();
            if (!centerMarker) {
                centerMarker = L.circleMarker(c, {
                    radius: 3.5,
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.9,
                    weight: 1,
                    interactive: false
                }).addTo(miniMap);
            } else {
                centerMarker.setLatLng(c);
            }
        }
    } catch (e) {
        // safe
    }
}

function syncView() {
    if (!miniMap || !mainMapRef || isCollapsed) return;
    try {
        const center = mainMapRef.getCenter?.();
        const mainZoom = mainMapRef.getZoom?.();
        if (center && typeof center.lat === 'number') {
            const targetZoom = typeof mainZoom === 'number' ? Math.max(2, mainZoom - 4) : 8;
            miniMap.setView(center, targetZoom, { animate: false });
        }
        syncBbox();
    } catch (e) {
        // safe
    }
}

/**
 * Consulta la ubicación territorial del centro del mapa para mantener actualizado
 * el barrio y distrito en el mini-mapa en todo momento.
 */
function updateContextFromCenter() {
    if (!mainMapRef) return;
    const center = mainMapRef.getCenter?.();
    if (!center || typeof center.lat !== 'number') return;

    fetch(`/api/spatial-identify?lat=${center.lat}&lng=${center.lng}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data || !data.ok) return;
            currentBarrioInfo = data;
            updateDomLabels(data);
            renderBarrioInMiniMap(data.barrio_geometry);
        })
        .catch(() => {});
}

function updateDomLabels(data) {
    if (!boxEl) return;
    const badge = boxEl.querySelector('#ov-sublabel');
    const footerDist = boxEl.querySelector('#ov-dpto-dist');
    if (badge && data.barrio) {
        badge.textContent = `· ${data.barrio}`;
    }
    if (footerDist && (data.distrito || data.departamento)) {
        footerDist.textContent = `${data.distrito || ''}${data.departamento ? ' (' + data.departamento + ')' : ''}`;
    }
}

function renderBarrioInMiniMap(geometry) {
    if (!miniMap || !barrioLayer) return;
    barrioLayer.clearLayers();
    if (!geometry) return;

    // 2. NIVEL JERÁRQUICO ZONAL: Relleno sólido/semitransparente del Barrio / Localidad
    L.geoJSON(geometry, {
        style: {
            color: '#d97706',
            weight: 2,
            dashArray: '4,4',
            fillColor: '#f59e0b',
            fillOpacity: 0.32
        },
        interactive: false
    }).addTo(barrioLayer);
}

export function syncActiveLayers() {
    if (!miniMap || !vectorGroup) return;
    vectorGroup.clearLayers();

    try {
        // Si hay un barrio fijado desde la inspección de parcela en el mapa principal
        const explicitBarrio = typeof window !== 'undefined' && window.MapEngine?.getBarrioContextGeometry?.();
        if (explicitBarrio) {
            renderBarrioInMiniMap(explicitBarrio);
        }

        // 3. NIVEL JERÁRQUICO DE DETALLE: Parcela(s) del expediente en primer plano con contraste
        const geojson = State.get('geojson');
        if (geojson && Array.isArray(geojson.features) && geojson.features.length > 0) {
            L.geoJSON(geojson, {
                style: {
                    color: '#ef4444',
                    weight: 2.5,
                    fillColor: '#f87171',
                    fillOpacity: 0.65
                },
                pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
                    radius: 4,
                    color: '#991b1b',
                    fillColor: '#ef4444',
                    fillOpacity: 1,
                    weight: 1.5
                })
            }).addTo(vectorGroup);
        }

        // 4. Capas temáticas activas adicionales
        if (typeof window !== 'undefined' && window.MapEngine) {
            const activeLayers = window.MapEngine.getActiveLayersInfo?.() || [];
            activeLayers.forEach(l => {
                if (l.id === 'parcelas' || l.baseMap) return;
                const features = window.MapEngine.getPiribebuyFeatures?.(l.id);
                if (Array.isArray(features) && features.length > 0) {
                    const style = l.style || {};
                    L.geoJSON({ type: 'FeatureCollection', features }, {
                        style: () => ({
                            color: style.color || '#38bdf8',
                            weight: 1.2,
                            fillColor: style.fillColor || style.color || '#0ea5e9',
                            fillOpacity: 0.2
                        }),
                        pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
                            radius: 2.5,
                            color: style.color || '#38bdf8',
                            fillColor: style.fillColor || style.color || '#0ea5e9',
                            fillOpacity: 0.9,
                            weight: 1
                        })
                    }).addTo(vectorGroup);
                }
            });
        }
    } catch (err) {
        logger.warn('Error sincronizando capas en OverviewMap:', err);
    }
}

export function toggleCollapse() {
    isCollapsed = !isCollapsed;

    const body = boxEl?.querySelector('#ov-body');
    const caret = boxEl?.querySelector('.ov-caret');
    const toggleBtn = boxEl?.querySelector('#ov-toggle');

    if (body) body.hidden = isCollapsed;
    if (caret) caret.className = `fas fa-chevron-${isCollapsed ? 'up' : 'down'} ov-caret`;
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    }

    if (!isCollapsed && miniMap) {
        setTimeout(() => {
            miniMap.invalidateSize();
            syncView();
            syncActiveLayers();
            updateContextFromCenter();
        }, 120);
    }
}

export function mount(host, map) {
    const parent = typeof host === 'string' ? document.querySelector(host) : host;
    hostEl = document.getElementById('map-bottom-left-stack') || parent;
    if (!hostEl) {
        logger.warn('OverviewMap: contenedor no encontrado');
        return false;
    }

    mainMapRef = map || (typeof window !== 'undefined' ? window.MapEngine?.getMap?.() : null);
    if (!mainMapRef) {
        logger.warn('OverviewMap: mapa principal no disponible');
        return false;
    }

    // Por defecto siempre abierto para que las mejoras sean inmediatamente visibles
    isCollapsed = false;

    const prev = document.getElementById('map-overview');
    if (prev) prev.remove();

    buildDom();
    initMiniMap();

    mainMapRef.on('move', syncBbox);
    mainMapRef.on('moveend', () => {
        syncView();
        updateContextFromCenter();
    });
    mainMapRef.on('zoomend', syncView);

    window.addEventListener('snc:layers-changed', syncActiveLayers);
    State.subscribe('geojson', () => {
        syncActiveLayers();
        updateContextFromCenter();
    });

    setTimeout(() => {
        if (miniMap) {
            miniMap.invalidateSize();
            syncView();
            syncActiveLayers();
            updateContextFromCenter();
        }
    }, 200);

    setTimeout(() => {
        if (miniMap) {
            miniMap.invalidateSize();
            syncView();
            syncActiveLayers();
            updateContextFromCenter();
        }
    }, 800);

    return true;
}

export function unmount() {
    if (mainMapRef) {
        mainMapRef.off('move', syncBbox);
        mainMapRef.off('moveend', syncView);
        mainMapRef.off('zoomend', syncView);
    }
    window.removeEventListener('snc:layers-changed', syncActiveLayers);
    if (miniMap) {
        miniMap.remove();
        miniMap = null;
    }
    if (boxEl) {
        boxEl.remove();
        boxEl = null;
    }
}

if (typeof window !== 'undefined') {
    window.OverviewMap = {
        mount,
        unmount,
        syncActiveLayers,
        syncView,
        toggleCollapse,
        updateContextFromCenter,
        getMiniMap: () => miniMap
    };
}

export default { mount, unmount, syncActiveLayers, syncView, toggleCollapse, updateContextFromCenter };
