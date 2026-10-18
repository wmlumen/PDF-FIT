/**
 * Worker para cálculos topológicos pesados
 */
importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js');

/**
 * Helper para descartar solapamientos imposibles
 */
function doBboxesOverlap(b1, b2) {
    return !(b2[0] > b1[2] || b2[2] < b1[0] || b2[1] > b1[3] || b2[3] < b1[1]);
}

self.onmessage = function (e) {
    const features = e.data || [];
    const results = [];

    if (features.length === 0) {
        self.postMessage([]);
        return;
    }

    // Pre-calcular bboxes para optimizar 5x el rendimiento
    const bboxes = features.map(f => turf.bbox(f));

    for (let i = 0; i < features.length; i++) {
        const box1 = bboxes[i];
        for (let j = i + 1; j < features.length; j++) {
            // Check rápido de Bounding Box
            if (!doBboxesOverlap(box1, bboxes[j])) continue;

            try {
                const intersection = turf.intersect(features[i], features[j]);
                if (intersection && turf.area(intersection) > 0.1) {
                    const cod1 = features[i].properties.CODIGO || `PARCELA_${i + 1}`;
                    const cod2 = features[j].properties.CODIGO || `PARCELA_${j + 1}`;
                    results.push({
                        campo: `SOLAPAMIENTO_${cod1}_${cod2}`,
                        valor: turf.area(intersection).toFixed(2) + 'm²',
                        estado: 'error',
                        mensaje: `Solapamiento detectado entre ${cod1} y ${cod2}`
                    });
                }
            } catch (err) { /* Ignorar errores de intersección */ }
        }
    }
    self.postMessage(results);
};
