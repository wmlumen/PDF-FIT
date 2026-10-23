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

export function buildDXF(geojson) {
    if (!geojson?.features?.length) throw new Error('No hay geometrías para exportar a DXF');

    let entities = '';
    
    geojson.features.forEach((feature, fIdx) => {
        const props = feature.properties || {};
        const label = String(props.PADRON || props.CODIGO || `P_${fIdx + 1}`);
        const geom = feature.geometry;
        if (!geom) return;

        const polygons = geom.type === 'Polygon' ? [geom.coordinates]
            : geom.type === 'MultiPolygon' ? geom.coordinates : [];

        polygons.forEach(polygon => {
            const ring = polygon[0];
            if (!Array.isArray(ring) || ring.length < 3) return;

            const numVerts = ring.length;
            let polyline = '0\nLWPOLYLINE\n5\n' + (100 + fIdx).toString(16) + '\n8\n0_LIMITES_PARCELAS\n100\nAcDbEntity\n100\nAcDbPolyline\n';
            polyline += `90\n${numVerts}\n70\n1\n`;

            let sumX = 0, sumY = 0;
            for (let i = 0; i < ring.length; i++) {
                const [x, y] = ring[i];
                polyline += `10\n${Number(x).toFixed(4)}\n20\n${Number(y).toFixed(4)}\n`;
                if (i < ring.length - 1) {
                    sumX += x;
                    sumY += y;
                    entities += `0\nPOINT\n8\n1_VERTICES_MOJONES\n10\n${Number(x).toFixed(4)}\n20\n${Number(y).toFixed(4)}\n30\n0.0\n`;
                    entities += `0\nTEXT\n8\n1_VERTICES_MOJONES\n10\n${(Number(x) + 0.3).toFixed(4)}\n20\n${(Number(y) + 0.3).toFixed(4)}\n30\n0.0\n40\n1.0\n1\nV${i + 1}\n`;
                }
            }
            entities += polyline;

            const count = ring.length - 1;
            if (count > 0) {
                const cx = (sumX / count).toFixed(4);
                const cy = (sumY / count).toFixed(4);
                entities += `0\nTEXT\n8\n2_TEXTOS_PADRON\n10\n${cx}\n20\n${cy}\n30\n0.0\n40\n2.5\n1\nPADRON ${label}\n`;
            }
        });
    });

    const header = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n`;
    const tables = `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n3\n` +
        `0\nLAYER\n2\n0_LIMITES_PARCELAS\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n` +
        `0\nLAYER\n2\n1_VERTICES_MOJONES\n70\n0\n62\n2\n6\nCONTINUOUS\n0\n` +
        `0\nLAYER\n2\n2_TEXTOS_PADRON\n70\n0\n62\n7\n6\nCONTINUOUS\n0\n` +
        `ENDTAB\n0\nENDSEC\n`;
    const body = `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;

    return header + tables + body;
}
