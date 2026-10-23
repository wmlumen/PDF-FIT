/**
 * LayerManager — modelo de contenido y jerarquía de capas.
 *
 * Implementa la especificación de "Tabla de Contenido" tipo ArcGIS:
 * capas independientes + capas de grupo anidadas, visibilidad en cascada,
 * rangos de escala, opacidad, alias, configuración de popups y de tabla.
 *
 * Este módulo es SOLO MODELO (sin DOM) para poder testearse en Node.
 * La capa de interfaz vive en js/layerPanel.js.
 *
 * Estructura del árbol: cada nodo es
 *   { id, kind:'layer'|'group', title, parentId, children:[id], ... }
 * Los nodos se guardan en un Map plano + una lista de raíces, lo que permite
 * anidamiento arbitrario sin recorrer objetos anidados.
 */

// ─── Escala: conversión de zoom Leaflet a denominador de escala ───────────────
// metros por píxel en el ecuador para el zoom 0 (Web Mercator, teselas de 256 px)
const EARTH_CIRCUMFERENCE_M = 40075016.686;
const TILE_SIZE = 256;
const DPI = 96;
const INCHES_PER_METER = 39.3701;

/**
 * Convierte un nivel de zoom de Leaflet al denominador de escala de mapa.
 * Es el mismo criterio que usan los SIG de escritorio (escala = distancia en
 * el mapa / distancia en pantalla), para que minScale/maxScale sean
 * comparables con lo que el usuario conoce de ArcGIS.
 *
 * @param {number} zoom Nivel de zoom de Leaflet.
 * @param {number} lat Latitud en grados (corrige la distorsión de Mercator).
 * @returns {number} Denominador de escala (p. ej. 50000 para 1:50.000).
 */
export function zoomToScale(zoom, lat = 0) {
    const metersPerPixel = (EARTH_CIRCUMFERENCE_M * Math.cos(lat * Math.PI / 180)) / (TILE_SIZE * Math.pow(2, zoom));
    // metros/píxel → metros/pulgada → escala 1:N
    return metersPerPixel * INCHES_PER_METER * DPI;
}

/**
 * Inverso: qué zoom corresponde a un denominador de escala.
 * @param {number} scale Denominador (1:N).
 * @param {number} lat
 * @returns {number} Zoom fraccionario.
 */
export function scaleToZoom(scale, lat = 0) {
    const metersPerPixel = scale / (INCHES_PER_METER * DPI);
    return Math.log2((EARTH_CIRCUMFERENCE_M * Math.cos(lat * Math.PI / 180)) / (TILE_SIZE * metersPerPixel));
}

/** Formatea una escala para mostrar: 50000 → "1:50.000". */
export function formatScale(scale) {
    if (scale === null || scale === undefined) return '—';
    return '1:' + Number(scale).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

// ─── Modos de la tabla de contenido (pestañas tipo ArcGIS) ────────────────────
export const CONTENT_MODES = [
    { id: 'drawing', label: 'Orden de dibujo', icon: 'fa-layer-group', hint: 'Jerarquía visual: lo de arriba se dibuja encima' },
    { id: 'source', label: 'Origen', icon: 'fa-folder-tree', hint: 'Agrupado por carpeta o servicio de origen' },
    { id: 'selection', label: 'Selección', icon: 'fa-arrow-pointer', hint: 'Qué capas son seleccionables con el puntero' },
    { id: 'editing', label: 'Edición', icon: 'fa-pen-to-square', hint: 'Qué capas admiten edición' },
    { id: 'snapping', label: 'Ajuste', icon: 'fa-magnet', hint: 'A qué capas se ajusta el cursor al digitalizar' },
    { id: 'labeling', label: 'Etiquetado', icon: 'fa-font', hint: 'Gestión de etiquetas de texto' }
];

// ─── Estado inicial de un nodo ────────────────────────────────────────────────
function makeNode(partial) {
    return {
        id: partial.id,
        kind: partial.kind || 'layer',
        title: partial.title || partial.id,
        originalTitle: partial.title || partial.id,
        parentId: partial.parentId ?? null,
        children: partial.children ? [...partial.children] : [],
        order: partial.order ?? 0,

        // Visibilidad
        visible: partial.visible !== false,
        visibleBeforeGroupHide: partial.visible !== false,

        // Origen (para el modo "List By Source")
        sourceType: partial.sourceType || 'local',   // local | geojson | servicio | grupo
        sourcePath: partial.sourcePath || '',

        // Capacidades por modo
        selectable: partial.selectable !== false,
        editable: partial.editable === true,
        snappable: partial.snappable !== false,
        labelEnabled: partial.labelEnabled === false,
        // Configuración de etiquetado por atributo (ver js/labels.js).
        // Se guarda normalizada para que el motor no tenga que validarla.
        labelConfig: normalizeLabelConfigSafe(partial.labelConfig),

        // Simbología / escala / opacidad
        style: partial.style || null,
        opacity: partial.opacity ?? 1,
        minScale: partial.minScale ?? null,   // escala máxima de acercamiento (denominador mayor)
        maxScale: partial.maxScale ?? null,   // escala máxima de alejamiento

        // Leyenda
        legend: {
            showInLegend: partial.legend?.showInLegend !== false,
            collapsed: partial.legend?.collapsed === true,
            hideInLegend: partial.legend?.hideInLegend === true
        },

        // Popups
        popupInfo: partial.popupInfo || null,

        // Tabla
        tableConfig: {
            pageSize: partial.tableConfig?.pageSize ?? 50,
            sortField: partial.tableConfig?.sortField ?? null,
            sortOrder: partial.tableConfig?.sortOrder ?? 'ASC',
            selectedIds: partial.tableConfig?.selectedIds ? [...partial.tableConfig.selectedIds] : [],
            hiddenColumns: partial.tableConfig?.hiddenColumns ? [...partial.tableConfig.hiddenColumns] : [],
            columnOrder: partial.tableConfig?.columnOrder ? [...partial.tableConfig.columnOrder] : null,
            columnAliases: partial.tableConfig?.columnAliases ? { ...partial.tableConfig.columnAliases } : null
        },

        // Metadatos informativos
        geometryType: partial.geometryType || null,
        featureCount: partial.featureCount ?? 0,
        properties: partial.properties ? [...partial.properties] : []
    };
}

/**
 * Normaliza la configuración de etiquetas sin acoplar este módulo a labels.js
 * (que arrastra lógica de presentación). Se duplican solo los valores por
 * defecto necesarios para que el nodo siempre tenga la forma esperada.
 */
function normalizeLabelConfigSafe(partial) {
    const p = partial || {};
    const num = (v, def, min, max) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return def;
        return Math.min(max ?? n, Math.max(min ?? n, n));
    };
    return {
        enabled: p.enabled === true,
        expression: typeof p.expression === 'string' ? p.expression : '',
        field: typeof p.field === 'string' ? p.field : '',
        fontSize: num(p.fontSize, 11, 6, 48),
        bold: p.bold === true,
        italic: p.italic === true,
        colorFromLayer: p.colorFromLayer !== false,
        color: typeof p.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : '#1f2937',
        haloEnabled: p.haloEnabled !== false,
        haloColor: typeof p.haloColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.haloColor) ? p.haloColor : '#ffffff',
        haloWidth: num(p.haloWidth, 2, 0, 8),
        boxEnabled: p.boxEnabled === true,
        boxColor: typeof p.boxColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.boxColor) ? p.boxColor : '#ffffff',
        boxOpacity: num(p.boxOpacity, 0.75, 0, 1),
        placement: ['auto','center','above','below','left','right'].includes(p.placement) ? p.placement : 'auto',
        dedupe: p.dedupe === true,
        minScale: p.minScale == null || p.minScale === '' ? null : num(p.minScale, null, 0),
        maxScale: p.maxScale == null || p.maxScale === '' ? null : num(p.maxScale, null, 0)
    };
}

// ─── Clase principal ──────────────────────────────────────────────────────────
class LayerManagerClass {
    constructor() {
        this.nodes = new Map();     // id -> nodo
        this.roots = [];            // ids de nivel superior, en orden
        this.mode = 'drawing';
        this.currentScale = null;
        this._listeners = new Map();
        this._seq = 0;
    }

    // ── Eventos ───────────────────────────────────────────────────────────────
    /** Suscribe un callback. Eventos: 'change', 'visibility', 'selection', 'rename', 'mode'. */
    on(event, cb) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(cb);
        return () => this._listeners.get(event)?.delete(cb);
    }

    _emit(event, payload) {
        for (const evt of [event, 'change']) {
            const set = this._listeners.get(evt);
            if (!set) continue;
            set.forEach(cb => {
                try { cb(payload, event); } catch (e) { /* el modelo no debe romper por un callback */ }
            });
        }
    }

    _nextId(prefix = 'node') {
        this._seq += 1;
        return `${prefix}_${this._seq}`;
    }

    // ── Registro ──────────────────────────────────────────────────────────────
    /**
     * Registra una capa. Si ya existe un nodo con ese id, lo actualiza
     * preservando la configuración del usuario (visibilidad, opacidad, alias).
     *
     * @param {object} def Definición de la capa.
     * @returns {object} nodo registrado.
     */
    registerLayer(def) {
        if (!def || !def.id) throw new Error('registerLayer requiere un id');
        const existing = this.nodes.get(def.id);
        if (existing) {
            // Preservar lo que el usuario configuró; refrescar lo descriptivo.
            existing.title = existing.title || def.title || def.id;
            existing.style = def.style || existing.style;
            existing.geometryType = def.geometryType || existing.geometryType;
            existing.featureCount = def.featureCount ?? existing.featureCount;
            existing.properties = def.properties?.length ? [...def.properties] : existing.properties;
            existing.sourcePath = def.sourcePath || existing.sourcePath;
            this._emit('change', { type: 'update', id: def.id });
            return existing;
        }
        const node = makeNode({ ...def, kind: 'layer', order: this.roots.length });
        this.nodes.set(node.id, node);
        if (node.parentId === null) {
            this.roots.push(node.id);
        } else {
            const parent = this.nodes.get(node.parentId);
            if (parent) parent.children.push(node.id);
            else this.roots.push(node.id);
        }
        this._emit('change', { type: 'register', id: node.id });
        return node;
    }

    /**
     * Registra una capa de grupo (carpeta). Soporta anidamiento vía parentId.
     * @param {object} def {id, title, parentId}
     */
    registerGroup(def) {
        if (!def || !def.id) throw new Error('registerGroup requiere un id');
        if (this.nodes.has(def.id)) return this.nodes.get(def.id);
        const node = makeNode({ ...def, kind: 'group', sourceType: 'grupo', order: this.roots.length });
        this.nodes.set(node.id, node);
        if (node.parentId === null) {
            this.roots.push(node.id);
        } else {
            const parent = this.nodes.get(node.parentId);
            if (parent) parent.children.push(node.id);
            else this.roots.push(node.id);
        }
        this._emit('change', { type: 'register-group', id: node.id });
        return node;
    }

    /** Elimina un nodo y, si es grupo, toda su descendencia. */
    remove(id) {
        const node = this.nodes.get(id);
        if (!node) return false;
        const toRemove = this._collectDescendants(id);
        toRemove.push(id);
        for (const rid of toRemove) {
            const n = this.nodes.get(rid);
            if (n && n.parentId !== null) {
                const p = this.nodes.get(n.parentId);
                if (p) p.children = p.children.filter(c => c !== rid);
            }
            this.nodes.delete(rid);
        }
        this.roots = this.roots.filter(r => !toRemove.includes(r));
        this._emit('change', { type: 'remove', id });
        return true;
    }

    _collectDescendants(id) {
        const out = [];
        const node = this.nodes.get(id);
        if (!node) return out;
        const stack = [...node.children];
        while (stack.length) {
            const cid = stack.pop();
            out.push(cid);
            const c = this.nodes.get(cid);
            if (c) stack.push(...c.children);
        }
        return out;
    }

    get(id) { return this.nodes.get(id) || null; }
    has(id) { return this.nodes.has(id); }
    all() { return Array.from(this.nodes.values()); }
    layers() { return this.all().filter(n => n.kind === 'layer'); }
    groups() { return this.all().filter(n => n.kind === 'group'); }

    // ── Visibilidad en cascada ────────────────────────────────────────────────
    /**
     * Cambia la visibilidad de un nodo.
     *
     * Cascada descendente: apagar un grupo oculta toda su descendencia, pero
     * recuerda el estado individual previo (`visibleBeforeGroupHide`) para
     * restaurarlo al volver a encender el grupo.
     *
     * Propagación ascendente: un grupo se considera visible si al menos una
     * de sus hijas lo está.
     *
     * @param {string} id
     * @param {boolean} visible
     */
    setVisible(id, visible) {
        const node = this.nodes.get(id);
        if (!node) return;
        if (node.kind === 'group') {
            if (!visible) {
                // Guardar el estado individual antes de apagar.
                for (const did of this._collectDescendants(id)) {
                    const d = this.nodes.get(did);
                    if (d && d.kind === 'layer') d.visibleBeforeGroupHide = d.visible;
                }
            }
            for (const did of this._collectDescendants(id)) {
                const d = this.nodes.get(did);
                if (!d) continue;
                d.visible = visible ? d.visibleBeforeGroupHide : false;
            }
            node.visible = visible;
        } else {
            node.visible = !!visible;
        }
        this._propagateUp(node.parentId);
        this._emit('visibility', { id, visible });
    }

    /** Marca visible/invisible sin cascada (uso interno y para capas sueltas). */
    _setVisibleRaw(id, visible) {
        const n = this.nodes.get(id);
        if (n) n.visible = !!visible;
    }

    /** Un grupo queda visible si alguna hija lo está. */
    _propagateUp(parentId) {
        if (parentId === null || parentId === undefined) return;
        const parent = this.nodes.get(parentId);
        if (!parent) return;
        const anyVisible = parent.children.some(cid => this.nodes.get(cid)?.visible);
        parent.visible = anyVisible;
        this._propagateUp(parent.parentId);
    }

    /** Alterna la visibilidad. */
    toggleVisible(id) {
        const n = this.nodes.get(id);
        if (!n) return;
        this.setVisible(id, !n.visible);
    }

    // ── Escala ────────────────────────────────────────────────────────────────
    /** Actualiza la escala actual del visor y recalcula qué capas están en rango. */
    setCurrentScale(scale) {
        this.currentScale = scale;
        this._emit('change', { type: 'scale', scale });
    }

    /**
     * ¿El nodo está dentro de su rango de escala visible?
     * minScale = denominador más grande (más alejado). maxScale = más chico (más cerca).
     * La capa se ve cuando maxScale <= currentScale <= minScale.
     */
    isInScaleRange(id) {
        const n = this.nodes.get(id);
        if (!n) return true;
        if (this.currentScale === null) return true;
        if (n.minScale !== null && this.currentScale > n.minScale) return false;
        if (n.maxScale !== null && this.currentScale < n.maxScale) return false;
        return true;
    }

    /**
     * Estado visual de un nodo para la UI.
     * @returns {'active'|'inactive'|'disabled'}
     *  active   = visible y dentro de rango
     *  inactive = apagado por el usuario
     *  disabled = encendido pero fuera de su rango de escala (atenuado)
     */
    visualState(id) {
        const n = this.nodes.get(id);
        if (!n) return 'inactive';
        if (!n.visible) return 'inactive';
        if (!this.isInScaleRange(id)) return 'disabled';
        return 'active';
    }

    setScaleRange(id, { minScale = null, maxScale = null } = {}) {
        const n = this.nodes.get(id);
        if (!n) return;
        n.minScale = minScale;
        n.maxScale = maxScale;
        this._emit('change', { type: 'scale-range', id });
    }

    // ── Opacidad ──────────────────────────────────────────────────────────────
    setOpacity(id, value) {
        const n = this.nodes.get(id);
        if (!n) return;
        n.opacity = Math.max(0, Math.min(1, Number(value)));
        this._emit('change', { type: 'opacity', id, value: n.opacity });
    }

    // ── Renombrar (doble clic) ────────────────────────────────────────────────
    /**
     * Renombra un nodo. El título original queda guardado para poder
     * restaurarlo. Un título vacío revierte al original.
     */
    rename(id, newTitle) {
        const n = this.nodes.get(id);
        if (!n) return false;
        const clean = String(newTitle ?? '').trim();
        n.title = clean || n.originalTitle;
        this._emit('rename', { id, title: n.title });
        return true;
    }

    resetTitle(id) {
        const n = this.nodes.get(id);
        if (!n) return false;
        n.title = n.originalTitle;
        this._emit('rename', { id, title: n.title });
        return true;
    }

    // ── Configuración de popups ───────────────────────────────────────────────
    setPopupConfig(id, popupInfo) {
        const n = this.nodes.get(id);
        if (!n) return;
        n.popupInfo = popupInfo;
        this._emit('change', { type: 'popup', id });
    }

    /** Alterna la visibilidad de un campo en el popup. */
    setPopupFieldVisible(id, fieldName, visible) {
        const n = this.nodes.get(id);
        if (!n || !n.popupInfo?.fields) return;
        const f = n.popupInfo.fields.find(x => x.fieldName === fieldName);
        if (f) f.visible = !!visible;
        this._emit('change', { type: 'popup-field', id, fieldName });
    }

    // ── Modos ─────────────────────────────────────────────────────────────────
    setMode(mode) {
        if (!CONTENT_MODES.some(m => m.id === mode)) return false;
        this.mode = mode;
        this._emit('mode', { mode });
        return true;
    }

    // ── Capacidades por modo ──────────────────────────────────────────────────
    setCapability(id, cap, value) {
        const n = this.nodes.get(id);
        if (!n) return;
        if (['selectable', 'editable', 'snappable', 'labelEnabled'].includes(cap)) {
            n[cap] = !!value;
            this._emit('change', { type: 'capability', id, cap });
        }
    }

    // ── Tabla de atributos ────────────────────────────────────────────────────
    /**
     * Actualiza la configuración de etiquetas de una capa.
     * @param {string} id
     * @param {object} patch Campos a cambiar (se normalizan)
     */
    setLabelConfig(id, patch) {
        const n = this.get(id);
        if (!n) return null;
        n.labelConfig = normalizeLabelConfigSafe({ ...(n.labelConfig || {}), ...(patch || {}) });
        n.labelEnabled = n.labelConfig.enabled;
        this._emit('change', { type: 'label-config', id });
        return n.labelConfig;
    }

    /** Capas con etiquetado activo y con fuente de texto elegida. */
    labelsActiveLayers() {
        return this.layers().filter(n =>
            n.labelConfig?.enabled && (n.labelConfig.field || n.labelConfig.expression));
    }

    setTableConfig(id, patch) {
        const n = this.nodes.get(id);
        if (!n) return;
        n.tableConfig = { ...n.tableConfig, ...patch };
        this._emit('change', { type: 'table-config', id });
    }

    /** Guarda los ids seleccionados de una capa. */
    setSelection(id, ids) {
        const n = this.nodes.get(id);
        if (!n) return;
        n.tableConfig.selectedIds = [...(ids || [])];
        this._emit('selection', { id, ids: n.tableConfig.selectedIds });
    }

    // ── Consultas para leyenda y tabla ────────────────────────────────────────
    /**
     * Capas que deben aparecer en la leyenda.
     * Criterios del spec: visibles, dentro de rango de escala, no ocultas
     * explícitamente, y sin mapas base ni capas auxiliares.
     */
    legendLayers() {
        return this.layers().filter(n =>
            n.visible &&
            this.isInScaleRange(n.id) &&
            !n.legend.hideInLegend &&
            n.legend.showInLegend &&
            n.sourceType !== 'basemap' &&
            n.sourceType !== 'auxiliar'
        );
    }

    /** Capas que deben dibujarse ahora mismo (visibles y en rango). */
    activeLayers() {
        return this.layers().filter(n => n.visible && this.isInScaleRange(n.id));
    }

    /** Capas seleccionables (modo selección). */
    selectableLayers() {
        return this.layers().filter(n => n.selectable);
    }

    /** Capas editables (modo edición). */
    editableLayers() {
        return this.layers().filter(n => n.editable);
    }

    /** Capas de ajuste (modo snapping). */
    snappableLayers() {
        return this.layers().filter(n => n.snappable);
    }

    /** Capas con etiquetado habilitado. */
    labeledLayers() {
        return this.layers().filter(n => n.labelEnabled);
    }

    /**
     * Agrupa por origen para el modo "List By Source".
     * @returns {Array<{source:string, layers:object[]}>}
     */
    bySource() {
        const map = new Map();
        for (const n of this.layers()) {
            const key = n.sourcePath || n.sourceType || 'sin origen';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(n);
        }
        return Array.from(map.entries()).map(([source, layers]) => ({ source, layers }));
    }

    // ── Orden de dibujo ───────────────────────────────────────────────────────
    /**
     * Reordena un nodo dentro de su padre.
     * @param {string} id
     * @param {number} newIndex
     */
    reorder(id, newIndex) {
        const n = this.nodes.get(id);
        if (!n) return false;
        const list = n.parentId === null
            ? this.roots
            : (this.nodes.get(n.parentId)?.children || []);
        const from = list.indexOf(id);
        if (from === -1) return false;
        list.splice(from, 1);
        list.splice(Math.max(0, Math.min(newIndex, list.length)), 0, id);
        this._emit('change', { type: 'reorder', id });
        return true;
    }

    /**
     * Recorre el árbol en orden de dibujo, respetando anidamiento.
     * @param {(node:object, depth:number)=>void} fn
     */
    walk(fn) {
        const visit = (id, depth) => {
            const n = this.nodes.get(id);
            if (!n) return;
            fn(n, depth);
            for (const c of n.children) visit(c, depth + 1);
        };
        for (const r of this.roots) visit(r, 0);
    }

    // ── Serialización (spec §5) ───────────────────────────────────────────────
    /** Exporta el estado completo, apto para persistir en el proyecto. */
    toJSON() {
        return {
            mode: this.mode,
            roots: [...this.roots],
            nodes: this.all().map(n => ({
                layerId: n.id,
                kind: n.kind,
                title: n.title,
                originalTitle: n.originalTitle,
                parentId: n.parentId,
                children: [...n.children],
                visible: n.visible,
                visibleBeforeGroupHide: n.visibleBeforeGroupHide,
                sourceType: n.sourceType,
                sourcePath: n.sourcePath,
                selectable: n.selectable,
                editable: n.editable,
                snappable: n.snappable,
                labelEnabled: n.labelEnabled,
                opacity: n.opacity,
                minScale: n.minScale,
                maxScale: n.maxScale,
                legend: { ...n.legend },
                popupInfo: n.popupInfo,
                tableConfig: { ...n.tableConfig }
            }))
        };
    }

    /** Restaura el estado desde toJSON(). No falla si faltan campos. */
    fromJSON(data) {
        if (!data || !Array.isArray(data.nodes)) return false;
        this.nodes.clear();
        this.roots = Array.isArray(data.roots) ? [...data.roots] : [];
        this.mode = data.mode || 'drawing';
        for (const raw of data.nodes) {
            const n = makeNode({
                id: raw.layerId || raw.id,
                kind: raw.kind,
                title: raw.title,
                parentId: raw.parentId,
                children: raw.children,
                sourceType: raw.sourceType,
                sourcePath: raw.sourcePath,
                opacity: raw.opacity,
                minScale: raw.minScale,
                maxScale: raw.maxScale,
                legend: raw.legend,
                popupInfo: raw.popupInfo,
                tableConfig: raw.tableConfig,
                selectable: raw.selectable,
                editable: raw.editable,
                snappable: raw.snappable,
                labelEnabled: raw.labelEnabled
            });
            n.originalTitle = raw.originalTitle || raw.title || n.id;
            n.visible = raw.visible !== false;
            n.visibleBeforeGroupHide = raw.visibleBeforeGroupHide !== false;
            this.nodes.set(n.id, n);
        }
        this._emit('change', { type: 'restore' });
        return true;
    }

    /** Limpia todo (para tests y cambio de proyecto). */
    reset() {
        this.nodes.clear();
        this.roots = [];
        this.mode = 'drawing';
        this.currentScale = null;
        this._seq = 0;
        this._emit('change', { type: 'reset' });
    }
}

export const LayerManager = new LayerManagerClass();
export default LayerManager;
