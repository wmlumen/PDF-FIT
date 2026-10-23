/**
 * LayerPanel — interfaz de la Tabla de Contenido tipo ArcGIS.
 *
 * Renderiza el árbol del LayerManager, ofrece las pestañas de modo,
 * el menú contextual por capa, el renombrado por doble clic, el control
 * de opacidad y el rango de escala.
 *
 * Solo consume la API pública de LayerManager: no duplica su estado.
 */

import LayerManager, { CONTENT_MODES, formatScale, zoomToScale } from './layerManager.js';
import * as LayerDialog from './layerDialog.js';
import { showToast } from './utils.js';
import { logger } from './logger.js';

const MODE_ICONS = Object.fromEntries(CONTENT_MODES.map(m => [m.id, m.icon]));

// Paleta de estilos por capa, para el parche de leyenda y el menú de simbología.
const LEGEND_SWATCH = {
    barrios: 'polygon',
    vias: 'line',
    hidro: 'line',
    vertedero: 'polygon',
    vertedero_integrado: 'polygon',
    casco_hist: 'polygon',
    centro: 'point',
    vuelo_casco: 'polygon',
    casco_historico: 'polygon',
    casco_hist: 'polygon',
    vertedero_500: 'polygon',
    vertedero_1000: 'polygon'
};

let panelRoot = null;
let menuEl = null;
let onToggleLayer = null;    // callback(name, visible) provisto por quien monta
let onZoomLayer = null;      // callback(name)
let unsubscribe = null;
const collapsedGroups = new Set();
let folderSequence = 0;
let draggedNodeId = null;
let sourceGroupingType = 'server'; // 'server' (por Servidor) | 'theme' (por Tema) | 'path' (por Origen/Ruta)

// ─── Utilidades ───────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

/**
 * Devuelve el SVG del parche de leyenda según el tipo de geometría.
 * Spec §2.1: punto (marcador), línea (continua/segmentada), polígono (relleno+borde).
 */
export function legendPatch(kind, style = {}) {
    const color = style.color || '#22d3ee';
    const fill = style.fillColor || color;
    const fillOpacity = style.fillOpacity ?? 0.3;
    const dash = style.dashArray ? `stroke-dasharray="${style.dashArray}"` : '';
    const w = style.weight || 2;

    if (kind === 'point') {
        return `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="5" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${w}"/>
        </svg>`;
    }
    if (kind === 'line') {
        return `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <line x1="1" y1="13" x2="15" y2="3" stroke="${color}" stroke-width="${w}" ${dash}/>
        </svg>`;
    }
    // polígono (por defecto)
    return `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${w}" ${dash}/>
    </svg>`;
}

/** Tipo de parche para una capa: explícito o inferido del nombre. */
export function patchKindFor(node) {
    if (node.geometryType === 'Point' || node.geometryType === 'MultiPoint') return 'point';
    if (node.geometryType === 'LineString' || node.geometryType === 'MultiLineString') return 'line';
    if (node.geometryType === 'Polygon' || node.geometryType === 'MultiPolygon') return 'polygon';
    return LEGEND_SWATCH[node.id] || 'polygon';
}

// ─── Render ───────────────────────────────────────────────────────────────────
/**
 * Construye el HTML del árbol. Se genera entero en cada render para mantenerlo
 * simple y consistente; el volumen (decenas de nodos) lo hace aceptable.
 */
function renderTree() {
    const mode = LayerManager.mode;
    const rows = [];

    const nodeRow = (n, depth) => {
        const state = LayerManager.visualState(n.id);
        const isGroup = n.kind === 'group';
        const hasChildren = isGroup && n.children.length > 0;
        const isCollapsed = collapsedGroups.has(n.id);

        // Estado del checkbox según modo.
        let check = '';
        let checkDisabled = false;
        if (mode === 'drawing' || mode === 'source') {
            check = n.visible ? 'checked' : '';
        } else if (mode === 'selection') {
            check = n.selectable ? 'checked' : '';
        } else if (mode === 'editing') {
            check = n.editable ? 'checked' : '';
        } else if (mode === 'snapping') {
            check = n.snappable ? 'checked' : '';
        } else if (mode === 'labeling') {
            check = n.labelEnabled ? 'checked' : '';
        }

        // En modos distintos de drawing, los grupos no aplican casilla.
        if (isGroup && mode !== 'drawing' && mode !== 'source') checkDisabled = true;

        const dimmed = state === 'disabled';
        const titleClass = state === 'inactive'
            ? 'text-slate-500'
            : (dimmed ? 'text-slate-500 italic' : 'text-slate-200');

        const patch = isGroup
            ? `<i class="fas fa-folder ${n.visible ? 'text-amber-400' : 'text-slate-600'} text-[10px]"></i>`
            : legendPatch(patchKindFor(n), n.style || {});

        const scaleNote = (n.minScale || n.maxScale)
            ? `<span class="text-[8px] text-slate-600 ml-1" title="Rango de escala visible">${formatScale(n.minScale)}–${formatScale(n.maxScale)}</span>`
            : '';
        const opacityNote = (!isGroup && n.opacity < 1)
            ? `<span class="text-[8px] text-slate-600 ml-1">${Math.round(n.opacity*100)}%</span>`
            : '';
        const featureCountNote = n.id === 'project-import' && Number.isFinite(n.featureCount)
            ? `<span class="text-[8px] text-slate-500 ml-1 shrink-0">${n.featureCount} geometrías</span>`
            : '';
        // Badge de proyección: reemplaza la lista de diagnóstico aparte.
        let crsBadge = '';
        if (!isGroup && window.MapEngine?.getPiribebuyCrsInfo) {
            const info = window.MapEngine.getPiribebuyCrsInfo(n.id);
            if (info) {
                const src = info.source || '?';
                const short = src.replace('EPSG:', '');
                if (info.corrected) {
                    crsBadge = `<span class="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0" title="Reproyectada automáticamente desde ${src}">${short}→4326</span>`;
                } else if (info.detected?.confidence >= 0.9) {
                    crsBadge = `<span class="text-[8px] text-slate-600 shrink-0" title="Proyección detectada: ${src}">${short}</span>`;
                } else {
                    crsBadge = `<span class="text-[8px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0" title="Proyección no identificada">?</span>`;
                }
            }
        }

        rows.push(`
        <div class="lp-row group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-800/60"
             data-id="${esc(n.id)}" data-kind="${n.kind}" data-state="${state}"
             draggable="true" aria-roledescription="Elemento arrastrable; soltar sobre una carpeta para mover, o en el área vacía para sacarlo"
             style="padding-left:${2 + depth * 12}px">
          <span class="lp-drag-handle" aria-hidden="true" title="Arrastrar para mover"><i class="fas fa-grip-vertical"></i></span>
          ${hasChildren ? `<button type="button" class="lp-group-toggle" data-id="${esc(n.id)}" aria-label="${isCollapsed ? 'Mostrar' : 'Ocultar'} subcapas de ${esc(n.title)}" aria-expanded="${!isCollapsed}" title="${isCollapsed ? 'Mostrar' : 'Ocultar'} subcapas"><span aria-hidden="true">${isCollapsed ? '+' : '−'}</span></button>` : (isGroup ? '<span class="lp-group-toggle-placeholder" aria-hidden="true"></span>' : '')}
          <input type="checkbox" class="lp-check accent-blue-500 shrink-0" data-id="${esc(n.id)}"
                 ${check} ${checkDisabled ? 'disabled' : ''} aria-label="Visibilidad de ${esc(n.title)}">
          <span class="lp-patch shrink-0 w-3.5 flex items-center justify-center">${patch}</span>
          <span class="lp-title ${titleClass} text-[10px] truncate min-w-0 flex-1 cursor-text"
                data-id="${esc(n.id)}" title="${esc(n.title)} — doble clic para renombrar">${esc(n.title)}</span>
          ${crsBadge}${scaleNote}${opacityNote}${featureCountNote}
          ${!isGroup ? `<button type="button" class="lp-zoom text-[9px] text-slate-600 hover:text-blue-400 shrink-0" data-id="${esc(n.id)}" title="Encuadrar capa"><i class="fas fa-crosshairs"></i></button>` : ''}
          <button type="button" class="lp-menu text-[9px] text-slate-600 hover:text-slate-200 shrink-0" data-id="${esc(n.id)}" title="Opciones de capa"><i class="fas fa-ellipsis-vertical"></i></button>
        </div>`);

        if (!isCollapsed) {
            for (const cid of n.children) {
                const c = LayerManager.get(cid);
                if (c) nodeRow(c, depth + 1);
            }
        }
    };

    if (mode === 'source') {
        // Selector de agrupación en el modo Origen/Temas
        rows.push(`
        <div class="flex items-center gap-1 mb-2 px-1 py-1 bg-slate-900/80 rounded border border-slate-800 text-[10px]">
            <span class="text-slate-400 font-medium mr-1 text-[9px]">Agrupar:</span>
            <button type="button" class="lp-group-by px-1.5 py-0.5 rounded text-[9px] ${sourceGroupingType === 'server' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}" data-group-by="server" title="Agrupar por Servidor Oficial (SNC, MAG, MADES, etc.)">
                <i class="fas fa-server mr-1"></i>Servidor
            </button>
            <button type="button" class="lp-group-by px-1.5 py-0.5 rounded text-[9px] ${sourceGroupingType === 'theme' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}" data-group-by="theme" title="Agrupar por Tema (Ambiental, Catastral, etc.)">
                <i class="fas fa-tags mr-1"></i>Tema
            </button>
            <button type="button" class="lp-group-by px-1.5 py-0.5 rounded text-[9px] ${sourceGroupingType === 'path' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}" data-group-by="path" title="Agrupar por Ruta o Carpeta">
                <i class="fas fa-folder-tree mr-1"></i>Ruta
            </button>
        </div>`);

        if (sourceGroupingType === 'server') {
            const serverGroups = LayerManager.byServer ? LayerManager.byServer() : [];
            for (const { server, layers } of serverGroups) {
                rows.push(`<div class="px-1 py-1 text-[9px] font-bold text-blue-400 uppercase tracking-wider truncate flex items-center gap-1 bg-slate-800/40 rounded mt-1.5" title="${esc(server)}">
                    <i class="fas fa-server text-blue-400 text-[9px]"></i><span>${esc(server)}</span>
                    <span class="text-[8px] text-slate-500 font-normal ml-auto">(${layers.length})</span>
                </div>`);
                for (const n of layers) nodeRow(n, 1);
            }
        } else if (sourceGroupingType === 'theme') {
            const themeGroups = LayerManager.byTheme ? LayerManager.byTheme() : [];
            for (const { theme, layers } of themeGroups) {
                rows.push(`<div class="px-1 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider truncate flex items-center gap-1 bg-slate-800/40 rounded mt-1.5" title="${esc(theme)}">
                    <i class="fas fa-tag text-emerald-400 text-[9px]"></i><span>${esc(theme)}</span>
                    <span class="text-[8px] text-slate-500 font-normal ml-auto">(${layers.length})</span>
                </div>`);
                for (const n of layers) nodeRow(n, 1);
            }
        } else {
            for (const { source, layers } of LayerManager.bySource()) {
                rows.push(`<div class="px-1 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate flex items-center gap-1 bg-slate-800/40 rounded mt-1.5" title="${esc(source)}">
                    <i class="fas fa-folder-tree text-indigo-400 text-[9px]"></i><span>${esc(source)}</span>
                    <span class="text-[8px] text-slate-500 font-normal ml-auto">(${layers.length})</span>
                </div>`);
                for (const n of layers) nodeRow(n, 1);
            }
        }
    } else {
        for (const rid of LayerManager.roots) {
            const n = LayerManager.get(rid);
            if (n) nodeRow(n, 0);
        }
    }

    if (!rows.length) {
        rows.push(`<p class="text-[9px] text-slate-500 px-1 py-2">Sin capas registradas.</p>`);
    }
    return rows.join('');
}

/** Pestañas de modo: solo icono, con tooltip. Ahorra alto y se lee más limpio. */
function renderModeTabs() {
    return CONTENT_MODES.map(m => `
        <button type="button" class="lp-mode-tab px-2 py-1 text-[11px] rounded border ${m.id === LayerManager.mode
            ? 'border-blue-500 bg-blue-500/15 text-blue-300'
            : 'border-slate-800 text-slate-400 hover:text-slate-200'}"
            data-mode="${m.id}" title="${esc(m.label)} — ${esc(m.hint)}"
            aria-label="${esc(m.label)}" aria-pressed="${m.id === LayerManager.mode}">
            <i class="fas ${m.icon}"></i>
        </button>`).join('') + `
        <button type="button" class="lp-create-folder" aria-label="Crear carpeta" title="Crear carpeta">
            <i class="fas fa-folder" aria-hidden="true"></i><span aria-hidden="true">+</span>
        </button>`;
}

/** Render completo del panel. */
export function render() {
    if (!panelRoot) return;
    const tree = panelRoot.querySelector('#lp-tree');
    const tabs = panelRoot.querySelector('#lp-modes');
    if (tabs) tabs.innerHTML = renderModeTabs();
    if (tree) tree.innerHTML = renderTree();
    const count = panelRoot.querySelector('#lp-count');
    if (count) {
        const active = LayerManager.activeLayers().length;
        const total = LayerManager.layers().length;
        count.textContent = `${active}/${total} activas`;
    }
}

// ─── Menú contextual ──────────────────────────────────────────────────────────
const MENU_SECTIONS = [
    { id: 'quick', title: 'Acciones rápidas', open: true },
    { id: 'organize', title: 'Organización' },
    { id: 'display', title: 'Visualización y edición' },
    { id: 'data', title: 'Datos y propiedades' },
    { id: 'folder', title: 'Carpeta' }
];
const MENU_ITEMS = [
    { id: 'zoom', section: 'quick', icon: 'fa-crosshairs', label: 'Encuadrar capa', tooltip: 'Centrar el mapa en la extensión completa de esta capa', when: n => n.kind === 'layer' },
    { id: 'move', section: 'quick', icon: 'fa-folder', label: 'Mover a carpeta…', tooltip: 'Mover esta capa a otra carpeta del proyecto', when: () => LayerManager.groups().length > 0 },
    { id: 'rename', section: 'organize', icon: 'fa-pen', label: 'Renombrar', tooltip: 'Cambiar el nombre con el que se identifica esta capa', when: () => true },
    { id: 'reset', section: 'organize', icon: 'fa-rotate-left', label: 'Restaurar nombre', tooltip: 'Restaurar el nombre original de la capa', when: n => n.title !== n.originalTitle },
    { id: 'opacity', section: 'display', icon: 'fa-droplet', label: 'Opacidad…', tooltip: 'Ajustar la transparencia visual de la capa en el mapa', when: n => n.kind === 'layer' },
    { id: 'scale', section: 'display', icon: 'fa-magnifying-glass', label: 'Rango de escala…', tooltip: 'Configurar a qué niveles de zoom es visible la capa', when: n => n.kind === 'layer' },
    { id: 'legend', section: 'display', icon: 'fa-list', label: 'En la leyenda', tooltip: 'Mostrar u ocultar la simbología de esta capa en la leyenda', toggle: n => n.legend?.showInLegend !== false, when: n => n.kind === 'layer' && !n.legend?.hideInLegend },
    { id: 'selectable', section: 'display', icon: 'fa-arrow-pointer', label: 'Seleccionable', tooltip: 'Habilitar o bloquear la selección interactiva de entidades', toggle: n => n.selectable, when: n => n.kind === 'layer' },
    { id: 'editable', section: 'display', icon: 'fa-pen-to-square', label: 'Editable', tooltip: 'Permitir o restringir la edición de geometrías de la capa', toggle: n => n.editable, when: n => n.kind === 'layer' },
    { id: 'table', section: 'data', icon: 'fa-table', label: 'Tabla de atributos', tooltip: 'Abrir la tabla de datos y registros asociados a esta capa', when: n => n.kind === 'layer' },
    { id: 'popup', section: 'data', icon: 'fa-window-restore', label: 'Ventana emergente…', tooltip: 'Configurar los datos que se muestran al hacer clic en el mapa', when: n => n.kind === 'layer' },
    { id: 'properties', section: 'data', icon: 'fa-sliders', label: 'Propiedades…', tooltip: 'Ver y configurar propiedades completas y simbología de la capa', when: () => true },
    { id: 'details', section: 'data', icon: 'fa-circle-info', label: 'Detalles', tooltip: 'Ver metadatos técnicos, CRS, geometrías y procedencia', when: () => true },
    { id: 'new-folder', section: 'folder', icon: 'fa-folder-plus', label: 'Crear subcarpeta', tooltip: 'Crear una subcarpeta dentro de este grupo', when: n => n.kind === 'group' },
    { id: 'delete-folder', section: 'folder', icon: 'fa-trash', label: 'Eliminar carpeta', tooltip: 'Eliminar esta carpeta y desagrupar sus capas', when: n => n.kind === 'group' }
];

function closeMenu() {
    if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
    menuEl = null;
}

/**
 * Abre el menú contextual de una capa.
 *
 * Posicionamiento: el menú se abre pegado al punto de invocación pero
 * **desplazado hacia afuera del elemento de origen**, de modo que no tape
 * ni la fila de la capa ni el centro del mapa. Si no cabe hacia la derecha
 * o hacia abajo, se voltea al lado opuesto. Siempre queda dentro del viewport.
 *
 * @param {string} id Id del nodo.
 * @param {number} x Coordenada X del punto de invocación (clientX).
 * @param {number} y Coordenada Y del punto de invocación (clientY).
 * @param {DOMRect} [anchorRect] Rectángulo del elemento que originó el menú.
 */
function openMenu(id, x, y, anchorRect = null) {
    closeMenu();
    const n = LayerManager.get(id);
    if (!n) return;

    menuEl = document.createElement('div');
    menuEl.id = 'lp-menu';
    // Sin clases Tailwind de geometría: padding/font viven en css/styles.css
    // para que la medición sea fiable (Tailwind CDN es JIT y llega tarde).
    menuEl.className = 'z-[3000]';
    menuEl.setAttribute('role', 'menu');
    menuEl.setAttribute('aria-label', `Opciones de ${n.title}`);

    const items = MENU_ITEMS.filter(i => i.when(n));
    const renderItem = item => {
        const toggle = item.toggle ? Boolean(item.toggle(n)) : null;
        const label = item.id === 'legend'
            ? (toggle ? 'Quitar de la leyenda' : 'Añadir a la leyenda')
            : item.label;
        const tooltip = item.tooltip || label;
        return `<button type="button" class="lp-menu-item ${toggle !== null ? 'lp-menu-toggle' : ''}" data-action="${item.id}" role="menuitem" title="${esc(tooltip)}" aria-label="${esc(label)}" ${toggle !== null ? `aria-pressed="${toggle}"` : ''}>
            <i class="fas ${item.icon}" aria-hidden="true"></i>
            <span class="lp-menu-label">${esc(label)}</span>
            ${toggle !== null ? `<span class="lp-menu-state" aria-hidden="true">${toggle ? '✓' : ''}</span>` : ''}
        </button>`;
    };
    menuEl.innerHTML = `
        <header class="lp-menu-header"><strong title="${esc(n.title)}">${esc(n.title)}</strong><span>${n.kind === 'group' ? 'Carpeta' : 'Capa'}</span></header>
        ${MENU_SECTIONS.map(section => {
            const sectionItems = items.filter(item => item.section === section.id);
            if (!sectionItems.length) return '';
            return `<details class="lp-menu-section" ${section.open ? 'open' : ''}>
              <summary>${esc(section.title)}<span aria-hidden="true">⌄</span></summary>
              <div class="lp-menu-section-items">${sectionItems.map(renderItem).join('')}</div>
            </details>`;
        }).join('')}`;

    // Se inserta primero (invisible) para poder medir su tamaño real.
    // Nota: offsetWidth/offsetHeight se leen DESPUÉS de que el navegador aplicó
    // el CSS de #lp-menu (min-width, nowrap). Sin el nowrap, un label largo
    // hacía wrap y la altura medida (176px) no coincidía con la renderizada
    // (311px), rompiendo el volteo.
    menuEl.style.visibility = 'hidden';
    menuEl.style.left = '-9999px';
    menuEl.style.top = '-9999px';
    document.body.appendChild(menuEl);

    const mw = menuEl.offsetWidth;
    const mh = menuEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 6;        // separación respecto del punto de invocación
    const MARGIN = 8;     // margen mínimo contra el borde de la ventana

    // Punto de partida.
    //  - Clic en el botón ⋮ (anchorRect): se abre DEBAJO del botón, alineado a
    //    su borde derecho. Así no tapa la fila de la capa ni el texto del panel.
    //  - Clic derecho (sin ancla): se abre en el cursor.
    let left, top;
    if (anchorRect) {
        left = anchorRect.right - mw;      // alineado al borde derecho del botón
        top = anchorRect.bottom + GAP;     // debajo del botón
        // Si no cabe debajo, se abre encima del botón.
        if (top + mh > vh - MARGIN) {
            const above = anchorRect.top - mh - GAP;
            top = above >= MARGIN ? above : Math.max(MARGIN, vh - mh - MARGIN);
        }
    } else {
        left = x + GAP;
        top = y;
        if (top + mh > vh - MARGIN) {
            const above = y - mh;
            top = above >= MARGIN ? above : Math.max(MARGIN, vh - mh - MARGIN);
        }
    }

    // Voltear horizontalmente si no cabe a la derecha.
    if (left + mw > vw - MARGIN) {
        const flipped = (anchorRect ? anchorRect.left : x) - mw - GAP;
        left = flipped >= MARGIN ? flipped : Math.max(MARGIN, vw - mw - MARGIN);
    }
    // Asegurar dentro del viewport (con las medidas ya definitivas).
    left = Math.max(MARGIN, Math.min(left, Math.max(MARGIN, vw - mw - MARGIN)));
    top = Math.max(MARGIN, Math.min(top, Math.max(MARGIN, vh - mh - MARGIN)));

    menuEl.style.left = Math.round(left) + 'px';
    menuEl.style.top = Math.round(top) + 'px';
    menuEl.style.visibility = '';

    menuEl.addEventListener('toggle', () => {
        requestAnimationFrame(() => {
            if (!menuEl) return;
            const rect = menuEl.getBoundingClientRect();
            const top = Math.max(MARGIN, Math.min(rect.top, vh - menuEl.offsetHeight - MARGIN));
            menuEl.style.top = `${Math.round(top)}px`;
        });
    }, true);

    menuEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.lp-menu-item');
        if (!btn) return;
        handleMenuAction(btn.dataset.action, id);
        closeMenu();
    });
    // Navegación por teclado dentro del menú.
    menuEl.addEventListener('keydown', (e) => {
        const items = [...menuEl.querySelectorAll('.lp-menu-item, .lp-menu-section > summary')];
        const idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
        if (e.key === 'Home')      { e.preventDefault(); items[0]?.focus(); }
        if (e.key === 'End')       { e.preventDefault(); items[items.length - 1]?.focus(); }
    });
    menuEl.querySelector('.lp-menu-item')?.focus();
}

function handleMenuAction(action, id) {
    const n = LayerManager.get(id);
    if (!n) return;

    switch (action) {
        case 'new-folder':
            createFolder(id);
            return;
        case 'move':
            openMoveFolderDialog(id);
            return;
        case 'delete-folder':
            LayerManager.removeGroup(id);
            collapsedGroups.delete(id);
            showToast('Carpeta eliminada; su contenido quedó en el nivel principal.', 'info');
            break;
        case 'zoom':
            onZoomLayer?.(id);
            break;
        case 'rename': {
            // Renombrado en línea, sin prompt nativo.
            startInlineRename(id);
            return;
        }
        case 'reset':
            LayerManager.resetTitle(id);
            showToast('Nombre restaurado', 'info');
            break;
        case 'legend':
            n.legend.showInLegend = !n.legend.showInLegend;
            LayerManager._emit('change', { type: 'legend', id });
            break;
        case 'selectable':
            LayerManager.setCapability(id, 'selectable', !n.selectable);
            break;
        case 'editable':
            LayerManager.setCapability(id, 'editable', !n.editable);
            break;
        case 'opacity':
        case 'scale':
        case 'popup':
        case 'properties':
            // Todos abren el panel de propiedades, en la pestaña que corresponde.
            openPropertiesPanel(id, { tab: action });
            return;
        case 'table':
            window.dispatchEvent(new CustomEvent('snc:open-attribute-table', { detail: { layerId: id } }));
            break;
        case 'details':
            openPropertiesPanel(id, { tab: 'detalles' });
            return;
    }
    render();
}

function createFolder(parentId = null) {
    let id;
    do {
        folderSequence += 1;
        id = `folder_${Date.now()}_${folderSequence}`;
    } while (LayerManager.has(id));
    LayerManager.registerGroup({ id, title: 'Nueva carpeta', parentId });
    if (parentId) collapsedGroups.delete(parentId);
    render();
    startInlineRename(id);
}

function openMoveFolderDialog(id) {
    const node = LayerManager.get(id);
    if (!node) return;
    document.getElementById('lp-move-dialog')?.remove();

    const excluded = new Set([id, ...(node.kind === 'group' ? LayerManager._collectDescendants(id) : [])]);
    const folders = LayerManager.groups().filter(group => !excluded.has(group.id));
    const dialog = document.createElement('div');
    dialog.id = 'lp-move-dialog';
    dialog.className = 'fixed inset-0 z-[3100] flex items-center justify-center p-4';
    dialog.innerHTML = `
      <div class="lp-move-backdrop" data-close-move></div>
      <section class="lp-move-card" role="dialog" aria-modal="true" aria-labelledby="lp-move-title">
        <h2 id="lp-move-title">Mover “${esc(node.title)}”</h2>
        <label for="lp-move-target">Carpeta destino</label>
        <select id="lp-move-target">
          <option value="">Nivel principal</option>
          ${folders.map(folder => `<option value="${esc(folder.id)}" ${folder.id === node.parentId ? 'selected' : ''}>${esc(folder.title)}</option>`).join('')}
        </select>
        <div class="lp-move-actions">
          <button type="button" data-close-move>Cancelar</button>
          <button type="button" data-confirm-move>Guardar ubicación</button>
        </div>
      </section>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#lp-move-target')?.focus();
    dialog.addEventListener('click', event => {
        if (event.target.closest('[data-close-move]')) {
            dialog.remove();
            return;
        }
        if (!event.target.closest('[data-confirm-move]')) return;
        const targetId = dialog.querySelector('#lp-move-target')?.value || null;
        if (!LayerManager.move(id, targetId)) {
            showToast('No se pudo mover el elemento a esa carpeta.', 'warning');
            return;
        }
        dialog.remove();
        collapsedGroups.delete(targetId);
        render();
        showToast('Elemento movido.', 'success');
    });
    dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') dialog.remove();
    });
}

/**
 * Abre el panel de propiedades de la capa.
 * @param {string} id
 * @param {{tab?:string}} [opts] Pestaña inicial ('opacity'|'scale'|'popup'|'detalles').
 */
function openPropertiesPanel(id, opts = {}) {
    const n = LayerManager.get(id);
    if (!n) return;
    const map = window.MapEngine?.getMap?.();
    const lat = map?.getCenter()?.lat ?? 0;
    const info = window.MapEngine?.getPiribebuyCrsInfo?.(id);

    LayerDialog.openLayerDialog(n, {
        currentScale: map ? zoomToScale(map.getZoom(), lat) : null,
        properties: info?.properties?.length ? info.properties : (n.properties || []),
        geometryType: n.geometryType || info?.geometryType || null,
        onStyleChange: (lid, style) => {
            window.MapEngine?.setPiribebuyLayerStyle?.(lid, style);
        },
        onVisibilityChange: (lid, visible) => {
            window.MapEngine?.togglePiribebuyLayer?.(lid, visible);
        },
        // Etiquetado por atributo: dibuja el valor de la columna elegida
        // sobre cada geometría, con el color de la capa.
        onLabelChange: (lid, config) => {
            if (window.MapEngine?.setLayerLabelConfig) {
                window.MapEngine.setLayerLabelConfig(lid, config);
            }
        },
        // Referencia catastral SNC: capa visual opcional + capa remota.
        onSNCRefChange: (lid, config) => {
            if (lid === 'snc-ref' && window.MapEngine?.setSNCRefConfig) {
                window.MapEngine.setSNCRefConfig(config);
            }
        },
        onApplied: (lid, changed) => {
            const t = LayerManager.get(lid)?.title || lid;
            showToast(`"${t}" actualizada${changed.length ? ': ' + changed.join(', ') : ''}`, 'success');
            render();
        }
    });

    // Saltar a la pestaña pedida.
    const mapTab = { opacity: 'general', scale: 'escala', popup: 'popup', detalles: 'detalles' };
    const want = mapTab[opts.tab];
    if (want) {
        setTimeout(() => document.querySelector(`.lp-dlg-tab[data-tab="${want}"]`)?.click(), 30);
    }
}

/**
 * Renombrado en línea dentro del árbol (reemplaza el prompt nativo).
 * @param {string} id
 */
function startInlineRename(id) {
    const title = panelRoot?.querySelector(`.lp-title[data-id="${CSS.escape(id)}"]`);
    if (!title) return;
    const n = LayerManager.get(id);
    if (!n) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = n.title;
    input.className = 'lp-rename-input';
    title.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const commit = () => {
        if (done) return;
        done = true;
        LayerManager.rename(id, input.value);
        render();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); done = true; render(); }
    });
}

function showDetailsDialog(id) { openPropertiesPanel(id, { tab: 'detalles' }); }
function showPopupConfigDialog(id) { openPropertiesPanel(id, { tab: 'popup' }); }

// ─── Interacciones del árbol ──────────────────────────────────────────────────
function bindEvents() {
    if (!panelRoot) return;

    const tree = panelRoot.querySelector('#lp-tree');
    tree?.addEventListener('dragstart', (event) => {
        const row = event.target.closest('.lp-row');
        if (!row || event.target.closest('button, input')) {
            event.preventDefault();
            return;
        }
        draggedNodeId = row.dataset.id;
        row.classList.add('lp-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedNodeId);
    });
    tree?.addEventListener('dragend', () => {
        draggedNodeId = null;
        tree.querySelectorAll('.lp-drop-target, .lp-drop-root').forEach(el => el.classList.remove('lp-drop-target', 'lp-drop-root'));
        tree.querySelectorAll('.lp-dragging').forEach(el => el.classList.remove('lp-dragging'));
    });
    tree?.addEventListener('dragover', (event) => {
        const targetRow = event.target.closest('.lp-row');
        const sourceId = draggedNodeId || event.dataTransfer?.getData('text/plain');
        if (!sourceId) return;
        if (targetRow?.dataset.kind === 'group' && targetRow.dataset.id !== sourceId) {
            const source = LayerManager.get(sourceId);
            const isDescendant = source?.kind === 'group' && (() => {
                let parentId = targetRow.dataset.id;
                while (parentId) {
                    if (parentId === sourceId) return true;
                    parentId = LayerManager.get(parentId)?.parentId || null;
                }
                return false;
            })();
            if (!isDescendant) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                tree.querySelectorAll('.lp-drop-target, .lp-drop-root').forEach(el => el.classList.remove('lp-drop-target', 'lp-drop-root'));
                targetRow.classList.add('lp-drop-target');
            }
            return;
        }
        if (!targetRow && event.target === tree) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            tree.querySelectorAll('.lp-drop-target, .lp-drop-root').forEach(el => el.classList.remove('lp-drop-target', 'lp-drop-root'));
            tree.classList.add('lp-drop-root');
        }
    });
    tree?.addEventListener('dragleave', (event) => {
        if (!tree.contains(event.relatedTarget)) {
            tree.classList.remove('lp-drop-root');
            tree.querySelectorAll('.lp-drop-target').forEach(el => el.classList.remove('lp-drop-target'));
        }
    });
    tree?.addEventListener('drop', (event) => {
        const sourceId = draggedNodeId || event.dataTransfer?.getData('text/plain');
        if (!sourceId) return;
        const targetRow = event.target.closest('.lp-row');
        const targetId = targetRow?.dataset.kind === 'group' ? targetRow.dataset.id : null;
        if (!targetRow && event.target !== tree) return;
        event.preventDefault();
        const source = LayerManager.get(sourceId);
        if (!source) return;
        if (source.parentId === targetId) {
            showToast('El elemento ya está en esa ubicación.', 'info');
        } else if (!LayerManager.move(sourceId, targetId)) {
            showToast('No se puede mover una carpeta dentro de sí misma o de una subcarpeta.', 'warning');
        } else {
            if (targetId) collapsedGroups.delete(targetId);
            showToast(targetId ? `Movido a “${LayerManager.get(targetId)?.title}”.` : 'Movido al nivel principal.', 'success');
        }
        tree.classList.remove('lp-drop-root');
        tree.querySelectorAll('.lp-drop-target').forEach(el => el.classList.remove('lp-drop-target'));
        render();
    });

    panelRoot.addEventListener('click', (e) => {
        const toggle = e.target.closest('.lp-group-toggle');
        if (!toggle) return;
        const id = toggle.dataset.id;
        if (collapsedGroups.has(id)) collapsedGroups.delete(id);
        else collapsedGroups.add(id);
        render();
        panelRoot.querySelector(`.lp-group-toggle[data-id="${CSS.escape(id)}"]`)?.focus();
    });

    // Casillas: visibilidad o capacidades según el modo.
    panelRoot.addEventListener('change', (e) => {
        const chk = e.target.closest('.lp-check');
        if (!chk) return;
        const id = chk.dataset.id;
        const mode = LayerManager.mode;
        if (mode === 'drawing' || mode === 'source') {
            LayerManager.setVisible(id, chk.checked);
            onToggleLayer?.(id, LayerManager.get(id)?.visible);
        } else if (mode === 'selection') {
            LayerManager.setCapability(id, 'selectable', chk.checked);
        } else if (mode === 'editing') {
            LayerManager.setCapability(id, 'editable', chk.checked);
        } else if (mode === 'snapping') {
            LayerManager.setCapability(id, 'snappable', chk.checked);
        } else if (mode === 'labeling') {
            LayerManager.setCapability(id, 'labelEnabled', chk.checked);
        }
        render();
    });

    // Pestañas de modo.
    panelRoot.addEventListener('click', (e) => {
        const create = e.target.closest('.lp-create-folder');
        if (create) {
            createFolder();
            return;
        }
        const tab = e.target.closest('.lp-mode-tab');
        if (tab) {
            LayerManager.setMode(tab.dataset.mode);
            render();
            return;
        }
        const groupByBtn = e.target.closest('.lp-group-by');
        if (groupByBtn) {
            sourceGroupingType = groupByBtn.dataset.groupBy;
            render();
            return;
        }
        // Botón de encuadre.
        const zoom = e.target.closest('.lp-zoom');
        if (zoom) {
            e.stopPropagation();
            onZoomLayer?.(zoom.dataset.id);
            return;
        }
        // Menú contextual.
        const menu = e.target.closest('.lp-menu');
        if (menu) {
            e.stopPropagation();
            // Se pasa el rectángulo del botón: el menú se abre a su costado,
            // sin tapar la fila de la capa.
            openMenu(menu.dataset.id, 0, 0, menu.getBoundingClientRect());
            return;
        }
    });

    // Doble clic para renombrar (spec §1.1).
    panelRoot.addEventListener('dblclick', (e) => {
        const title = e.target.closest('.lp-title');
        if (!title) return;
        const id = title.dataset.id;
        const n = LayerManager.get(id);
        if (!n) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = n.title;
        input.className = 'lp-rename-input w-full rounded border border-blue-500 bg-slate-900 px-1 py-0 text-[10px] text-slate-100 outline-none';
        title.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
            const v = input.value;
            LayerManager.rename(id, v);
            showToast(`Renombrado: ${LayerManager.get(id).title}`, 'info');
            render();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
            if (ev.key === 'Escape') { ev.preventDefault(); input.removeEventListener('blur', commit); render(); }
        });
    });

    // Cerrar el menú al hacer clic fuera o con Escape.
    document.addEventListener('click', (e) => {
        if (menuEl && !menuEl.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Menú contextual con clic derecho sobre la fila.
    panelRoot.addEventListener('contextmenu', (e) => {
        const row = e.target.closest('.lp-row');
        if (!row) return;
        e.preventDefault();
        openMenu(row.dataset.id, e.clientX, e.clientY);
    });
}

// ─── Montaje ──────────────────────────────────────────────────────────────────
/**
 * Monta el panel en un contenedor.
 *
 * @param {HTMLElement|string} target Elemento o selector donde insertar el panel.
 * @param {{onToggleLayer?:(id:string,visible:boolean)=>void, onZoomLayer?:(id:string)=>void}} [hooks]
 */
export function mount(target, hooks = {}) {
    panelRoot = typeof target === 'string' ? document.querySelector(target) : target;
    if (!panelRoot) { logger.warn('LayerPanel: contenedor no encontrado'); return false; }
    onToggleLayer = hooks.onToggleLayer || null;
    onZoomLayer = hooks.onZoomLayer || null;

    panelRoot.innerHTML = `
        <div class="flex items-center justify-between mb-1">
            <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <i class="fas fa-layer-group mr-1"></i>Capas
            </span>
            <span id="lp-count" class="text-[9px] text-slate-500 font-mono"></span>
        </div>
        <div id="lp-modes" class="flex flex-wrap gap-1 mb-1"></div>
        <div id="lp-tree" class="space-y-0.5 max-h-56 overflow-y-auto rounded border border-slate-800 bg-slate-950/40 p-1"></div>`;

    bindEvents();
    unsubscribe = LayerManager.on('change', () => render());
    render();
    return true;
}

export function unmount() {
    unsubscribe?.();
    unsubscribe = null;
    closeMenu();
    if (panelRoot) panelRoot.innerHTML = '';
    panelRoot = null;
}

/**
 * Sincroniza la escala actual del visor con el LayerManager, para que los
 * rangos de escala se evalúen. Se llama desde el evento zoom del mapa.
 */
export function syncScaleFromMap(map) {
    if (!map) return;
    const zoom = map.getZoom();
    const lat = map.getCenter()?.lat ?? 0;
    LayerManager.setCurrentScale(zoomToScale(zoom, lat));
}

export { LayerManager };
export default { mount, unmount, render, syncScaleFromMap, legendPatch, patchKindFor };
