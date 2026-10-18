const ensureFeature = (features, index, label) => {
    const feature = features?.[Number(index)];
    if (!feature) throw new Error(`Seleccione ${label}`);
    return feature;
};

const booleanResult = (turfApi, operation, first, second) => {
    const collection = turfApi.featureCollection([first, second]);
    if (operation === 'INTERSECTION' || operation === 'CLIP') return turfApi.intersect(collection);
    if (operation === 'UNION') return turfApi.union(collection);
    if (operation === 'DIFFERENCE') return turfApi.difference(collection);
    throw new Error(`Operación no admitida: ${operation}`);
};

export function executeGeoprocessing({ operation, geojson, primaryIndex = 0, secondaryIndex = 1, distanceMeters = 0 }, turfApi) {
    if (!turfApi || !geojson?.features?.length) throw new Error('No hay geometrías disponibles');
    const normalized = String(operation || '').toUpperCase();
    const first = ensureFeature(geojson.features, primaryIndex, 'la parcela principal');
    if (normalized === 'BUFFER') {
        const distance = Number(distanceMeters);
        if (!Number.isFinite(distance) || distance <= 0) throw new Error('La distancia de buffer debe ser mayor que cero');
        return { type: 'geometry', feature: turfApi.buffer(first, distance, { units: 'meters' }), sourceIndexes: [Number(primaryIndex)] };
    }
    if (normalized === 'DISSOLVE') {
        const polygons = geojson.features.filter(feature => ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type));
        if (polygons.length < 2) throw new Error('Disolver requiere al menos dos polígonos');
        const dissolved = polygons.slice(1).reduce((current, feature) => turfApi.union(turfApi.featureCollection([current, feature])), polygons[0]);
        return { type: 'geometry', feature: dissolved, sourceIndexes: polygons.map(feature => geojson.features.indexOf(feature)) };
    }
    const second = ensureFeature(geojson.features, secondaryIndex, 'la segunda parcela');
    if (normalized === 'SPATIAL_SELECT') {
        const selectedIndexes = geojson.features
            .map((feature, index) => index !== Number(primaryIndex) && turfApi.booleanIntersects(first, feature) ? index : -1)
            .filter(index => index >= 0);
        return { type: 'selection', selectedIndexes, sourceIndexes: [Number(primaryIndex)] };
    }
    const feature = booleanResult(turfApi, normalized, first, second);
    if (!feature) throw new Error('La operación no produjo geometría; verifique que las parcelas se relacionen espacialmente');
    return { type: 'geometry', feature, sourceIndexes: [...new Set([Number(primaryIndex), Number(secondaryIndex)])] };
}
