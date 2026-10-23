export function formatMeters(value, decimals = 2) {
    if (!Number.isFinite(Number(value))) return 'N/A';
    return new Intl.NumberFormat('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true }).format(Number(value));
}

export function calculateRingSegments(ring, project = coordinate => coordinate) {
    if (!Array.isArray(ring) || ring.length < 2) return [];
    const vertices = ring.length > 2 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
    if (vertices.length < 2) return [];
    return vertices.map((start, index) => {
        const endIndex = (index + 1) % vertices.length;
        const end = vertices[endIndex];
        const [x1, y1] = project(start);
        const [x2, y2] = project(end);
        return { index, startVertex: index + 1, endVertex: endIndex + 1, start, end,
            midpoint: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], lengthMeters: Math.hypot(x2 - x1, y2 - y1) };
    });
}

/**
 * Calcula la posición y orientación de la cota de un segmento evitando
 * solapamientos con la línea, los mojones (vértices) y otros rótulos.
 *
 * Modos soportados:
 *  - 'auto': anti-solapamiento inteligente (exterior + holgura en tramos cortos)
 *  - 'above': encima de la línea
 *  - 'below': debajo de la línea
 *  - 'inside': todos internos (hacia el interior del polígono)
 *  - 'outside': todos externos (hacia el exterior del polígono)
 *
 * @param {object} options
 * @param {object} [options.map] Instancia Leaflet opcional
 * @param {object} options.segment Objeto de tramo { start, end, midpoint, lengthMeters }
 * @param {object} [options.feature] Feature GeoJSON del polígono
 * @param {string} [options.mode='auto'] 'auto' | 'above' | 'below' | 'inside' | 'outside'
 * @param {number} [options.offsetPixels=14] Separación en píxeles respecto a la línea
 * @returns {object} { latLng: [lat, lng], angle: number, isShort: boolean, mode: string, offset: [number, number] }
 */
export function calculateCotaPosition({ map, segment, feature, mode = 'auto', offsetPixels = 14 }) {
    const start = segment.start;
    const end = segment.end;
    const mid = segment.midpoint || [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

    let startPt, endPt, midPt;
    let isLeaflet = false;

    if (map && typeof map.latLngToLayerPoint === 'function') {
        startPt = map.latLngToLayerPoint([start[1], start[0]]);
        endPt = map.latLngToLayerPoint([end[1], end[0]]);
        midPt = { x: (startPt.x + endPt.x) / 2, y: (startPt.y + endPt.y) / 2 };
        isLeaflet = true;
    } else {
        startPt = { x: start[0], y: start[1] };
        endPt = { x: end[0], y: end[1] };
        midPt = { x: mid[0], y: mid[1] };
    }

    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const len = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    if (len < 0.0001) {
        return {
            latLng: [mid[1], mid[0]],
            angle: 0,
            isShort: true,
            mode,
            offset: [0, 0]
        };
    }

    // Vector unitario perpendicular (normal 90°)
    const nx = -dy / len;
    const ny = dx / len;

    let isNormalPointingInside = false;

    if (feature?.geometry) {
        if (typeof turf !== 'undefined' && turf.booleanPointInPolygon && turf.point) {
            try {
                const testDist = 0.0001;
                const testPt = turf.point([mid[0] + nx * testDist, mid[1] + ny * testDist]);
                isNormalPointingInside = turf.booleanPointInPolygon(testPt, feature);
            } catch (_) {}
        } else {
            try {
                const ring = feature.geometry.type === 'Polygon'
                    ? feature.geometry.coordinates[0]
                    : feature.geometry.coordinates[0]?.[0] || [];
                if (ring.length >= 3) {
                    let cx = 0, cy = 0;
                    for (let i = 0; i < ring.length - 1; i++) {
                        cx += ring[i][0];
                        cy += ring[i][1];
                    }
                    cx /= (ring.length - 1);
                    cy /= (ring.length - 1);
                    const rx = mid[0] - cx;
                    const ry = mid[1] - cy;
                    const dot = rx * nx + ry * ny;
                    isNormalPointingInside = dot < 0;
                }
            } catch (_) {}
        }
    }

    let multiplier = 1;
    let effectiveOffset = offsetPixels;

    switch (mode) {
        case 'inside':
            multiplier = isNormalPointingInside ? 1 : -1;
            break;
        case 'outside':
            multiplier = isNormalPointingInside ? -1 : 1;
            break;
        case 'above':
            if (isLeaflet) {
                multiplier = ny < 0 ? 1 : -1;
            } else {
                multiplier = ny > 0 ? 1 : -1;
            }
            break;
        case 'below':
            if (isLeaflet) {
                multiplier = ny > 0 ? 1 : -1;
            } else {
                multiplier = ny < 0 ? 1 : -1;
            }
            break;
        case 'auto':
        default:
            multiplier = isNormalPointingInside ? -1 : 1;
            if (len < 50) {
                effectiveOffset += 4;
            }
            break;
    }

    const ox = nx * effectiveOffset * multiplier;
    const oy = ny * effectiveOffset * multiplier;

    let targetLatLng;
    if (isLeaflet && typeof map.layerPointToLatLng === 'function') {
        const targetPt = { x: midPt.x + ox, y: midPt.y + oy };
        const lPoint = map.layerPointToLatLng([targetPt.y, targetPt.x]);
        targetLatLng = [lPoint.lat, lPoint.lng];
    } else {
        targetLatLng = [midPt.y + oy, midPt.x + ox];
    }

    return {
        latLng: targetLatLng,
        angle,
        isShort: len < 35,
        mode,
        offset: [ox, oy]
    };
}
