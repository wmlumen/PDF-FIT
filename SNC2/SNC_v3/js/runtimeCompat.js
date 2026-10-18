/**
 * Adaptadores para bibliotecas UMD cargadas desde CDN.
 * Mantiene una API consistente para el parser y el validador.
 */
(function configureRuntimeCompatibility() {
    if (window.DxfParser && !window.dxfParser) {
        window.dxfParser = new window.DxfParser();
    }

    if (window.turf && typeof window.turf.booleanValid !== 'function' && typeof window.turf.kinks === 'function') {
        window.turf.booleanValid = function booleanValid(geometryOrFeature) {
            const feature = geometryOrFeature?.type === 'Feature'
                ? geometryOrFeature
                : { type: 'Feature', properties: {}, geometry: geometryOrFeature };
            if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) return true;
            return window.turf.kinks(feature).features.length === 0;
        };
    }
})();
