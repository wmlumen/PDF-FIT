/**
 * @file osnapManager.js
 * @description Motor de Referencia a Objetos (Osnap / Refent - F3) y Rastreo de Refent (Osnap Tracking - F11).
 * Implementa anclaje geométrico milimétrico de alta precisión para acotamiento y medición:
 * - Extremo / Vértice (Endpoint) [F3]
 * - Punto Medio (Midpoint) [F3]
 * - Centro / Centroide (Center) [F3]
 * - Intersección (Intersection) [F3]
 * - Rastreo Vectorial Ortogonal / Polar (Osnap Tracking) [F11]
 */

export const SNAP_TYPES = {
    ENDPOINT: 'endpoint',
    MIDPOINT: 'midpoint',
    CENTER: 'center',
    INTERSECTION: 'intersection'
};

export const SNAP_STYLES = {
    [SNAP_TYPES.ENDPOINT]: {
        label: 'Extremo (Endpoint)',
        symbol: '□',
        color: '#10b981', // Emerald / Verde CAD
        className: 'osnap-marker-endpoint'
    },
    [SNAP_TYPES.MIDPOINT]: {
        label: 'Punto Medio (Midpoint)',
        symbol: '▲',
        color: '#06b6d4', // Cyan
        className: 'osnap-marker-midpoint'
    },
    [SNAP_TYPES.CENTER]: {
        label: 'Centro (Center)',
        symbol: '◯',
        color: '#f59e0b', // Amber
        className: 'osnap-marker-center'
    },
    [SNAP_TYPES.INTERSECTION]: {
        label: 'Intersección (Intersection)',
        symbol: '✕',
        color: '#ec4899', // Pink / Magenta CAD
        className: 'osnap-marker-intersection'
    }
};

/**
 * Calcula la intersección entre dos segmentos de línea 2D.
 * Coordenadas en formato [x, y] o [lng, lat].
 * @param {Array<number[]>} segA [p1, p2]
 * @param {Array<number[]>} segB [p3, p4]
 * @returns {number[]|null} Punto de intersección [x, y] o null si no se intersecan en los tramos.
 */
export function findSegmentIntersections(segA, segB) {
    if (!segA || !segB || segA.length < 2 || segB.length < 2) return null;
    const [p1, p2] = segA;
    const [p3, p4] = segB;

    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
    const x3 = p3[0], y3 = p3[1];
    const x4 = p4[0], y4 = p4[1];

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 1e-12) return null; // Paralelas o coincidentes

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    // Verificar si el punto de cruce está dentro de los dos segmentos (excluyendo extremos idénticos)
    const EPSILON = 1e-6;
    if (ua > EPSILON && ua < (1 - EPSILON) && ub > EPSILON && ub < (1 - EPSILON)) {
        return [
            x1 + ua * (x2 - x1),
            y1 + ua * (y2 - y1)
        ];
    }
    return null;
}

/**
 * Calcula el centroide geométrico de un anillo de coordenadas.
 * @param {Array<number[]>} ring Coordenadas [[lng, lat], ...]
 * @returns {number[]} [lng, lat]
 */
export function calculatePolygonCentroid(ring) {
    if (!Array.isArray(ring) || ring.length === 0) return [0, 0];
    const pts = (ring.length > 2 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1])
        ? ring.slice(0, -1)
        : ring;

    if (pts.length === 1) return [pts[0][0], pts[0][1]];
    if (pts.length === 2) return [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];

    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const cross = (p1[0] * p2[1]) - (p2[0] * p1[1]);
        area += cross;
        cx += (p1[0] + p2[0]) * cross;
        cy += (p1[1] + p2[1]) * cross;
    }

    area *= 0.5;
    if (Math.abs(area) < 1e-12) {
        // En caso de polígono degenerado, retornar promedio simple
        const avgX = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
        const avgY = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
        return [avgX, avgY];
    }

    return [cx / (6 * area), cy / (6 * area)];
}

/**
 * Extrae todos los candidatos de referencia geométrica (Osnap) a partir de un GeoJSON o FeatureCollection.
 * @param {object} geojson GeoJSON Object (FeatureCollection, Feature, o Geometry)
 * @returns {Array<object>} Lista de candidatos de snap
 */
export function extractSnapCandidates(geojson) {
    if (!geojson) return [];

    const candidates = [];
    const segments = [];

    const features = geojson.type === 'FeatureCollection'
        ? (geojson.features || [])
        : geojson.type === 'Feature'
            ? [geojson]
            : [{ type: 'Feature', geometry: geojson, properties: {} }];

    for (const feature of features) {
        if (!feature || !feature.geometry) continue;
        const geom = feature.geometry;

        const processRing = (ring, isOuter = true) => {
            if (!Array.isArray(ring) || ring.length < 2) return;
            const vertices = (ring.length > 2 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1])
                ? ring.slice(0, -1)
                : ring;

            // 1. Vértices / Extremos (Endpoint)
            vertices.forEach((coord, idx) => {
                candidates.push({
                    type: SNAP_TYPES.ENDPOINT,
                    lng: coord[0],
                    lat: coord[1],
                    coordinate: [coord[0], coord[1]],
                    featureId: feature.id || feature.properties?.CODIGO || feature.properties?.PADRON,
                    index: idx
                });
            });

            // 2. Puntos medios (Midpoint) y guardar segmentos para análisis de intersección
            for (let i = 0; i < vertices.length; i++) {
                const nextIdx = (i + 1) % vertices.length;
                const p1 = vertices[i];
                const p2 = vertices[nextIdx];
                const seg = [p1, p2];
                segments.push(seg);

                const midLng = (p1[0] + p2[0]) / 2;
                const midLat = (p1[1] + p2[1]) / 2;

                candidates.push({
                    type: SNAP_TYPES.MIDPOINT,
                    lng: midLng,
                    lat: midLat,
                    coordinate: [midLng, midLat],
                    segment: seg,
                    featureId: feature.id || feature.properties?.CODIGO || feature.properties?.PADRON
                });
            }

            // 3. Centro / Centroide (Center) solo para anillos principales
            if (isOuter && vertices.length >= 3) {
                const [cx, cy] = calculatePolygonCentroid(vertices);
                candidates.push({
                    type: SNAP_TYPES.CENTER,
                    lng: cx,
                    lat: cy,
                    coordinate: [cx, cy],
                    featureId: feature.id || feature.properties?.CODIGO || feature.properties?.PADRON
                });
            }
        };

        if (geom.type === 'Polygon') {
            geom.coordinates.forEach((ring, idx) => processRing(ring, idx === 0));
        } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach(polyRings => {
                polyRings.forEach((ring, idx) => processRing(ring, idx === 0));
            });
        } else if (geom.type === 'LineString') {
            for (let i = 0; i < geom.coordinates.length; i++) {
                const coord = geom.coordinates[i];
                candidates.push({
                    type: SNAP_TYPES.ENDPOINT,
                    lng: coord[0],
                    lat: coord[1],
                    coordinate: [coord[0], coord[1]],
                    index: i
                });
                if (i < geom.coordinates.length - 1) {
                    const p1 = coord;
                    const p2 = geom.coordinates[i + 1];
                    const seg = [p1, p2];
                    segments.push(seg);
                    candidates.push({
                        type: SNAP_TYPES.MIDPOINT,
                        lng: (p1[0] + p2[0]) / 2,
                        lat: (p1[1] + p2[1]) / 2,
                        coordinate: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
                        segment: seg
                    });
                }
            }
        }
    }

    // 4. Intersecciones entre segmentos (Intersection)
    const maxSegmentsToCheck = Math.min(segments.length, 120); // Optimización para alta cantidad de linderos
    for (let i = 0; i < maxSegmentsToCheck; i++) {
        for (let j = i + 1; j < maxSegmentsToCheck; j++) {
            const inter = findSegmentIntersections(segments[i], segments[j]);
            if (inter) {
                candidates.push({
                    type: SNAP_TYPES.INTERSECTION,
                    lng: inter[0],
                    lat: inter[1],
                    coordinate: [inter[0], inter[1]],
                    segments: [segments[i], segments[j]]
                });
            }
        }
    }

    return candidates;
}

/**
 * Busca el punto de snap más cercano al cursor.
 * @param {object} mouseCoords { lat, lng } o [lng, lat]
 * @param {Array<object>} candidates Lista de candidatos producida por extractSnapCandidates
 * @param {object} [options]
 * @param {object} [options.map] Instancia de Leaflet para calcular distancia en píxeles de pantalla
 * @param {number} [options.tolerancePx=16] Tolerancia en píxeles
 * @param {object} [options.activeModes] Filtro de modos { endpoint: bool, midpoint: bool, center: bool, intersection: bool }
 * @returns {object|null} Resultado del snap o null si está fuera de tolerancia
 */
export function findSnapPoint(mouseCoords, candidates, options = {}) {
    if (!candidates || candidates.length === 0) return null;
    const { map, tolerancePx = 16, activeModes = null } = options;

    const lat = mouseCoords.lat ?? mouseCoords[1];
    const lng = mouseCoords.lng ?? mouseCoords[0];
    if (lat === undefined || lng === undefined) return null;

    let closest = null;
    let minDistance = Infinity;

    let mousePoint = null;
    if (map && typeof map.latLngToContainerPoint === 'function') {
        mousePoint = map.latLngToContainerPoint([lat, lng]);
    }

    for (const cand of candidates) {
        if (activeModes && activeModes[cand.type] === false) continue;

        let dist = Infinity;
        if (mousePoint && map && typeof map.latLngToContainerPoint === 'function') {
            const candPoint = map.latLngToContainerPoint([cand.lat, cand.lng]);
            dist = Math.hypot(mousePoint.x - candPoint.x, mousePoint.y - candPoint.y);
        } else {
            // Distancia euclidiana aproximada si no hay mapa activo (modo unit testing / backend)
            const dLng = (cand.lng - lng) * Math.cos((lat * Math.PI) / 180);
            const dLat = cand.lat - lat;
            // Aprox 1 grado = 111,320 metros. Considerar 1 metro = ~5 píxeles a zoom medio
            dist = Math.hypot(dLng, dLat) * 111320 * 0.1; 
        }

        if (dist <= tolerancePx && dist < minDistance) {
            minDistance = dist;
            closest = {
                ...cand,
                distancePx: dist,
                style: SNAP_STYLES[cand.type] || SNAP_STYLES[SNAP_TYPES.ENDPOINT]
            };
        }
    }

    return closest;
}

/**
 * Calcula el rastreo vectorial imaginario (Osnap Tracking) desde un punto ancla base.
 * Proyecta ejes ortogonales imaginarios (horizontal y vertical) o alineados.
 * @param {object} anchorCoords Punto ancla { lat, lng } o [lng, lat]
 * @param {object} mouseCoords Cursor { lat, lng } o [lng, lat]
 * @param {object} [options]
 * @param {object} [options.map] Instancia de Leaflet
 * @param {number} [options.tolerancePx=14] Tolerancia de anclaje a la línea guía
 * @returns {object|null} Información de proyección del rastreo
 */
export function calculateTrackingProjection(anchorCoords, mouseCoords, options = {}) {
    if (!anchorCoords || !mouseCoords) return null;
    const { map, tolerancePx = 14 } = options;

    const aLat = anchorCoords.lat ?? anchorCoords[1];
    const aLng = anchorCoords.lng ?? anchorCoords[0];
    const mLat = mouseCoords.lat ?? mouseCoords[1];
    const mLng = mouseCoords.lng ?? mouseCoords[0];

    if (aLat === undefined || aLng === undefined || mLat === undefined || mLng === undefined) return null;

    let anchorPt = null;
    let mousePt = null;

    if (map && typeof map.latLngToContainerPoint === 'function') {
        anchorPt = map.latLngToContainerPoint([aLat, aLng]);
        mousePt = map.latLngToContainerPoint([mLat, mLng]);
    } else {
        // En entorno testing / geométrico puro
        anchorPt = { x: aLng * 100000, y: aLat * 100000 };
        mousePt = { x: mLng * 100000, y: mLat * 100000 };
    }

    const dx = Math.abs(mousePt.x - anchorPt.x);
    const dy = Math.abs(mousePt.y - anchorPt.y);

    // Eje Horizontal (proyección Y constante = ancla Y)
    // El cursor está cerca de la horizontal que pasa por anchorPt
    if (dy <= tolerancePx && dx > 8) {
        let projectedLatLng;
        if (map && typeof map.containerPointToLatLng === 'function') {
            const p = map.containerPointToLatLng([anchorPt.x + (mousePt.x - anchorPt.x), anchorPt.y]);
            projectedLatLng = { lat: aLat, lng: p.lng };
        } else {
            projectedLatLng = { lat: aLat, lng: mLng };
        }

        return {
            axis: 'horizontal',
            angleDeg: 0,
            anchor: { lat: aLat, lng: aLng },
            projected: projectedLatLng,
            distancePx: dy,
            label: 'Rastreo 0° (Horizontal)'
        };
    }

    // Eje Vertical (proyección X constante = ancla X)
    // El cursor está cerca de la vertical que pasa por anchorPt
    if (dx <= tolerancePx && dy > 8) {
        let projectedLatLng;
        if (map && typeof map.containerPointToLatLng === 'function') {
            const p = map.containerPointToLatLng([anchorPt.x, anchorPt.y + (mousePt.y - anchorPt.y)]);
            projectedLatLng = { lat: p.lat, lng: aLng };
        } else {
            projectedLatLng = { lat: mLat, lng: aLng };
        }

        return {
            axis: 'vertical',
            angleDeg: 90,
            anchor: { lat: aLat, lng: aLng },
            projected: projectedLatLng,
            distancePx: dx,
            label: 'Rastreo 90° (Vertical)'
        };
    }

    return null;
}

/**
 * Gestor interactivo de Osnap y Osnap Tracking para Leaflet.
 */
export class OsnapManager {
    constructor(mapInstance, options = {}) {
        this.map = mapInstance;
        this.enabled = options.enabled ?? true;
        this.osnapEnabled = options.osnapEnabled ?? true; // F3
        this.trackingEnabled = options.trackingEnabled ?? true; // F11
        this.tolerancePx = options.tolerancePx ?? 16;

        this.activeModes = {
            [SNAP_TYPES.ENDPOINT]: true,
            [SNAP_TYPES.MIDPOINT]: true,
            [SNAP_TYPES.CENTER]: true,
            [SNAP_TYPES.INTERSECTION]: true
        };

        this.candidates = [];
        this.currentSnap = null;
        this.currentTracking = null;
        this.lastAcquiredAnchor = null;

        this._marker = null;
        this._trackingGuideLine = null;
        this._trackingTooltip = null;

        this._onKeyDown = this._onKeyDown.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this._onKeyDown);
        }
    }

    _onKeyDown(e) {
        if (!this.enabled) return;

        // F3: Toggle Osnap
        if (e.key === 'F3') {
            e.preventDefault();
            this.toggleOsnap();
        }
        // F11: Toggle Osnap Tracking
        else if (e.key === 'F11') {
            e.preventDefault();
            this.toggleTracking();
        }
    }

    toggleOsnap(forceState) {
        this.osnapEnabled = typeof forceState === 'boolean' ? forceState : !this.osnapEnabled;
        if (!this.osnapEnabled) {
            this.clearSnapVisual();
        }
        this._notifyStateChange('osnap', this.osnapEnabled);
        return this.osnapEnabled;
    }

    toggleTracking(forceState) {
        this.trackingEnabled = typeof forceState === 'boolean' ? forceState : !this.trackingEnabled;
        if (!this.trackingEnabled) {
            this.clearTrackingVisual();
        }
        this._notifyStateChange('tracking', this.trackingEnabled);
        return this.trackingEnabled;
    }

    _notifyStateChange(type, value) {
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            if (type === 'osnap') {
                window.showToast(value ? '🗲 Osnap (Refent) ACTIVO [F3]' : '🗲 Osnap (Refent) DESACTIVADO [F3]', 'info');
            } else if (type === 'tracking') {
                window.showToast(value ? '📐 Osnap Tracking ACTIVO [F11]' : '📐 Osnap Tracking DESACTIVADO [F11]', 'info');
            }
        }
        // Actualizar estados visuales de botones si existen en DOM
        this.updateToolbarButtons();
    }

    updateToolbarButtons() {
        if (typeof document === 'undefined') return;
        const osnapBtn = document.getElementById('map-tool-osnap');
        if (osnapBtn) {
            if (this.osnapEnabled) {
                osnapBtn.classList.add('bg-amber-500/20', 'border-amber-400', 'text-amber-400');
                osnapBtn.classList.remove('text-slate-400', 'border-slate-700');
                osnapBtn.title = 'Osnap (F3): ACTIVO (Anclaje exacto)';
            } else {
                osnapBtn.classList.remove('bg-amber-500/20', 'border-amber-400', 'text-amber-400');
                osnapBtn.classList.add('text-slate-400', 'border-slate-700');
                osnapBtn.title = 'Osnap (F3): INACTIVO';
            }
        }

        const trackBtn = document.getElementById('map-tool-osnap-tracking');
        if (trackBtn) {
            if (this.trackingEnabled) {
                trackBtn.classList.add('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-400');
                trackBtn.classList.remove('text-slate-400', 'border-slate-700');
                trackBtn.title = 'Osnap Tracking (F11): ACTIVO (Guías vectoriales)';
            } else {
                trackBtn.classList.remove('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-400');
                trackBtn.classList.add('text-slate-400', 'border-slate-700');
                trackBtn.title = 'Osnap Tracking (F11): INACTIVO';
            }
        }
    }

    setCandidatesFromGeoJSON(geojson) {
        this.candidates = extractSnapCandidates(geojson);
    }

    setAnchor(anchorCoords) {
        if (!anchorCoords) {
            this.lastAcquiredAnchor = null;
            return;
        }
        const lat = anchorCoords.lat ?? anchorCoords[1];
        const lng = anchorCoords.lng ?? anchorCoords[0];
        this.lastAcquiredAnchor = { lat, lng };
    }

    /**
     * Procesa la posición del ratón y actualiza el anclaje y las guías.
     * @param {object} mouseLatLng { lat, lng }
     * @returns {object} { lat, lng, snapped, tracked, snapDetails, trackingDetails }
     */
    processMouseMove(mouseLatLng) {
        if (!this.enabled || !mouseLatLng) {
            this.clearVisuals();
            return { lat: mouseLatLng?.lat, lng: mouseLatLng?.lng, snapped: false, tracked: false };
        }

        // 1. Probar Snap directo si está habilitado
        let snapResult = null;
        if (this.osnapEnabled && this.candidates.length > 0) {
            snapResult = findSnapPoint(mouseLatLng, this.candidates, {
                map: this.map,
                tolerancePx: this.tolerancePx,
                activeModes: this.activeModes
            });
        }

        if (snapResult) {
            this.currentSnap = snapResult;
            this.renderSnapVisual(snapResult);
            this.clearTrackingVisual();
            return {
                lat: snapResult.lat,
                lng: snapResult.lng,
                snapped: true,
                tracked: false,
                snapDetails: snapResult
            };
        }

        this.clearSnapVisual();
        this.currentSnap = null;

        // 2. Si no hubo snap directo, probar Rastreo (Osnap Tracking - F11)
        if (this.trackingEnabled && this.lastAcquiredAnchor) {
            const trackResult = calculateTrackingProjection(this.lastAcquiredAnchor, mouseLatLng, {
                map: this.map,
                tolerancePx: this.tolerancePx
            });

            if (trackResult) {
                this.currentTracking = trackResult;
                this.renderTrackingVisual(trackResult);
                return {
                    lat: trackResult.projected.lat,
                    lng: trackResult.projected.lng,
                    snapped: false,
                    tracked: true,
                    trackingDetails: trackResult
                };
            }
        }

        this.clearTrackingVisual();
        this.currentTracking = null;

        return {
            lat: mouseLatLng.lat,
            lng: mouseLatLng.lng,
            snapped: false,
            tracked: false
        };
    }

    renderSnapVisual(snap) {
        if (!this.map || typeof L === 'undefined') return;

        const iconHtml = `<div class="osnap-glyph" style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            color: ${snap.style.color};
            font-size: 16px;
            font-weight: 900;
            text-shadow: 0 0 4px #000, 0 0 8px ${snap.style.color};
            background: rgba(15, 23, 42, 0.75);
            border: 2px solid ${snap.style.color};
            border-radius: ${snap.type === SNAP_TYPES.CENTER ? '50%' : '3px'};
            pointer-events: none;
        ">${snap.style.symbol}</div>`;

        const snapIcon = L.divIcon({
            html: iconHtml,
            className: 'osnap-cad-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        if (!this._marker) {
            this._marker = L.marker([snap.lat, snap.lng], { icon: snapIcon, interactive: false, zIndexOffset: 2000 }).addTo(this.map);
        } else {
            this._marker.setLatLng([snap.lat, snap.lng]);
            this._marker.setIcon(snapIcon);
        }

        if (!this._snapTooltip) {
            this._snapTooltip = L.tooltip({
                permanent: true,
                direction: 'top',
                offset: [0, -12],
                className: 'osnap-cad-tooltip bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 shadow text-white font-mono'
            }).setContent(`${snap.style.symbol} ${snap.style.label}`);
            this._marker.bindTooltip(this._snapTooltip);
        } else {
            this._snapTooltip.setContent(`${snap.style.symbol} ${snap.style.label}`);
        }
    }

    renderTrackingVisual(track) {
        if (!this.map || typeof L === 'undefined') return;

        const latLngs = [
            [track.anchor.lat, track.anchor.lng],
            [track.projected.lat, track.projected.lng]
        ];

        if (!this._trackingGuideLine) {
            this._trackingGuideLine = L.polyline(latLngs, {
                color: '#38bdf8', // Sky / Cyan claro
                weight: 2,
                dashArray: '5, 5',
                interactive: false,
                zIndexOffset: 1900
            }).addTo(this.map);
        } else {
            this._trackingGuideLine.setLatLngs(latLngs);
        }

        // Tooltip en el punto proyectado
        if (!this._trackingMarker) {
            const trackGlyph = L.divIcon({
                html: `<div style="width: 10px; height: 10px; background: #38bdf8; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 6px #38bdf8;"></div>`,
                className: 'osnap-tracking-dot',
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            });
            this._trackingMarker = L.marker([track.projected.lat, track.projected.lng], { icon: trackGlyph, interactive: false }).addTo(this.map);
            this._trackingMarker.bindTooltip(track.label, {
                permanent: true,
                direction: 'right',
                offset: [8, 0],
                className: 'bg-cyan-950/90 text-cyan-200 text-xs px-2 py-0.5 rounded border border-cyan-500 shadow font-mono'
            });
        } else {
            this._trackingMarker.setLatLng([track.projected.lat, track.projected.lng]);
            this._trackingMarker.setTooltipContent(track.label);
        }
    }

    clearSnapVisual() {
        if (this._marker && this.map) {
            this.map.removeLayer(this._marker);
            this._marker = null;
            this._snapTooltip = null;
        }
    }

    clearTrackingVisual() {
        if (this._trackingGuideLine && this.map) {
            this.map.removeLayer(this._trackingGuideLine);
            this._trackingGuideLine = null;
        }
        if (this._trackingMarker && this.map) {
            this.map.removeLayer(this._trackingMarker);
            this._trackingMarker = null;
        }
    }

    clearVisuals() {
        this.clearSnapVisual();
        this.clearTrackingVisual();
    }

    destroy() {
        this.clearVisuals();
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this._onKeyDown);
        }
    }
}
