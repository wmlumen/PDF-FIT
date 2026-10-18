/** Normaliza la geometría a una parcela operativa por feature. */
export function explodePolygonFeatures(geojson, sourceId = 'ARCHIVO') {
    if (!geojson || geojson.type !== 'FeatureCollection') return geojson;
    const features = [];
    for (const [featureIndex, feature] of (geojson.features || []).entries()) {
        if (feature?.geometry?.type !== 'MultiPolygon') {
            features.push(feature);
            continue;
        }
        const baseProps = feature.properties || {};
        feature.geometry.coordinates.forEach((coordinates, polygonIndex) => {
            const part = polygonIndex + 1;
            const baseCode = baseProps.CODIGO || baseProps.ID || `${sourceId}_${featureIndex + 1}`;
            features.push({
                type: 'Feature',
                properties: {
                    ...baseProps,
                    CODIGO: feature.geometry.coordinates.length > 1 ? `${baseCode}_${part}` : baseCode,
                    SNC_COMPONENTE: part
                },
                geometry: { type: 'Polygon', coordinates }
            });
        });
    }
    return { ...geojson, features };
}
