import { State } from './state.js';
import { buildCogoRing, parseCogoCourses } from './cogo.js';
import { showToast } from './utils.js';
import { createLineageEvent } from './lineage.js';

const $ = id => document.getElementById(id);
const shoelaceArea = ring => Math.abs(ring.slice(0, -1).reduce((sum, point, index) => {
    const next = ring[(index + 1) % (ring.length - 1)];
    return sum + point[0] * next[1] - next[0] * point[1];
}, 0)) / 2;

export function open() { $('cogo-modal')?.classList.remove('hidden'); }
export function close() { $('cogo-modal')?.classList.add('hidden'); }

export function preview() {
    try {
        const courses = parseCogoCourses($('cogo-courses').value);
        const result = buildCogoRing([Number($('cogo-east').value), Number($('cogo-north').value)], courses);
        $('cogo-report').innerHTML = `<div><b>Tramos:</b> ${result.report.length}</div><div><b>Superficie:</b> ${shoelaceArea(result.coordinates).toFixed(4)} m²</div><div><b>Error de cierre:</b> ${result.closureDistance.toFixed(4)} m</div><div><b>Precisión:</b> ${Number.isFinite(result.closureRatio) ? `1:${Math.round(result.closureRatio)}` : 'Cierre exacto'}</div>`;
        return result;
    } catch (error) {
        $('cogo-report').textContent = error.message;
        return null;
    }
}

export async function createParcel() {
    const result = preview();
    if (!result) return false;
    const tolerance = Math.max(0, Number($('cogo-closure-tolerance').value) || 0.05);
    if (result.closureDistance > tolerance) {
        showToast(`El error de cierre (${result.closureDistance.toFixed(3)} m) supera la tolerancia.`, 'error');
        return false;
    }
    const projection = State.get('currentDisplayProjection') === 'EPSG:32720'
        ? '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs'
        : '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
    const geographicRing = result.coordinates.map(coordinate => proj4(projection, 'WGS84', coordinate));
    const current = State.get('geojson');
    const next = structuredClone(current || { type: 'FeatureCollection', features: [] });
    const parcelId = crypto.randomUUID();
    next.features.push({
        type: 'Feature',
        properties: { SNC_PARCELA_ID: parcelId, PARCELA_ESTADO: 'VIGENTE', COGO_ORIGEN: 'DERROTERO', COGO_CIERRE_M: Number(result.closureDistance.toFixed(4)) },
        geometry: { type: 'Polygon', coordinates: [geographicRing] }
    });
    const lineageEvent = createLineageEvent({ operation: 'COGO', results: [parcelId], user: State.getBackendUser() });
    next.features.at(-1).properties.CREADA_POR_ACTO = lineageEvent.id;
    const saved = await window.MapEngine?.commitExternalGeometry(next, 'Construcción COGO', { lineageEvent });
    if (saved) close();
    return Boolean(saved);
}

export const CogoUI = { open, close, preview, createParcel };
window.CogoUI = CogoUI;
