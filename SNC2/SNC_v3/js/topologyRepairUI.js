import { State } from './state.js';
import { buildTopologyRepairPreview } from './topologyRepair.js';
import { createLineageEvent, getParcelId } from './lineage.js';
import { showToast } from './utils.js';

let currentPreview = null;
let previewLayer = null;

function clearLayer() {
    const map = window.MapEngine?.getMap?.();
    if (map && previewLayer) map.removeLayer(previewLayer);
    previewLayer = null;
}

export function open() {
    const geojson = State.get('geojson');
    if (!geojson?.features?.length) { showToast('Cargue geometrías antes de analizar correcciones.', 'warning'); return; }
    currentPreview = buildTopologyRepairPreview(geojson, turf);
    const list = document.getElementById('topology-repair-list');
    list.innerHTML = currentPreview.actions.length
        ? currentPreview.actions.map(action => `<li class="rounded bg-slate-800 p-2"><b>${action.type}</b> · Parcela ${action.featureIndex + 1}${action.areaM2 ? ` · ${action.areaM2.toFixed(3)} m²` : ''}</li>`).join('')
        : '<li class="text-slate-500">No se encontraron reparaciones deterministas.</li>';
    document.getElementById('topology-repair-unresolved').textContent = currentPreview.unresolved.length
        ? `${currentPreview.unresolved.length} incidencias requieren revisión manual; no se modificarán automáticamente.`
        : 'No quedan incidencias no resueltas en la propuesta.';
    clearLayer();
    const map = window.MapEngine?.getMap?.();
    if (map) {
        previewLayer = L.geoJSON(currentPreview.preview, { style: { color: '#f59e0b', weight: 4, dashArray: '8 5', fillColor: '#f59e0b', fillOpacity: 0.16 } }).addTo(map);
        const bounds = previewLayer.getBounds(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [45, 45] });
    }
    document.getElementById('topology-repair-modal')?.classList.remove('hidden');
}

export function close() { clearLayer(); document.getElementById('topology-repair-modal')?.classList.add('hidden'); }

export async function apply() {
    if (!currentPreview?.actions?.length) return false;
    const ids = currentPreview.preview.features.map(getParcelId);
    const event = createLineageEvent({ operation: 'GEOPROCESAMIENTO', sources: ids, results: ids, user: State.getBackendUser() });
    const saved = await window.MapEngine?.commitExternalGeometry(currentPreview.preview, 'Corrección topológica asistida', { lineageEvent: event });
    if (saved) close();
    return Boolean(saved);
}

window.TopologyRepairUI = { open, close, apply };
