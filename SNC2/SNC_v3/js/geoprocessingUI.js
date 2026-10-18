import { State } from './state.js';
import { executeGeoprocessing } from './geoprocessing.js';
import { createLineageEvent, getParcelId } from './lineage.js';
import { showToast } from './utils.js';

const modal = () => document.getElementById('geoprocessing-modal');

function featureLabel(feature, index) {
    return `${index + 1}. ${feature.properties?.CODIGO || feature.properties?.PADRON || getParcelId(feature, index)}`;
}

export function open() {
    const features = State.get('geojson')?.features || [];
    if (!features.length) { showToast('Cargue geometrías antes de geoprocesar', 'warning'); return; }
    const options = features.map((feature, index) => `<option value="${index}">${featureLabel(feature, index)}</option>`).join('');
    document.getElementById('geoprocess-primary').innerHTML = options;
    document.getElementById('geoprocess-secondary').innerHTML = options;
    document.getElementById('geoprocess-secondary').value = String(Math.min(1, features.length - 1));
    document.getElementById('geoprocess-result').textContent = '';
    modal()?.classList.remove('hidden');
}

export function close() { modal()?.classList.add('hidden'); }

export async function run() {
    const geojson = State.get('geojson');
    try {
        const operation = document.getElementById('geoprocess-operation').value;
        const result = executeGeoprocessing({
            operation, geojson,
            primaryIndex: document.getElementById('geoprocess-primary').value,
            secondaryIndex: document.getElementById('geoprocess-secondary').value,
            distanceMeters: document.getElementById('geoprocess-distance').value
        }, window.turf);
        const output = document.getElementById('geoprocess-result');
        if (result.type === 'selection') {
            output.textContent = result.selectedIndexes.length ? `Parcelas seleccionadas: ${result.selectedIndexes.map(index => featureLabel(geojson.features[index], index)).join(' · ')}` : 'No existen parcelas que intersecten la principal.';
            return;
        }
        const sourceIds = result.sourceIndexes.map(index => getParcelId(geojson.features[index], index));
        const resultId = crypto.randomUUID();
        const lineageEvent = createLineageEvent({ operation: 'GEOPROCESAMIENTO', sources: sourceIds, results: [resultId], documentRef: operation, user: State.getBackendUser() });
        result.feature.properties = {
            ...(result.feature.properties || {}), SNC_PARCELA_ID: resultId,
            CODIGO: `GEO_${operation}_${Date.now()}`, PARCELA_ESTADO: 'VIGENTE',
            PARCELAS_ORIGEN: sourceIds, CREADA_POR_ACTO: lineageEvent.id, RESULTADO_TECNICO: true
        };
        const next = structuredClone(geojson);
        next.features.push(result.feature);
        const saved = await window.MapEngine.commitExternalGeometry(next, `Geoprocesamiento: ${operation}`, { lineageEvent });
        if (saved) { output.textContent = 'Resultado técnico agregado al expediente y guardado en la base de datos.'; showToast('Geoprocesamiento guardado', 'success'); }
    } catch (error) { showToast(error.message, 'error'); }
}

window.GeoprocessingUI = { open, close, run };
