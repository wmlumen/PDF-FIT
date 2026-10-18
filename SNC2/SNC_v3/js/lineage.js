const clone = value => structuredClone(value);
const technicalId = (feature, index = 0) => String(feature?.properties?.SNC_PARCELA_ID || feature?.properties?.CODIGO || feature?.properties?.PADRON || `parcela-${index + 1}`);

export function createLineageEvent({ operation, sources = [], results = [], documentRef = '', user = null, timestamp = new Date().toISOString() }) {
    const allowed = ['SUBDIVISION', 'UNION', 'RECTIFICACION', 'COGO', 'GEOPROCESAMIENTO'];
    const normalized = String(operation || '').trim().toUpperCase();
    if (!allowed.includes(normalized)) throw new Error(`Operación parcelaria no admitida: ${operation}`);
    if (!sources.length && normalized !== 'COGO') throw new Error('El acto requiere al menos una parcela origen');
    if (!results.length) throw new Error('El acto requiere al menos una parcela resultante');
    return {
        id: crypto.randomUUID(), operation: normalized,
        sourceParcelIds: [...new Set(sources.map(String))], resultParcelIds: [...new Set(results.map(String))],
        documentRef: String(documentRef || '').trim(),
        userId: user?.id || null, userName: user?.name || user?.email || null,
        timestamp
    };
}

export function applyLineageEvent(geojson, event) {
    const next = clone(geojson);
    next.features.forEach((feature, index) => {
        feature.properties ||= {};
        const id = technicalId(feature, index);
        if (event.sourceParcelIds.includes(id)) {
            feature.properties.PARCELA_ESTADO = 'HISTORICA';
            feature.properties.RETIRADA_POR_ACTO = event.id;
        }
        if (event.resultParcelIds.includes(id)) {
            feature.properties.PARCELA_ESTADO = 'VIGENTE';
            feature.properties.CREADA_POR_ACTO = event.id;
            feature.properties.PARCELAS_ORIGEN = [...event.sourceParcelIds];
        }
    });
    return next;
}

export function getParcelId(feature, index) { return technicalId(feature, index); }
