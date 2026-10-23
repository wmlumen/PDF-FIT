/**
 * MapLegend — leyenda unificada flotante dentro del mapa (abajo a la izquierda).
 *
 * Reemplaza y fusiona dos cosas que antes estaban separadas:
 *   1. el recuadro "📍 Capas Activas" (overlay del mapa), y
 *   2. la sección "Leyenda" del panel de contenido (izquierda).
 *
 * Comportamiento (spec del usuario):
 *  - Por defecto muestra SOLO lo que está activo (capas visibles y en rango).
 *  - Cada capa se puede quitar de la leyenda desde sus Propiedades
 *    (Interacción → "Mostrar en la leyenda") o desde el menú contextual.
 *  - Se puede colapsar; el estado se recuerda entre sesiones.
 *
 * El estilo es institucional (azul petróleo, misma línea gráfica que el menú
 * contextual y el panel de propiedades).
 */

import LayerManager from './layerManager.js';
import { shouldShowInLegend } from './sncReference.js';
import { logger } from './logger.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const LS_COLLAPSED = 'snc.legend.collapsed';

let hostEl = null;
let boxEl = null;
let hooks = {};
let unsubManager = null;
let collapsed = false;

// ─── Parche de símbolo (spec §2.1) ────────────────────────────────────────────
/**
 * Devuelve el SVG del parche de leyenda según el tipo de símbolo.
 * @param {'point'|'line'|'polygon'|'basemap'} kind
 * @param {object} style {color, fillColor, dashArray}
 */
export function patchSvg(kind, style = {}) {
    const c = style.color || '#22d3ee';
    const fill = style.fillColor || c;
    const dashed = style.dashArray ? 'stroke-dasharray="4,3"' : '';
    if (kind === 'basemap') {
        return `<i class="fas fa-map" style="color:#94a3b8;font-size:9px"></i>`;
    }
    if (kind === 'point') {
        return `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="${fill}" stroke="${c}" stroke-width="1.5"/></svg>`;
    }
    if (kind === 'line') {
        return `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><line x1="1" y1="10" x2="11" y2="2" stroke="${c}" stroke-width="2" ${dashed}/></svg>`;
    }
    return `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="2.5" width="9" height="7" fill="${fill}" fill-opacity="0.35" stroke="${c}" stroke-width="1.5" ${dashed}/></svg>`;
}

/**
 * Infiere el tipo de símbolo de una capa a partir de su información.
 * @param {object} l Entrada de getActiveLayersInfo()
 */
export function kindOf(l) {
    if (l.baseMap) return 'basemap';
    if (l.style?.radius || l.geometryType === 'Point' || l.geometryType === 'MultiPoint') return 'point';
    if (l.geometryType === 'LineString' || l.geometryType === 'MultiLineString') return 'line';
    if (['vias', 'hidro', 'deptos', 'distritos'].includes(l.id)) return 'line';
    return 'polygon';
}

// ─── Render ───────────────────────────────────────────────────────────────────
/**
 * Resuelve el nodo del LayerManager correspondiente a una entrada de capa.
 *
 * Hay dos desajustes de id que hay que salvar:
 *  - el mapa base llega como `base-<clave>` (base-satellite) pero en el modelo
 *    es un único nodo `basemap`;
 *  - las capas del proyecto (parcelas, deptos, distritos…) y la referencia SNC
 *    pueden no tener nodo propio.
 * Si no se encuentra nodo, se devuelve null y la capa se muestra igual: es
 * preferible una fila de más en la leyenda que una capa activa sin símbolo.
 */
function nodeOf(l) {
    return LayerManager.get(l.id) || (l.baseMap ? LayerManager.get('basemap') : null);
}

/** Filas de la leyenda: solo lo activo y no excluido. */
function legendRows() {
    const activas = hooks.getActiveLayers?.() || [];
    return activas.filter(l => {
        if (l.baseMap) return false;
        const n = nodeOf(l);
        if (!n) return true;
        return shouldShowInLegend(n, { isVisible: true });
    });
}

let currentMap = null;
function bindMap() {
    const m = hooks?.getMap?.() || (typeof window !== 'undefined' ? window.MapEngine?.getMap?.() : null);
    if (m && m !== currentMap) {
        if (currentMap) currentMap.off('moveend', render);
        currentMap = m;
        currentMap.on('moveend', render);
    }
}

function render() {
    if (!boxEl) return;
    bindMap();
    const rows = legendRows();

    const body = rows.length
        ? rows.map(l => {
            const kind = kindOf(l);
            const count = l.features ? `<span class="ml-count">(${l.features})</span>` : '';
            const reproj = l.corrected
                ? `<i class="fas fa-wand-magic-sparkles ml-reproj" title="Reproyectada automáticamente"></i>` : '';
            // Quitar de la leyenda sin abrir Propiedades (acceso rápido).
            const quitar = l.baseMap ? '' :
                `<button type="button" class="ml-x" data-hide-legend="${esc(l.id)}"
                         title="Quitar de la leyenda" aria-label="Quitar ${esc(l.title)} de la leyenda">
                   <i class="fas fa-xmark"></i></button>`;
            const zoom = l.baseMap ? '' :
                `<button type="button" class="ml-zoom" data-zoom-layer="${esc(l.id)}"
                         title="Encuadrar esta capa" aria-label="Encuadrar ${esc(l.title)}">
                   <i class="fas fa-crosshairs"></i></button>`;
            return `<div class="ml-row" title="${esc(l.title)}${l.sourcePath ? ' — ' + esc(l.sourcePath) : ''}">
                <span class="ml-patch">${patchSvg(kind, l.style || {})}</span>
                <span class="ml-title">${esc(l.title)}</span>${count}${reproj}
                <span class="ml-actions">${zoom}${quitar}</span>
            </div>`;
        }).join('')
        : `<p class="ml-empty">Sin capas visibles en este encuadre.</p>`;

    boxEl.innerHTML = `
        <button type="button" class="ml-head" id="ml-toggle"
                aria-label="Leyenda" title="Leyenda" aria-pressed="${collapsed ? 'true' : 'false'}"
                aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="ml-body">
          <i class="fas fa-list" aria-hidden="true"></i>
          <span>Leyenda</span>
          <span class="ml-count-badge">${rows.length}</span>
          <i class="fas fa-chevron-${collapsed ? 'up' : 'down'} ml-caret" aria-hidden="true"></i>
        </button>
        <div id="ml-body" class="ml-body" ${collapsed ? 'hidden' : ''}>${body}</div>`;
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function handleClick(e) {
    const t = e.target;

    if (t.closest('#ml-toggle')) {
        collapsed = !collapsed;
        try { localStorage.setItem(LS_COLLAPSED, collapsed ? '1' : '0'); } catch { /* modo privado */ }
        render();
        return;
    }

    const hide = t.closest('[data-hide-legend]');
    if (hide) {
        const id = hide.dataset.hideLegend;
        const n = LayerManager.get(id);
        if (n) {
            n.legend.showInLegend = false;
            LayerManager._emit?.('change', { type: 'legend', id });
            // Avisar a la UI (el panel de propiedades muestra el mismo flag).
            window.dispatchEvent(new CustomEvent('snc:legend-changed', { detail: { id, show: false } }));
        }
        render();
        return;
    }

    const zoom = t.closest('[data-zoom-layer]');
    if (zoom) {
        hooks.onZoomLayer?.(zoom.dataset.zoomLayer);
    }
}

// ─── Montaje ──────────────────────────────────────────────────────────────────
/**
 * Monta la leyenda dentro del contenedor del mapa.
 *
 * @param {HTMLElement|string} host Contenedor. Por defecto el propio mapa.
 * @param {object} [opts]
 * @param {Function} [opts.getActiveLayers] Devuelve [{id,title,features,style,baseMap,...}].
 * @param {Function} [opts.onZoomLayer] Encuadra una capa por id.
 */
export function mount(host, opts = {}) {
    if (boxEl) return true;
    const parent = typeof host === 'string' ? document.querySelector(host) : host;
    hostEl = document.getElementById('map-bottom-left-stack') || parent;
    if (!hostEl) { logger.warn('MapLegend: contenedor no encontrado'); return false; }
    hooks = opts;

    try { collapsed = localStorage.getItem(LS_COLLAPSED) === '1'; } catch { collapsed = false; }

    boxEl = document.createElement('div');
    boxEl.id = 'map-legend';
    boxEl.setAttribute('role', 'region');
    boxEl.setAttribute('aria-label', 'Leyenda del mapa');
    hostEl.appendChild(boxEl);

    boxEl.addEventListener('click', handleClick);

    // Refrescar cuando cambian las capas o la configuración de leyenda.
    window.addEventListener('snc:layers-changed', render);
    window.addEventListener('snc:legend-changed', render);
    unsubManager = LayerManager.on('change', render);

    render();
    return true;
}

export function unmount() {
    window.removeEventListener('snc:layers-changed', render);
    window.removeEventListener('snc:legend-changed', render);
    if (currentMap) {
        currentMap.off('moveend', render);
        currentMap = null;
    }
    unsubManager?.();
    unsubManager = null;
    boxEl?.remove();
    boxEl = null;
}

/** Refresca la leyenda (lo llama el motor del mapa tras cambiar capas). */
export function refresh() { render(); }

/** ¿Está visible la leyenda? */
export function isMounted() { return !!boxEl; }

export default { mount, unmount, refresh, isMounted, patchSvg, kindOf };
