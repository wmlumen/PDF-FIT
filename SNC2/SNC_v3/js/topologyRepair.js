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
