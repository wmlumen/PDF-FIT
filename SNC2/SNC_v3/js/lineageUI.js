import { State } from './state.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function renderLineage() {
    const body = document.getElementById('lineage-table-body');
    const empty = document.getElementById('lineage-empty');
    if (!body) return;
    const events = [...(State.get('parcelLineage') || [])].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    empty?.classList.toggle('hidden', events.length > 0);
    body.innerHTML = events.map(event => `<tr class="border-b border-slate-800">
        <td class="p-3 text-xs font-bold text-cyan-300">${escapeHtml(event.operation)}</td>
        <td class="p-3 text-xs text-slate-300">${escapeHtml(event.sourceParcelIds?.join(', ') || '—')}</td>
        <td class="p-3 text-xs text-slate-300">${escapeHtml(event.resultParcelIds?.join(', ') || '—')}</td>
        <td class="p-3 text-xs text-slate-400">${escapeHtml(event.documentRef || '—')}</td>
        <td class="p-3 text-xs text-slate-400">${escapeHtml(event.userName || '—')}</td>
        <td class="p-3 text-xs text-slate-500">${escapeHtml(new Date(event.timestamp).toLocaleString('es-PY'))}</td>
    </tr>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderLineage();
    State.subscribe('parcelLineage', renderLineage);
});

window.LineageUI = { render: renderLineage };
