const XML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, char => XML_ESCAPE[char]);

export function selectOfficialProperties(properties, requiredFields) {
    const source = properties || {};
    return Object.fromEntries(requiredFields.map(field => [field, source[field] ?? '']));
}

export function buildGeoJSON(geojson) {
    if (!geojson?.features?.length) throw new Error('No hay geometrías para exportar');
    return JSON.stringify(geojson, null, 2);
}

export function buildKML(geojson) {
    if (!geojson?.features?.length) throw new Error('No hay geometrías para exportar');
    const placemarks = geojson.features.map((feature, index) => {
        const props = feature.properties || {};
        const name = props.PADRON || props.CODIGO || `Parcela ${index + 1}`;
        const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates]
            : feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
        if (!polygons.length) return '';
        const geometries = polygons.map(polygon => {
            const coords = ring => ring.map(coord => `${Number(coord[0])},${Number(coord[1])},0`).join(' ');
            const inner = polygon.slice(1).map(ring => `<innerBoundaryIs><LinearRing><coordinates>${coords(ring)}</coordinates></LinearRing></innerBoundaryIs>`).join('');
            return `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${coords(polygon[0] || [])}</coordinates></LinearRing></outerBoundaryIs>${inner}</Polygon>`;
        }).join('');
        const geometry = polygons.length > 1 ? `<MultiGeometry>${geometries}</MultiGeometry>` : geometries;
        const description = `Padrón: ${props.PADRON || 'S/D'} | Superficie SIG: ${props.SUP_SIG_M ?? props.SUP_SIG_M2 ?? 'S/D'} m²`;
        return `<Placemark><name>${escapeXml(name)}</name><description>${escapeXml(description)}</description>${geometry}</Placemark>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Expediente SNC</name>${placemarks}</Document></kml>`;
}
