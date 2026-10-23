const clone = value => structuredClone(value);
const same = (a, b, tolerance = 1e-12) => Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;

export function cleanRing(ring) {
    const cleaned = [];
    for (const coordinate of ring || []) {
        if (!Array.isArray(coordinate) || coordinate.length < 2 || !coordinate.every(Number.isFinite)) continue;
        if (!cleaned.length || !same(cleaned.at(-1), coordinate)) cleaned.push([...coordinate]);
    }
    if (cleaned.length > 1 && same(cleaned[0], cleaned.at(-1))) cleaned.pop();
    if (cleaned.length < 3) throw new Error('Anillo con menos de tres vértices válidos');
    cleaned.push([...cleaned[0]]);
    return cleaned;
}

export function cleanGeometry(geometry) {
    if (geometry?.type === 'Polygon') return { ...geometry, coordinates: geometry.coordinates.map(cleanRing) };
    if (geometry?.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map(polygon => polygon.map(cleanRing)) };
    return clone(geometry);
}

export function buildTopologyRepairPreview(geojson, turfApi) {
    const preview = clone(geojson);
    const actions = [];
    const unresolved = [];
    preview.features.forEach((feature, index) => {
        if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) return;
        const before = JSON.stringify(feature.geometry.coordinates);
        try { feature.geometry = cleanGeometry(feature.geometry); }
        catch (error) { unresolved.push({ type: 'INVALID_RING', featureIndex: index, message: error.message }); return; }
        if (before !== JSON.stringify(feature.geometry.coordinates)) actions.push({ type: 'CLEAN_COORDINATES', featureIndex: index });
        try {
            const kinks = turfApi.kinks(feature);
            if (kinks.features.length) {
                const parts = turfApi.unkinkPolygon(feature).features;
                if (parts.length) {
                    feature.geometry = parts.length === 1 ? parts[0].geometry : { type: 'MultiPolygon', coordinates: parts.map(part => part.geometry.coordinates) };
                    actions.push({ type: 'UNKINK', featureIndex: index, parts: parts.length });
                }
            }
        } catch (error) { unresolved.push({ type: 'SELF_INTERSECTION', featureIndex: index, message: error.message }); }
    });
    for (let i = 0; i < preview.features.length; i++) {
        for (let j = i + 1; j < preview.features.length; j++) {
            const first = preview.features[i];
            const second = preview.features[j];
            if (!first.geometry || !second.geometry) continue;
            try {
                const overlap = turfApi.intersect(turfApi.featureCollection([first, second]));
                const area = overlap ? turfApi.area(overlap) : 0;
                if (area <= 0.1) continue;
                const difference = turfApi.difference(turfApi.featureCollection([second, first]));
                if (difference?.geometry) {
                    second.geometry = difference.geometry;
                    actions.push({ type: 'REMOVE_OVERLAP', featureIndex: j, againstFeatureIndex: i, areaM2: area });
                } else unresolved.push({ type: 'OVERLAP', featureIndex: j, againstFeatureIndex: i, areaM2: area });
            } catch (error) { unresolved.push({ type: 'OVERLAP', featureIndex: j, againstFeatureIndex: i, message: error.message }); }
        }
    }
    return { preview, actions, unresolved };
}

/**
 * MÓDULO 4: Validación Topológica y Consistencia Espacial (66-90)
 * Requerimientos herranuebras.txt: Módulo 4, requisitos 66-90
 * Implementaciones adicionales: detección de gaps, validación de ochavas,
 * y detección de micro-agujeros por digitalización imprecisa.
 */

/**
 * Detección de vacíos (gaps) entre dos polígonos adyacentes.
 * Verifica si los linderos compartidos tienen brechas no snappeadas.
 * @param {Array} ring1 - Vértices del primer anillo (exterior o interior)
 * @param {Array} ring2 - Vértices del segundo anillo (exterior o interior)
 * @param {number} tolerance - Tolerancia de snapping en metros (default: 0.005 m = 5 mm)
 * @returns {Object} Resultado de la detección de gaps
 */
function detectGaps(ring1, ring2, tolerance = TOPO_TOLERANCE) {
    if (!ring1 || !ring2 || ring1.length < 3 || ring2.length < 3) return { gaps: [], hasGaps: false };

    // Normalizar: cerrar anillos si no están cerrados
    const ring1c = ring1.length > 0 && same(ring1[0], ring1[ring1.length - 1]) ? ring1 : [...ring1, ring1[0]];
    const ring2c = ring2.length > 0 && same(ring2[0], ring2[ring2.length - 1]) ? ring2 : [...ring2, ring2[0]];

    const gaps = [];

    // Para cada vértice del primer anillo, buscar el vértice más cercano en el segundo
    for (let i = 0; i < ring1c.length; i++) {
        const v1 = ring1c[i];
        let minDist = Infinity;
        let closestIdx = -1;

        for (let j = 0; j < ring2c.length; j++) {
            const v2 = ring2c[j];
            const dist = Math.hypot(v1[0] - v2[0], v1[1] - v2[1]);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = j;
            }
        }

        // Si la distancia es mayor a la tolerancia, es un gap
        if (minDist > tolerance) {
            gaps.push({
                point1: v1,
                point2: ring2c[closestIdx],
                distance: minDist,
                gapType: 'vertex_to_vertex',
                severity: minDist > 0.1 ? 'critical' : minDist > 0.01 ? 'warning' : 'info'
            });
        }
    }

    // También revisar: vértices del segundo anillo que no tienen cercano en el primero
    for (let j = 0; j < ring2c.length; j++) {
        const v2 = ring2c[j];
        let minDist = Infinity;

        for (let i = 0; i < ring1c.length; i++) {
            const v1 = ring1c[i];
            const dist = Math.hypot(v1[0] - v2[0], v1[1] - v2[1]);
            if (dist < minDist) minDist = dist;
        }

        // Evitar duplicados: solo agregar si no ya fue reportado desde la iteración anterior
        const alreadyReported = gaps.some(g => Math.abs(g.point1[0] - v2[0]) < tolerance && Math.abs(g.point1[1] - v2[1]) < tolerance);
        if (!alreadyReported) {
            gaps.push({
                point1: ring1c[0],
                point2: v2,
                distance: minDist,
                gapType: 'vertex_to_vertex',
                severity: minDist > 0.1 ? 'critical' : minDist > 0.01 ? 'warning' : 'info'
            });
        }
    }

    return {
        gaps: gaps.length > 0 ? gaps : [],
        hasGaps: gaps.length > 0,
        gapCount: gaps.length
    };
}

/**
 * Validación de ochavas (chaflanes) reglamentarios según normativa municipal.
 * Una ochava es la esquina interior de un lote. El requisito SNC/Municipal
 * especifica que la longitud de los segmentos que forman la ochava debe ser
 * mínima (L >= 5 m típicamente) para evitar geometrías agudas peligrosas.
 * @param {Array} ring - Vértices del anillo del polígono (sentido horario para SNC)
 * @param {number} minLength - Longitud mínima requerida en metros (default: 5)
 * @returns {Object} Resultado de validación de ochavas
 */
function validateOchavas(ring, minLength = 5) {
    if (!ring || ring.length < 4) return { validOchavas: [], invalidOchavas: [], hasIssues: false };

    const ringClosed = ring.length > 0 && same(ring[0], ring[ring.length - 1]) ? ring : [...ring, ring[0]];
    const invalidOchavas = [];
    const validOchavas = [];

    // Para cada vértice (esquina), verificar la ochava formada por los dos segmentos consecutivos
    for (let i = 0; i < ringClosed.length; i++) {
        const prevIdx = (i - 1 + ringClosed.length) % ringClosed.length;
        const nextIdx = (i + 1) % ringClosed.length;

        const pPrev = ringClosed[prevIdx];
        const pCurr = ringClosed[i];
        const pNext = ringClosed[nextIdx];

        // Longitudes de los dos segmentos que forman la esquina
        const len1 = Math.hypot(pCurr[0] - pPrev[0], pCurr[1] - pPrev[1]);
        const len2 = Math.hypot(pNext[0] - pCurr[0], pNext[1] - pCurr[1]);

        // Ángulo entre los dos segmentos (en grados)
        const dotProduct = (pPrev[0] - pCurr[0]) * (pNext[0] - pCurr[0]) + (pPrev[1] - pCurr[1]) * (pNext[1] - pCurr[1]);
        const magProduct = len1 * len2;
        const angle = magProduct > 0 ? Math.acos(Math.max(-1, Math.min(1, dotProduct / magProduct))) * 180 / Math.PI : 180;

        // Ángulo interno del polígono en este vértice
        const interiorAngle = 180 - angle; // ángulo interno = 180 - ángulo exterior

        // Si el ángulo interno es un "retranco" (ángulo abierto < 180°) y ambas longitudes
        // cumplen el mínimo requerido, es ochava válida
        if (interiorAngle < 170 && len1 >= minLength && len2 >= minLength) {
            validOchavas.push({
                vertex: pCurr,
                interiorAngle: interiorAngle.toFixed(2),
                segment1Length: len1.toFixed(2),
                segment2Length: len2.toFixed(2),
                angleExterior: angle.toFixed(2)
            });
        } else if (interiorAngle < 170) {
            // Hay una ochava pero no cumple el largo mínimo
            invalidOchavas.push({
                vertex: pCurr,
                interiorAngle: interiorAngle.toFixed(2),
                segment1Length: len1.toFixed(2),
                segment2Length: len2.toFixed(2),
                requiredMin: minLength,
                deficiency: (minLength - Math.max(len1, len2)).toFixed(2)
            });
        }
    }

    return {
        validOchavas: validOchavas.length > 0 ? validOchavas : [],
        invalidOchavas: invalidOchavas.length > 0 ? invalidOchavas : [],
        hasIssues: invalidOchavas.length > 0 || validOchavas.length > 0 ? true : false,
        validCount: validOchavas.length,
        invalidCount: invalidOchavas.length
    };
}

/**
 * Detección de micro-agujeros por digitalización imprecisa.
 * Los micro-agujeros son brechas muy pequeñas (< 0.005 m) que pueden generarse
 * por redondeo en la digitalización de polilíneas o cálculos de geometría.
 * Se diferencian de los gaps normales por su tamaño extremadamente reducido.
 * @param {Array} ring - Vértices del anillo
 * @param {number} microTolerance - Tolerancia para micro-agujeros en metros (default: 0.001 m = 1 mm)
 * @returns {Object} Resultado de detección de micro-agujeros
 */
function detectMicroHoles(ring, microTolerance = 0.001) {
    if (!ring || ring.length < 3) return { microHoles: [], holeCount: 0 };

    const ringClosed = ring.length > 0 && same(ring[0], ring[ring.length - 1]) ? ring : [...ring, ring[0]];
    const microHoles = [];

    // Revisar cada arco consecutivo para ver si hay brechas microscópicas
    for (let i = 0; i < ringClosed.length; i++) {
        const v1 = ringClosed[i];
        const v2 = ringClosed[(i + 1) % ringClosed.length];
        const dist = Math.hypot(v1[0] - v2[0], v1[1] - v2[1]);

        // Si la distancia es muy pequeña pero no cero, podría ser un micro-agujero
        if (dist > 0 && dist < microTolerance) {
            microHoles.push({
                v1: v1,
                v2: v2,
                distance: dist,
                description: `Micro-agujero detectado: ${(dist * 1000).toFixed(2)} mm`
            });
        }
    }

    return {
        microHoles: microHoles.length > 0 ? microHoles : [],
        holeCount: microHoles.length
    };
}

// Exportar funciones nuevas para validación topológica Module 4
export { detectGaps, validateOchavas, detectMicroHoles };
