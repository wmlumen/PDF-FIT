/**
 * AttributeTableUI — panel inferior acoplado de la tabla de atributos (spec §3).
 *
 * Consume la API pública de AttributeTable (modelo) y se encarga de:
 *  - el panel acoplado abajo, con divisor redimensionable
 *  - minimizar / maximizar / cerrar
 *  - cabeceras ordenables (3 estados), popover de columnas
 *  - barra de filtro con validación en vivo
 *  - selección sincronizada tabla ↔ mapa, con resaltado
 *  - zoom a la selección
 *  - tabla hija (relates 1:N) con botón de vuelta
 *
 * Todo el texto visible está en español.
 */

import { AttributeTable, formatCellValue, FILTER_OPERATORS } from './attributeTable.js';
import { showToast } from './utils.js';
import { logger } from './logger.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Umbral de columnas numéricas para alinear a la derecha.
const NUMERIC_HINT = /AREA|SUP|SUPERF|DIST|LONG|PADRON|CODIGO|ID$|_ID$|LOTE|MANZANA|ZONA/i;

let panelEl = null;
let hostEl = null;
let colsPopEl = null;
let unsubscribe = null;
let hooks = {};
let mapLayerRef = null;        // capa Leaflet de la que provienen las features
let dragState = null;

// ─── Resaltado en el mapa (spec §3.3) ─────────────────────────────────────────
let highlightLayer = null;

/** Estilos del resaltado de selección. */
const HIGHLIGHT_STYLE = {
    color: '#38bdf8',
    weight: 3,
    opacity: 1,
    fillColor: '#38bdf8',
    fillOpacity: 0.35,
    dashArray: null
};

/**
 * Dibuja el resaltado de las geometrías seleccionadas sobre el mapa.
 * @param {object} map Instancia Leaflet.
 * @param {object[]} features
 */
export function drawHighlight(map, features) {
    if (!map) return;
    clearHighlight(map);
    if (!features?.length) return;
    highlightLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: HIGHLIGHT_STYLE,
        pointToLayer: (_, latlng) => L.circleMarker(latlng, { ...HIGHLIGHT_STYLE, radius: 8 }),
        // El resaltado no debe capturar clics: la interacción sigue en la tabla.
        interactive: false
    }).addTo(map);
}

/** Quita el resaltado del mapa. */
export function clearHighlight(map) {
    if (highlightLayer && map) map.removeLayer(highlightLayer);
    highlightLayer = null;
}

/**
 * Encaja el mapa en la extensión de la selección.
 * Un punto: paneo con zoom adecuado. Varios o polígono: fitBounds.
 * @param {object} map
 * @param {object[]} features
 */
export function zoomToSelection(map, features) {
    if (!map || !features?.length) return false;
    const tmp = L.geoJSON({ type: 'FeatureCollection', features });
    const bounds = tmp.getBounds();
    if (!bounds.isValid()) return false;
    if (bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()) {
        // Punto único: paneo y zoom de detalle.
        map.setView(bounds.getCenter(), Math.max(map.getZoom(), 16), { animate: true });
    } else {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
    }
    return true;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderHead() {
    const node = hooks.getLayerNode?.() || {};
    const rel = AttributeTable.related;
    const title = rel
        ? `${rel.label || AttributeTable.layerId} — registros relacionados`
        : (node.title || AttributeTable.layerId || 'Sin capa');
    const meta = `${AttributeTable.filteredCount}${AttributeTable.hasFilter ? ' de ' + AttributeTable.totalRows : ''} registro(s)`;

    return `
        <div id="at-head">
          <i class="fas fa-table" style="color:#7dd3fc"></i>
          <span id="at-title" title="${esc(title)}">${esc(title)}</span>
          ${rel ? `<span id="at-related-badge" title="Tabla relacionada 1:N">1:N</span>` : ''}
          <span id="at-meta">${esc(meta)}</span>
          <span class="at-spacer"></span>
          ${rel ? `<button type="button" class="at-hbtn" data-act="back" title="Volver a la tabla principal" aria-label="Volver"><i class="fas fa-arrow-left"></i></button>` : ''}
          <button type="button" class="at-hbtn" data-act="zoom-sel" title="Acercar a la selección" aria-label="Acercar a la selección" ${AttributeTable.selectionCount ? '' : 'disabled'}><i class="fas fa-crosshairs"></i></button>
          <button type="button" class="at-hbtn" data-act="clear-sel" title="Quitar selección" aria-label="Quitar selección" ${AttributeTable.selectionCount ? '' : 'disabled'}><i class="fas fa-eraser"></i></button>
          <button type="button" class="at-hbtn" data-act="export" title="Exportar tabla a CSV" aria-label="Exportar CSV"><i class="fas fa-file-csv"></i></button>
          <button type="button" class="at-hbtn" data-act="export-geojson" title="Exportar tabla a GeoJSON" aria-label="Exportar GeoJSON"><i class="fas fa-file-code"></i></button>
          <button type="button" class="at-hbtn" data-act="export-json" title="Exportar tabla a JSON" aria-label="Exportar JSON"><i class="fas fa-file-lines"></i></button>
          <button type="button" class="at-hbtn" data-act="min" title="Minimizar" aria-label="Minimizar"><i class="fas fa-window-minimize"></i></button>
          <button type="button" class="at-hbtn" data-act="max" title="Maximizar o restaurar" aria-label="Maximizar"><i class="fas fa-window-maximize"></i></button>
          <button type="button" class="at-hbtn" data-act="close" title="Cerrar la tabla" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
        </div>`;
}

function renderTools() {
    return `
        <div id="at-tools">
          <input id="at-filter" type="text" placeholder="Filtrar — ej: AREA &gt; 1000  ·  TIPO = URBANO  ·  NOMBRE contiene río"
                 value="${esc(AttributeTable.hasFilter ? buildFilterText() : '')}"
                 aria-label="Filtro de la tabla">
          <button type="button" class="at-tbtn" data-act="apply-filter">Aplicar</button>
          <button type="button" class="at-tbtn" data-act="clear-filter" ${AttributeTable.hasFilter ? '' : 'disabled'}>Limpiar</button>
          <button type="button" class="at-tbtn" data-act="columns"><i class="fas fa-table-columns"></i> Columnas</button>
          <p id="at-filter-error" hidden></p>
        </div>`;
}

/** Reconstruye el texto del filtro desde el modelo. */
function buildFilterText() {
    const f = AttributeTable.filter;
    if (!f) return '';
    const op = FILTER_OPERATORS.find(o => o.id === f.op);
    if (op && !op.needsValue) return `${f.field} ${op.label}`;
    return `${f.field} ${f.op} ${f.value}`;
}

function renderTable() {
    const cols = AttributeTable.visibleColumns();
    const rows = AttributeTable.pageRows();

    if (!rows.length) {
        const msg = AttributeTable.totalRows === 0
            ? 'La capa no tiene registros.'
            : 'Ningún registro coincide con el filtro.';
        return `<table id="at-table"><tbody><tr><td class="at-empty">${msg}</td></tr></tbody></table>`;
    }

    const head = cols.map(c => {
        const st = AttributeTable.sortStateOf(c.field);
        const arrow = st === 'asc' ? '▲' : (st === 'desc' ? '▼' : '⇅');
        const cls = [
            c.related ? 'at-related' : '',
            NUMERIC_HINT.test(c.field) ? 'at-num' : '',
            st ? 'at-sorted' : ''
        ].filter(Boolean).join(' ');
        const title = st === 'asc' ? 'Ordenado ascendente — clic para descendente'
                    : st === 'desc' ? 'Ordenado descendente — clic para el orden original'
                    : 'Clic para ordenar ascendente';
        return `<th class="${cls}" data-field="${esc(c.field)}" title="${esc(c.label)} — ${title}"
                    aria-sort="${st === 'asc' ? 'ascending' : st === 'desc' ? 'descending' : 'none'}">
            ${esc(c.label)}<span class="at-sort">${arrow}</span></th>`;
    }).join('');

    const body = rows.map(r => {
        const sel = AttributeTable.isSelected(r.index);
        const tds = cols.map(c => {
            const raw = r.feature?.properties?.[c.field];
            // Columna de relación: botón "Ver" para abrir la tabla hija.
            if (c.related) {
                return `<td><button type="button" class="at-relate-btn" data-act="open-related"
                            data-row="${r.index}" data-field="${esc(c.field)}">Ver</button></td>`;
            }
            // Columna de adjuntos: enlace si el valor parece una URL.
            if (c.isAttachment) {
                const v = String(raw ?? '');
                return /^https?:\/\//i.test(v)
                    ? `<td><a class="at-attach" href="${esc(v)}" target="_blank" rel="noopener">Abrir</a></td>`
                    : `<td>${esc(formatCellValue(raw, c.field))}</td>`;
            }
            const cls = NUMERIC_HINT.test(c.field) ? 'at-num' : '';
            return `<td class="${cls}" title="${esc(formatCellValue(raw, c.field))}">${esc(formatCellValue(raw, c.field))}</td>`;
        }).join('');
        return `<tr class="${sel ? 'at-selected' : ''}" data-row="${r.index}"
                    aria-selected="${sel}" tabindex="0">${tds}</tr>`;
    }).join('');

    return `<table id="at-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderFoot() {
    const total = AttributeTable.filteredCount;
    const page = AttributeTable.page;
    const pages = AttributeTable.totalPages;
    const from = total ? (page - 1) * AttributeTable.pageSize + 1 : 0;
    const to = Math.min(page * AttributeTable.pageSize, total);
    const sel = AttributeTable.selectionCount;

    return `
        <div id="at-foot">
          <span id="at-page-info">${from}–${to} de ${total}</span>
          <button type="button" class="at-tbtn" data-act="first" ${page > 1 ? '' : 'disabled'} title="Primera página">«</button>
          <button type="button" class="at-tbtn" data-act="prev" ${page > 1 ? '' : 'disabled'} title="Página anterior">‹</button>
          <span id="at-page-info">Página ${page} de ${pages}</span>
          <button type="button" class="at-tbtn" data-act="next" ${page < pages ? '' : 'disabled'} title="Página siguiente">›</button>
          <button type="button" class="at-tbtn" data-act="last" ${page < pages ? '' : 'disabled'} title="Última página">»</button>
          <span class="at-spacer"></span>
          <span id="at-sel-info">${sel ? sel + ' seleccionado(s)' : ''}</span>
          <label>Filas
            <select data-act="page-size" aria-label="Filas por página">
              ${[25, 50, 100, 250].map(n =>
                `<option value="${n}" ${AttributeTable.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </label>
        </div>`;
}

/** Render completo del panel. */
export function render() {
    if (!panelEl) return;
    const minimized = panelEl.classList.contains('at-minimized');
    panelEl.innerHTML = `
        <div id="at-splitter" role="separator" aria-orientation="horizontal" aria-label="Redimensionar la tabla"></div>
        ${renderHead()}
        <div id="at-body">${minimized ? '' : renderTable()}</div>
        ${minimized ? '' : renderTools()}
        ${minimized ? '' : renderFoot()}`;
    // El orden visual: cabecera, herramientas, cuerpo, pie.
    if (!minimized) {
        const body = panelEl.querySelector('#at-body');
        const tools = panelEl.querySelector('#at-tools');
        panelEl.insertBefore(tools, body);
    }
    closeColumnsPopover();
    syncLegendOffset();
}

// ─── Popover de columnas (spec §3.2) ──────────────────────────────────────────
function closeColumnsPopover() {
    if (colsPopEl?.parentNode) colsPopEl.parentNode.removeChild(colsPopEl);
    colsPopEl = null;
}

function openColumnsPopover(anchor) {
    closeColumnsPopover();
    colsPopEl = document.createElement('div');
    colsPopEl.id = 'at-cols-pop';
    colsPopEl.setAttribute('role', 'dialog');
    colsPopEl.setAttribute('aria-label', 'Mostrar, ocultar, ordenar y renombrar columnas');
    colsPopEl.innerHTML = `
        <div class="at-col-head">
            <span class="at-col-tit">Columnas</span>
            <button type="button" class="at-col-tip" id="at-cols-help" title="Marcá para mostrar/ocultar. Usá ↑ ↓ para mover. ✎ para renombrar.">?</button>
        </div>
        ${AttributeTable.allColumns().map((c, i, all) => `
        <div class="at-col-row" data-field="${esc(c.field)}" title="${esc(c.field)}">
            <input type="checkbox" data-field="${esc(c.field)}" ${c.visible ? 'checked' : ''} aria-label="Mostrar ${esc(c.label)}">
            <span class="at-col-name">${esc(c.label)}</span>
            <span class="at-col-field">${esc(c.field)}</span>
            <button type="button" class="at-col-mv" data-dir="-1" data-field="${esc(c.field)}" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(c.label)}">↑</button>
            <button type="button" class="at-col-mv" data-dir="1" data-field="${esc(c.field)}" ${i === all.length - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(c.label)}">↓</button>
            <button type="button" class="at-col-rn" data-field="${esc(c.field)}" aria-label="Renombrar ${esc(c.label)}" title="Renombrar cabecera">✎</button>
        </div>`).join('')}`;

    const r = anchor.getBoundingClientRect();
    colsPopEl.style.left = Math.min(r.left, window.innerWidth - 210) + 'px';
    colsPopEl.style.top = (r.bottom + 4) + 'px';
    document.body.appendChild(colsPopEl);

    const persist = () => hooks.onColumnsChanged?.(
        AttributeTable.hiddenColumnNames(),
        AttributeTable.allColumns().map(c => c.field)
    );

    colsPopEl.addEventListener('change', (e) => {
        const cb = e.target.closest('input[data-field]');
        if (!cb) return;
        const visibles = AttributeTable.visibleColumns().length;
        if (!cb.checked && visibles <= 1) {
            cb.checked = true;
            showToast('Debe quedar al menos una columna visible', 'warning');
            return;
        }
        AttributeTable.setColumnVisible(cb.dataset.field, cb.checked);
        persist();
        render();
        // El popover se recrea: se reabre para permitir varios toggles seguidos.
        setTimeout(() => openColumnsPopover(anchor), 0);
    });

    colsPopEl.addEventListener('click', (e) => {
        const up = e.target.closest('.at-col-mv[data-dir="-1"]');
        const down = e.target.closest('.at-col-mv[data-dir="1"]');
        const rn = e.target.closest('.at-col-rn');
        if (up && !up.disabled) {
            AttributeTable.moveColumn(up.dataset.field, -1);
            persist();
            render();
            setTimeout(() => openColumnsPopover(anchor), 0);
            return;
        }
        if (down && !down.disabled) {
            AttributeTable.moveColumn(down.dataset.field, 1);
            persist();
            render();
            setTimeout(() => openColumnsPopover(anchor), 0);
            return;
        }
        if (rn) {
            const field = rn.dataset.field;
            const actual = AttributeTable.allColumns().find(c => c.field === field);
            const nuevo = prompt(`Nombre de la columna para "${actual?.label || field}"`, actual?.label || field);
            if (nuevo === null) return;
            const limpio = nuevo.trim();
            if (!limpio) { showToast('El nombre no puede quedar vacío', 'warning'); return; }
            AttributeTable.setColumnLabel(field, limpio);
            persist();
            render();
            setTimeout(() => openColumnsPopover(anchor), 0);
        }
    });

    document.getElementById('at-cols-help')?.addEventListener('click', () => {
        showToast('Marcá para mostrar/ocultar. ↑ ↓ para mover. ✎ para renombrar.', 'info', 5000);
    });
}

// ─── Sincronización con el mapa ───────────────────────────────────────────────
/** Features de la selección, en orden de índice original. */
function selectedFeatures() {
    return AttributeTable.selectedIndices()
        .map(i => AttributeTable.features[i])
        .filter(Boolean);
}

/** Refresca el resaltado del mapa según la selección actual. */
function syncHighlight() {
    const map = hooks.getMap?.();
    if (!map) return;
    drawHighlight(map, selectedFeatures());
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
function bindEvents() {
    if (!panelEl) return;

    // ── Divisoria redimensionable ────────────────────────────────────────────
    // Se usa DELEGACIÓN (listener en el panel, no en el divisor): el divisor se
    // recrea en cada render(), así que un listener adjunto directamente se
    // perdería y el arrastre dejaría de funcionar.
    panelEl.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#at-splitter')) return;
        e.preventDefault();
        dragState = { startY: e.clientY, startH: panelEl.offsetHeight };
        panelEl.querySelector('#at-splitter')?.classList.add('at-dragging');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });

    // ── Cambio en el selector de filas por página ────────────────────────────
    panelEl.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-act="page-size"]');
        if (!sel) return;
        AttributeTable.setPageSize(Number(sel.value));
        hooks.onPageSizeChanged?.(AttributeTable.pageSize);
        render();
    });

    panelEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (btn) {
            handleAction(btn.dataset.act, btn);
            return;
        }
        // Cabecera ordenable
        const th = e.target.closest('#at-table thead th');
        if (th) {
            AttributeTable.toggleSort(th.dataset.field);
            hooks.onSortChanged?.(AttributeTable.sortField, AttributeTable.sortOrder);
            render();
            return;
        }
        // Fila: selección con modificadores
        const tr = e.target.closest('#at-table tbody tr[data-row]');
        if (tr) {
            const idx = Number(tr.dataset.row);
            AttributeTable.selectWithModifiers(idx, {
                shift: e.shiftKey,
                ctrl: e.ctrlKey || e.metaKey
            });
            hooks.onSelectionChanged?.(AttributeTable.selectedIndices());
            // Refrescar SOLO las clases de las filas, no todo el DOM.
            // Un render() completo destruye las filas y con ellas el evento en
            // curso: el segundo clic de un Ctrl+clic llegaba a un nodo muerto.
            refreshRowSelection();
            refreshHeadButtons();
            syncHighlight();
        }
    });

    // Enter en una fila la selecciona (accesibilidad por teclado).
    panelEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const tr = e.target.closest?.('#at-table tbody tr[data-row]');
        if (!tr) return;
        e.preventDefault();
        AttributeTable.selectWithModifiers(Number(tr.dataset.row), { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
        hooks.onSelectionChanged?.(AttributeTable.selectedIndices());
        render(); syncHighlight();
    });

    // Filtro: Enter aplica
    panelEl.addEventListener('keydown', (e) => {
        if (e.target?.id === 'at-filter' && e.key === 'Enter') {
            e.preventDefault();
            applyFilterFromInput();
        }
    });

    // Divisoria redimensionable
    const splitter = panelEl.querySelector('#at-splitter');
    splitter?.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dragState = { startY: e.clientY, startH: panelEl.offsetHeight };
        splitter.classList.add('at-dragging');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });
}

/**
 * Refresca solo las clases de selección de las filas existentes.
 * Mucho más barato que un render() completo, y —más importante— NO destruye
 * los nodos del DOM, así que un Ctrl+clic o Shift+clic encadenado funciona.
 */
function refreshRowSelection() {
    if (!panelEl) return;
    panelEl.querySelectorAll('#at-table tbody tr[data-row]').forEach(tr => {
        const sel = AttributeTable.isSelected(Number(tr.dataset.row));
        tr.classList.toggle('at-selected', sel);
        tr.setAttribute('aria-selected', String(sel));
    });
}

/** Habilita o deshabilita los botones de la cabecera según la selección. */
function refreshHeadButtons() {
    if (!panelEl) return;
    const hay = AttributeTable.selectionCount > 0;
    panelEl.querySelectorAll('[data-act="zoom-sel"], [data-act="clear-sel"]')
        .forEach(b => { b.disabled = !hay; });
    const info = panelEl.querySelector('#at-sel-info');
    if (info) info.textContent = hay ? `${AttributeTable.selectionCount} seleccionado(s)` : '';
}

/** Listeners a nivel documento: arrastre del divisor y cierre del popover. */
function bindDocumentEvents() {
    document.addEventListener('mousemove', (e) => {
        if (!dragState || !panelEl) return;
        const delta = dragState.startY - e.clientY;
        const h = Math.max(120, Math.min(dragState.startH + delta, window.innerHeight * 0.85));
        panelEl.style.height = h + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!dragState) return;
        dragState = null;
        panelEl?.querySelector('#at-splitter')?.classList.remove('at-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
    document.addEventListener('mousedown', (e) => {
        if (colsPopEl && !colsPopEl.contains(e.target) && !e.target.closest('[data-act="columns"]')) {
            closeColumnsPopover();
        }
    });
}

function applyFilterFromInput() {
    const inp = panelEl.querySelector('#at-filter');
    const err = panelEl.querySelector('#at-filter-error');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) {
        AttributeTable.clearFilter();
        err.hidden = true;
        hooks.onFilterChanged?.(null);
        render();
        return;
    }
    const res = AttributeTable.setFilter(text);
    if (!res.ok) {
        err.textContent = res.error;
        err.hidden = false;
        return;
    }
    err.hidden = true;
    hooks.onFilterChanged?.(AttributeTable.filter);
    render();
}

function handleAction(act, btn) {
    switch (act) {
        case 'min':
            panelEl.classList.toggle('at-minimized');
            panelEl.classList.remove('at-maximized');
            render();
            break;
        case 'max':
            panelEl.classList.toggle('at-maximized');
            panelEl.classList.remove('at-minimized');
            render();
            break;
        case 'close':
            close();
            break;
        case 'apply-filter':
            applyFilterFromInput();
            break;
        case 'clear-filter': {
            AttributeTable.clearFilter();
            hooks.onFilterChanged?.(null);
            render();
            break;
        }
        case 'columns':
            openColumnsPopover(btn);
            break;
        case 'first': AttributeTable.setPage(1); render(); break;
        case 'prev': AttributeTable.prevPage(); render(); break;
        case 'next': AttributeTable.nextPage(); render(); break;
        case 'last': AttributeTable.setPage(AttributeTable.totalPages); render(); break;
        case 'zoom-sel': {
            const map = hooks.getMap?.();
            if (map && zoomToSelection(map, selectedFeatures())) {
                showToast(`${AttributeTable.selectionCount} registro(s) encuadrado(s)`, 'info');
            }
            break;
        }
        case 'clear-sel':
            AttributeTable.clearSelection();
            hooks.onSelectionChanged?.([]);
            render(); syncHighlight();
            break;
        case 'export':
            exportCsv();
            break;
        case 'export-geojson':
            exportGeoJson();
            break;
        case 'export-json':
            exportJson();
            break;
        case 'back':
            if (AttributeTable.closeRelated()) {
                render(); syncHighlight();
                hooks.onRelatedClose?.();
            }
            break;
        case 'open-related': {
            const idx = Number(btn.dataset.row);
            const field = btn.dataset.field;
            hooks.onOpenRelated?.(idx, field);
            break;
        }
    }
}

/** Exporta las filas visibles (con filtro y orden) a CSV. */
export function exportCsv() {
    const cols = AttributeTable.visibleColumns();
    const rows = AttributeTable.visibleRows();
    if (!rows.length) { showToast('No hay registros para exportar', 'warning'); return; }
    const escCsv = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [cols.map(c => escCsv(c.label)).join(';')];
    for (const r of rows) {
        lines.push(cols.map(c => escCsv(r.feature?.properties?.[c.field])).join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${AttributeTable.layerId || 'tabla'}_atributos.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`${rows.length} registro(s) exportados a CSV`, 'success');
}

/** Exporta las filas visibles (con filtro y orden) a GeoJSON. */
export function exportGeoJson() {
    const rows = AttributeTable.visibleRows();
    if (!rows.length) {
        const projectGeo = typeof window !== 'undefined' && window.State?.get?.('geojson');
        if (projectGeo && Array.isArray(projectGeo.features) && projectGeo.features.length) {
            const blob = new Blob([JSON.stringify(projectGeo, null, 2)], { type: 'application/geo+json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'expediente_snc.geojson';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showToast(`${projectGeo.features.length} feature(s) exportados a GeoJSON`, 'success');
            return;
        }
        showToast('No hay registros para exportar', 'warning');
        return;
    }
    const features = rows.map(r => r.feature).filter(Boolean);
    const collection = {
        type: 'FeatureCollection',
        crs: {
            type: 'name',
            properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
        },
        features
    };
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${AttributeTable.layerId || 'tabla'}_atributos.geojson`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`${features.length} feature(s) exportados a GeoJSON`, 'success');
}

/** Exporta las filas visibles (con filtro y orden) a JSON. */
export function exportJson() {
    const cols = AttributeTable.visibleColumns();
    const rows = AttributeTable.visibleRows();
    if (!rows.length) {
        const projectGeo = typeof window !== 'undefined' && window.State?.get?.('geojson');
        if (projectGeo && Array.isArray(projectGeo.features) && projectGeo.features.length) {
            const data = projectGeo.features.map(f => f.properties || {});
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'expediente_snc.json';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showToast(`${data.length} registro(s) exportados a JSON`, 'success');
            return;
        }
        showToast('No hay registros para exportar', 'warning');
        return;
    }
    const data = rows.map(r => {
        const item = {};
        for (const c of cols) {
            item[c.field] = r.feature?.properties?.[c.field] ?? null;
        }
        return item;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${AttributeTable.layerId || 'tabla'}_atributos.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`${data.length} registro(s) exportados a JSON`, 'success');
}

// ─── Montaje y API pública ────────────────────────────────────────────────────
/**
 * Abre la tabla de atributos de una capa.
 *
 * @param {object} opts
 * @param {string} opts.layerId
 * @param {object[]} opts.features
 * @param {object} [opts.layerNode] Nodo del LayerManager (para el título y la config).
 * @param {object} [opts.tableConfig] Config guardada en la capa.
 * @param {object} [opts.columns] Columnas explícitas (relaciones, adjuntos).
 * @param {object} [opts.hooks] {getMap, onSelectionChanged, onSortChanged, onFilterChanged,
 *                               onColumnsChanged, onOpenRelated, onRelatedClose, getLayerNode}
 * @param {HTMLElement|string} [opts.host] Contenedor. Por defecto #view-map.
 */
export function open(opts) {
    hostEl = typeof opts.host === 'string' ? document.querySelector(opts.host) : (opts.host || document.getElementById('view-map'));
    if (!hostEl) { showToast('No se encontró el contenedor del mapa', 'error'); return false; }

    hooks = opts.hooks || {};
    mapLayerRef = opts.layerNode || null;

    AttributeTable.load(opts.layerId, opts.features, {
        columns: opts.columns,
        pageSize: opts.tableConfig?.pageSize ?? 50,
        sortField: opts.tableConfig?.sortField ?? null,
        sortOrder: opts.tableConfig?.sortOrder ?? null,
        selectedIds: opts.tableConfig?.selectedIds ?? [],
        hiddenColumns: opts.tableConfig?.hiddenColumns ?? [],
        columnOrder: opts.tableConfig?.columnOrder ?? []
    });

    // Crear el panel y registrar los listeners una sola vez.
    if (!panelEl) {
        panelEl = document.createElement('div');
        panelEl.id = 'at-panel';
        panelEl.setAttribute('role', 'region');
        panelEl.setAttribute('aria-label', 'Tabla de atributos');
        hostEl.appendChild(panelEl);
        bindEvents();
        bindDocumentEvents();
    }

    panelEl.hidden = false;
    panelEl.classList.remove('at-minimized', 'at-maximized');
    if (!unsubscribe) unsubscribe = AttributeTable.on('change', () => { /* el render es explícito */ });

    render();
    syncHighlight();
    return true;
}

/**
 * Pública el alto ocupado por el panel en la variable CSS --at-open-h.
 * La leyenda del mapa la usa para subir y no quedar tapada. Solo cuenta
 * cuando el panel está realmente desplegado (no minimizado ni oculto).
 */
function syncLegendOffset() {
    const root = document.documentElement;
    if (!root) return;
    const visible = panelEl && !panelEl.hidden;
    const h = visible ? panelEl.offsetHeight : 0;
    root.style.setProperty('--at-open-h', `${h}px`);
}

/** Cierra y destruye el panel. */
export function close() {
    if (panelEl) {
        const map = hooks.getMap?.();
        if (map) clearHighlight(map);
        panelEl.hidden = true;
    }
    closeColumnsPopover();
    syncLegendOffset();
}

/** ¿Está abierto el panel? */
export function isOpen() { return !!(panelEl && !panelEl.hidden); }

/** Carga los registros hijos en la tabla (relate 1:N). */
export function openRelated({ childLayerId, childFeatures, parentRowIndex, field, label }) {
    AttributeTable.openRelated({ childLayerId, childFeatures, parentRowIndex, field, label });
    render();
    syncHighlight();
}

/** Vuelve a la tabla principal. */
export function back() {
    const ok = AttributeTable.closeRelated();
    if (ok) { render(); syncHighlight(); }
    return ok;
}

export { AttributeTable };

if (typeof window !== 'undefined') {
    window.AttributeTableUI = { open, close, isOpen, render, openRelated, back, exportCsv, exportGeoJson, exportJson, drawHighlight, clearHighlight, zoomToSelection };
    window.exportGeoJson = exportGeoJson;
    window.exportJson = exportJson;
    window.exportCsv = exportCsv;
}

export default { open, close, isOpen, render, openRelated, back, exportCsv, exportGeoJson, exportJson, drawHighlight, clearHighlight, zoomToSelection };
