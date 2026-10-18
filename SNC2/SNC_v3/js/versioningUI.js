import { State } from './state.js';
import { compareVersions, createProjectVersion, transitionVersion } from './versioning.js';
import { showToast } from './utils.js';

async function persistVersions(previous, next) {
    State.set('projectVersions', next);
    if (await State.syncToBackend()) return true;
    State.set('projectVersions', previous);
    showToast('La base de datos rechazó el cambio de versiones.', 'error');
    return false;
}

export async function create() {
    const previous = State.get('projectVersions') || [];
    const message = document.getElementById('version-message')?.value || '';
    const version = createProjectVersion({ geojson: State.get('geojson'), excelData: State.get('excelData'), user: State.getBackendUser(), message });
    version.number = previous.length + 1;
    if (await persistVersions(previous, [...previous, version])) { render(); showToast(`Versión ${version.number} creada.`, 'success'); }
}

export async function transition(id, status) {
    const user = State.getBackendUser();
    if (['APPROVED', 'REJECTED'].includes(status) && !['admin', 'manager'].includes(user?.role)) { showToast('Solo administradores o gestores pueden revisar versiones.', 'error'); return false; }
    const previous = State.get('projectVersions') || [];
    const index = previous.findIndex(version => version.id === id); if (index < 0) return false;
    try {
        const next = structuredClone(previous);
        next[index] = transitionVersion(next[index], status, user, '');
        if (await persistVersions(previous, next)) { render(); return true; }
    } catch (error) { showToast(error.message, 'error'); }
    return false;
}

export function compareLatest() {
    const versions = State.get('projectVersions') || [];
    const output = document.getElementById('version-comparison');
    if (versions.length < 2) { output.textContent = 'Se necesitan al menos dos versiones.'; return; }
    const result = compareVersions(versions.at(-2), versions.at(-1));
    output.innerHTML = `<b>Geometrías modificadas:</b> ${result.geometryChanged} · <b>Atributos modificados:</b> ${result.attributesChanged} · <b>Parcelas:</b> ${result.featureCountBefore} → ${result.featureCountAfter} · <b>Filas:</b> ${result.rowsBefore} → ${result.rowsAfter}`;
}

export function render() {
    const body = document.getElementById('versions-table-body'); if (!body) return;
    const role = State.getBackendUser()?.role;
    body.innerHTML = [...(State.get('projectVersions') || [])].reverse().map(version => `<tr class="border-b border-slate-800"><td class="p-3 font-bold text-cyan-300">v${version.number}</td><td class="p-3 text-xs text-slate-300">${version.message || '—'}</td><td class="p-3 text-xs text-slate-400">${version.authorName || '—'}</td><td class="p-3 text-xs"><span class="rounded bg-slate-800 px-2 py-1">${version.status}</span></td><td class="p-3 text-xs text-slate-500">${new Date(version.createdAt).toLocaleString('es-PY')}</td><td class="p-3 whitespace-nowrap text-right">${version.status === 'DRAFT' ? `<button onclick="VersioningUI.transition('${version.id}','PENDING')" class="rounded bg-blue-700 px-2 py-1 text-xs text-white">Enviar</button>` : ''}${version.status === 'PENDING' && ['admin','manager'].includes(role) ? ` <button onclick="VersioningUI.transition('${version.id}','APPROVED')" class="rounded bg-green-700 px-2 py-1 text-xs text-white">Aprobar</button> <button onclick="VersioningUI.transition('${version.id}','REJECTED')" class="rounded bg-red-700 px-2 py-1 text-xs text-white">Rechazar</button>` : ''}</td></tr>`).join('');
}

document.addEventListener('DOMContentLoaded', () => { render(); State.subscribe('projectVersions', render); });
window.VersioningUI = { create, transition, compareLatest, render };
