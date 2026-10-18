const clone = value => structuredClone(value);

export function createProjectVersion({ geojson, excelData, user, message = '', timestamp = new Date().toISOString() }) {
    if (!geojson?.features) throw new Error('No existe geometría para versionar');
    return {
        id: crypto.randomUUID(), number: 0, status: 'DRAFT', message: String(message || '').trim(),
        authorId: user?.id || null, authorName: user?.name || user?.email || null,
        createdAt: timestamp, reviewedAt: null, reviewerId: null, reviewerName: null, reviewComment: '',
        snapshot: { geojson: clone(geojson), excelData: clone(excelData || []) }
    };
}

export function transitionVersion(version, nextStatus, reviewer, comment = '') {
    const allowed = { DRAFT: ['PENDING'], PENDING: ['APPROVED', 'REJECTED'], APPROVED: [], REJECTED: ['PENDING'] };
    const target = String(nextStatus || '').toUpperCase();
    if (!allowed[version.status]?.includes(target)) throw new Error(`Transición no permitida: ${version.status} → ${target}`);
    const next = clone(version);
    next.status = target;
    if (['APPROVED', 'REJECTED'].includes(target)) {
        next.reviewedAt = new Date().toISOString(); next.reviewerId = reviewer?.id || null; next.reviewerName = reviewer?.name || reviewer?.email || null; next.reviewComment = String(comment || '').trim();
    }
    return next;
}

export function compareVersions(left, right) {
    const a = left?.snapshot || { geojson: { features: [] }, excelData: [] };
    const b = right?.snapshot || { geojson: { features: [] }, excelData: [] };
    const aFeatures = a.geojson?.features || []; const bFeatures = b.geojson?.features || [];
    const max = Math.max(aFeatures.length, bFeatures.length);
    let geometryChanged = 0; let attributesChanged = 0;
    for (let index = 0; index < max; index++) {
        if (JSON.stringify(aFeatures[index]?.geometry || null) !== JSON.stringify(bFeatures[index]?.geometry || null)) geometryChanged++;
        if (JSON.stringify(aFeatures[index]?.properties || null) !== JSON.stringify(bFeatures[index]?.properties || null)) attributesChanged++;
    }
    return { featureCountBefore: aFeatures.length, featureCountAfter: bFeatures.length, geometryChanged, attributesChanged, rowsBefore: a.excelData.length, rowsAfter: b.excelData.length };
}
