/**
 * AttributeTable — modelo de la tabla de atributos (spec §3).
 *
 * Implementa la manipulación de datos: ordenamiento de 3 estados, paginación,
 * visibilidad y orden de columnas, filtros por expresión, y el cálculo de la
 * extensión espacial de la selección.
 *
 * Es SOLO MODELO (sin DOM) para poder testearse en Node.
 * La interfaz vive en js/attributeTableUI.js.
 *
 * Convención: las filas son los `features` del GeoJSON. Cada fila se identifica
 * por su índice original en el FeatureCollection, para que la selección
 * sobreviva al ordenamiento y al filtrado.
 */

// ─── Ordenamiento de 3 estados (spec §3.2) ────────────────────────────────────
export const SORT_CYCLE = [null, 'ASC', 'DESC'];

/**
 * Siguiente estado del orden al hacer clic en una cabecera.
 * Ciclo: original → ASC → DESC → original.
 * @param {string|null} current
 * @returns {string|null}
 */
export function nextSortOrder(current) {
    const i = SORT_CYCLE.indexOf(current ?? null);
    return SORT_CYCLE[(i + 1) % SORT_CYCLE.length];
}

/**
 * Compara dos valores para el ordenamiento. Detecta números dentro de strings
 * ("10" vs "9"), fechas ISO y texto con acentos.
 */
export function compareValues(a, b) {
    const na = a === null || a === undefined || a === '';
    const nb = b === null || b === undefined || b === '';
    if (na && nb) return 0;
    if (na) return 1;      // los vacíos van al final
    if (nb) return -1;

    // Numérico (incluye strings numéricos)
    const fa = Number(a), fb = Number(b);
    if (Number.isFinite(fa) && Number.isFinite(fb) && String(a).trim() !== '' && String(b).trim() !== '') {
        return fa - fb;
    }
    // Fecha ISO
    const da = Date.parse(a), db = Date.parse(b);
    if (Number.isFinite(da) && Number.isFinite(db) && /\d{4}-\d{2}-\d{2}/.test(String(a))) {
        return da - db;
    }
    return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

// ─── Filtros por expresión (DefinitionQuery, spec §3.3) ───────────────────────
export const FILTER_OPERATORS = [
    { id: '=',        label: 'es igual a',              needsValue: true },
    { id: '!=',       label: 'es distinto de',          needsValue: true },
    { id: '>',        label: 'es mayor que',            needsValue: true },
    { id: '>=',       label: 'es mayor o igual que',    needsValue: true },
    { id: '<',        label: 'es menor que',            needsValue: true },
    { id: '<=',       label: 'es menor o igual que',    needsValue: true },
    { id: 'contains', label: 'contiene',                needsValue: true },
    { id: 'starts',   label: 'empieza con',             needsValue: true },
    { id: 'ends',     label: 'termina con',             needsValue: true },
    { id: 'empty',    label: 'está vacío',              needsValue: false },
    { id: 'notempty', label: 'no está vacío',           needsValue: false }
];

/**
 * Evalúa una condición sobre un valor.
 * @param {*} value
 * @param {string} op
 * @param {string} [target]
 * @returns {boolean}
 */
export function evaluateCondition(value, op, target = '') {
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    switch (op) {
        case 'empty':    return isEmpty;
        case 'notempty': return !isEmpty;
        case 'contains': return String(value ?? '').toLowerCase().includes(String(target).toLowerCase());
        case 'starts':   return String(value ?? '').toLowerCase().startsWith(String(target).toLowerCase());
        case 'ends':     return String(value ?? '').toLowerCase().endsWith(String(target).toLowerCase());
        case '=': case '!=': case '>': case '>=': case '<': case '<=': {
            if (isEmpty && target !== '') {
                // Comparar un vacío contra un número: no aplica.
                if (['>','>=','<','<='].includes(op)) return false;
            }
            const nv = Number(value), nt = Number(target);
            const bothNum = Number.isFinite(nv) && Number.isFinite(nt) &&
                            String(value).trim() !== '' && String(target).trim() !== '';
            let cmp;
            if (bothNum) cmp = nv === nt ? 0 : (nv < nt ? -1 : 1);
            else cmp = String(value ?? '').toLowerCase() === String(target ?? '').toLowerCase() ? 0 : 1;
            switch (op) {
                case '=':  return bothNum ? nv === nt : String(value ?? '').toLowerCase() === String(target ?? '').toLowerCase();
                case '!=': return bothNum ? nv !== nt : String(value ?? '').toLowerCase() !== String(target ?? '').toLowerCase();
                case '>':  return cmp > 0 && bothNum;
                case '>=': return cmp >= 0 && bothNum;
                case '<':  return cmp < 0 && bothNum;
                case '<=': return cmp <= 0 && bothNum;
            }
            return false;
        }
        default: return true;
    }
}

/**
 * Parsea una expresión de filtro escrita a mano.
 * Formato: "CAMPO operador valor", p.ej. `AREA > 1000`, `NOMBRE contiene río`,
 * `TIPO = URBANO`. También acepta el operador con palabras en español.
 *
 * @param {string} text
 * @returns {{field:string, op:string, value:string, error:string|null}}
 */
export function parseFilterExpression(text) {
    const raw = String(text ?? '').trim();
    if (!raw) return { field: '', op: '', value: '', error: null };

    // Se prueban los operadores de más largo a más corto para no cortar ">=" en ">".
    const ops = [
        { token: '>=', id: '>=' }, { token: '<=', id: '<=' }, { token: '!=', id: '!=' },
        { token: '=', id: '=' }, { token: '>', id: '>' }, { token: '<', id: '<' },
        { token: 'contiene', id: 'contains' }, { token: 'empieza con', id: 'starts' },
        { token: 'termina con', id: 'ends' }, { token: 'es igual a', id: '=' },
        { token: 'es distinto de', id: '!=' }, { token: 'es mayor que', id: '>' },
        { token: 'es menor que', id: '<' }, { token: 'está vacío', id: 'empty' },
        { token: 'esta vacio', id: 'empty' }, { token: 'no está vacío', id: 'notempty' }
    ];

    for (const { token, id } of ops) {
        const idx = raw.toLowerCase().indexOf(token.toLowerCase());
        if (idx > 0) {
            const field = raw.slice(0, idx).trim().replace(/^["']|["']$/g, '');
            const value = raw.slice(idx + token.length).trim().replace(/^["']|["']$/g, '');
            if (!field) return { field: '', op: '', value: '', error: 'Falta el nombre del campo' };
            if (!value && ['=','!=','>','>=','<','<=','contains','starts','ends'].includes(id)) {
                return { field, op: id, value: '', error: `El operador "${token}" requiere un valor` };
            }
            return { field, op: id, value, error: null };
        }
    }
    // Sin operador: se interpreta como "el campo no está vacío".
    const field = raw.replace(/^["']|["']$/g, '');
    return { field, op: 'notempty', value: '', error: null };
}

/** Convierte una condición en texto legible: `AREA > 1000`. */
export function formatCondition(cond) {
    if (!cond || !cond.field) return '';
    const op = FILTER_OPERATORS.find(o => o.id === cond.op);
    const label = op ? op.label : cond.op;
    if (!op || !op.needsValue) return `${cond.field} ${label}`;
    return `${cond.field} ${label} ${cond.value}`;
}

// ─── Clase principal ──────────────────────────────────────────────────────────
class AttributeTableClass {
    constructor() {
        this.layerId = null;
        this.features = [];
        this.columns = [];            // [{field, label, visible, related, isAttachment}]
        this.sortField = null;
        this.sortOrder = null;        // null | 'ASC' | 'DESC'
        this.page = 1;
        this.pageSize = 50;
        this.selected = new Set();    // índices originales
        this.filter = null;           // {field, op, value}
        this.related = null;          // {parentLayerId, parentRowIndex, field}
        this.history = [];            // pila de navegación para Relates
        this._listeners = new Map();
    }

    // ── Eventos ───────────────────────────────────────────────────────────────
    on(event, cb) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(cb);
        return () => this._listeners.get(event)?.delete(cb);
    }
    _emit(event, payload) {
        for (const evt of [event, 'change']) {
            const set = this._listeners.get(evt);
            if (!set) continue;
            set.forEach(cb => { try { cb(payload, event); } catch { /* no romper el modelo */ } });
        }
    }

    // ── Carga ─────────────────────────────────────────────────────────────────
    /**
     * Carga las features de una capa y deriva las columnas de sus atributos.
     *
     * @param {string} layerId
     * @param {object[]} features
     * @param {{columns?:Array, pageSize?:number, sortField?:string, sortOrder?:string,
     *          selectedIds?:number[], hiddenColumns?:string[], columnOrder?:string[],
     *          keepHistory?:boolean}} [config]
     *   keepHistory: true conserva la pila de navegación (lo usa openRelated).
     */
    load(layerId, features, config = {}) {
        this.layerId = layerId;
        this.features = Array.isArray(features) ? features : [];
        this.page = 1;
        this.filter = null;
        // El historial de navegación solo se limpia en una carga de nivel raíz.
        if (!config.keepHistory) {
            this.history = [];
            this.related = null;
        }

        // Columnas: de la config si viene, si no se derivan de las features.
        if (config.columns?.length) {
            this.columns = config.columns.map(c => ({
                field: c.field, label: c.label || c.field,
                visible: c.visible !== false,
                related: !!c.related, isAttachment: !!c.isAttachment
            }));
        } else {
            this.columns = deriveColumns(this.features);
        }

        // Orden y visibilidad de columnas desde la config de la capa.
        if (config.columnOrder?.length) {
            const byField = new Map(this.columns.map(c => [c.field, c]));
            const ordered = config.columnOrder.map(f => byField.get(f)).filter(Boolean);
            const rest = this.columns.filter(c => !config.columnOrder.includes(c.field));
            this.columns = [...ordered, ...rest];
        }
        if (config.hiddenColumns?.length) {
            this.columns.forEach(c => { if (config.hiddenColumns.includes(c.field)) c.visible = false; });
        }
        // Alias de cabecera: se aplican al final para que sobrevivan al orden.
        if (config.columnAliases && typeof config.columnAliases === 'object') {
            this.setColumnAliases(config.columnAliases);
        }

        this.sortField = config.sortField ?? null;
        this.sortOrder = config.sortOrder ?? null;
        this.pageSize = config.pageSize ?? 50;
        this.selected = new Set(config.selectedIds || []);

        this._emit('load', { layerId, rows: this.features.length });
        return this;
    }

    /** Nº total de filas (sin filtrar). */
    get totalRows() { return this.features.length; }

    // ── Ordenamiento ──────────────────────────────────────────────────────────
    /**
     * Alterna el orden de una columna con el ciclo de 3 estados.
     * @param {string} field
     * @returns {string|null} el nuevo orden.
     */
    toggleSort(field) {
        if (this.sortField !== field) {
            this.sortField = field;
            this.sortOrder = 'ASC';
        } else {
            this.sortOrder = nextSortOrder(this.sortOrder);
            if (this.sortOrder === null) this.sortField = null;   // vuelve al original
        }
        this.page = 1;
        this._emit('sort', { field: this.sortField, order: this.sortOrder });
        return this.sortOrder;
    }

    /** Estado del orden de una columna: 'asc' | 'desc' | null. */
    sortStateOf(field) {
        if (this.sortField !== field || !this.sortOrder) return null;
        return this.sortOrder === 'ASC' ? 'asc' : 'desc';
    }

    /**
     * Filas visibles: filtradas y ordenadas. Cada entrada es
     * `{ index, feature }`, donde `index` es la posición original.
     * @returns {Array<{index:number, feature:object}>}
     */
    visibleRows() {
        let rows = this.features.map((feature, index) => ({ index, feature }));

        // Filtro
        if (this.filter?.field && this.filter?.op) {
            rows = rows.filter(r => evaluateCondition(
                r.feature?.properties?.[this.filter.field], this.filter.op, this.filter.value
            ));
        }

        // Orden (el estado null deja el orden original del archivo)
        if (this.sortField && this.sortOrder) {
            const dir = this.sortOrder === 'ASC' ? 1 : -1;
            rows.sort((a, b) => {
                const va = a.feature?.properties?.[this.sortField];
                const vb = b.feature?.properties?.[this.sortField];
                const c = compareValues(va, vb);
                // Desempate estable por índice original.
                return c !== 0 ? c * dir : a.index - b.index;
            });
        }
        return rows;
    }

    /** Total de filas tras aplicar el filtro. */
    get filteredCount() {
        if (!this.filter?.field || !this.filter?.op) return this.totalRows;
        return this.features.filter(f =>
            evaluateCondition(f?.properties?.[this.filter.field], this.filter.op, this.filter.value)
        ).length;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.filteredCount / this.pageSize));
    }

    /** Filas de la página actual. */
    pageRows() {
        const rows = this.visibleRows();
        const start = (this.page - 1) * this.pageSize;
        return rows.slice(start, start + this.pageSize);
    }

    setPage(n) {
        const p = Math.max(1, Math.min(Math.floor(n), this.totalPages));
        this.page = p;
        this._emit('page', { page: p });
        return p;
    }
    nextPage() { return this.setPage(this.page + 1); }
    prevPage() { return this.setPage(this.page - 1); }
    setPageSize(n) {
        this.pageSize = Math.max(1, Math.floor(n));
        this.page = 1;
        this._emit('page-size', { pageSize: this.pageSize });
    }

    // ── Columnas ──────────────────────────────────────────────────────────────
    visibleColumns() { return this.columns.filter(c => c.visible); }
    allColumns() { return [...this.columns]; }

    setColumnVisible(field, visible) {
        const c = this.columns.find(x => x.field === field);
        if (!c) return false;
        c.visible = !!visible;
        this._emit('columns', { field, visible });
        return true;
    }
    toggleColumn(field) {
        const c = this.columns.find(x => x.field === field);
        return c ? this.setColumnVisible(field, !c.visible) : false;
    }
    /** Renombra el alias de una columna (hereda de la config de popup). */
    setColumnLabel(field, label) {
        const c = this.columns.find(x => x.field === field);
        if (!c) return false;
        c.label = String(label || field);
        this._emit('columns', { field, label: c.label });
        return true;
    }
    /** Nombres de las columnas ocultas, para persistir en la capa. */
    hiddenColumnNames() { return this.columns.filter(c => !c.visible).map(c => c.field); }

    /**
     * Mueve una columna una posición (delta = -1 sube, +1 baja).
     * Devuelve true si hubo movimiento. Los límites no fallan: se ignora.
     */
    moveColumn(field, delta) {
        const i = this.columns.findIndex(x => x.field === field);
        if (i < 0) return false;
        const j = i + (delta > 0 ? 1 : -1);
        if (j < 0 || j >= this.columns.length) return false;
        const [c] = this.columns.splice(i, 1);
        this.columns.splice(j, 0, c);
        this._emit('columns', { field, order: this.columns.map(x => x.field) });
        return true;
    }

    /**
     * Reordena las columnas según una lista de campos.
     * Los campos ausentes de la lista quedan al final, en su orden original.
     * Ignora campos de la lista que no existen (no los inventa).
     */
    reorderColumns(fields) {
        if (!Array.isArray(fields)) return false;
        const byField = new Map(this.columns.map(c => [c.field, c]));
        const seen = new Set();
        const ordered = [];
        for (const f of fields) {
            if (seen.has(f)) continue;
            seen.add(f);
            const c = byField.get(f);
            if (c) ordered.push(c);
        }
        const rest = this.columns.filter(c => !seen.has(c.field));
        this.columns = [...ordered, ...rest];
        this._emit('columns', { order: this.columns.map(x => x.field) });
        return true;
    }

    /**
     * Alias de columna para una cabecera. Acepta un objeto {campo: etiqueta}
     * o dos argumentos (campo, etiqueta). Devuelve true si algo cambió.
     */
    setColumnAliases(map) {
        const entries = Array.isArray(map)
            ? []
            : (map && typeof map === 'object' ? Object.entries(map) : []);
        if (!entries.length) return false;
        let changed = false;
        for (const [field, label] of entries) {
            if (this.setColumnLabel(field, label)) changed = true;
        }
        return changed;
    }

    // ── Filtros ───────────────────────────────────────────────────────────────
    /**
     * Aplica un filtro. Acepta un objeto condición o una expresión de texto.
     * @param {object|string} cond
     * @returns {{ok:boolean, error?:string}}
     */
    setFilter(cond) {
        let parsed;
        if (typeof cond === 'string') {
            parsed = parseFilterExpression(cond);
            if (parsed.error) return { ok: false, error: parsed.error };
        } else if (cond && cond.field) {
            parsed = cond;
        } else {
            this.clearFilter();
            return { ok: true };
        }
        // Verificar que el campo exista.
        if (!this.columns.some(c => c.field === parsed.field)) {
            return { ok: false, error: `El campo "${parsed.field}" no existe en esta capa` };
        }
        this.filter = { field: parsed.field, op: parsed.op, value: parsed.value };
        this.page = 1;
        this._emit('filter', { filter: this.filter, count: this.filteredCount });
        return { ok: true };
    }

    clearFilter() {
        this.filter = null;
        this.page = 1;
        this._emit('filter', { filter: null, count: this.totalRows });
    }

    get hasFilter() { return !!(this.filter?.field && this.filter?.op); }

    // ── Selección (spec §3.3) ─────────────────────────────────────────────────
    /** Índices originales seleccionados. */
    selectedIndices() { return [...this.selected].sort((a, b) => a - b); }
    isSelected(index) { return this.selected.has(index); }
    get selectionCount() { return this.selected.size; }

    select(index) {
        this.selected = new Set([index]);
        this._emit('selection', { indices: this.selectedIndices() });
    }
    addToSelection(index) {
        this.selected.add(index);
        this._emit('selection', { indices: this.selectedIndices() });
    }
    removeFromSelection(index) {
        this.selected.delete(index);
        this._emit('selection', { indices: this.selectedIndices() });
    }
    toggleSelection(index) {
        if (this.selected.has(index)) this.selected.delete(index);
        else this.selected.add(index);
        this._emit('selection', { indices: this.selectedIndices() });
    }
    clearSelection() {
        this.selected.clear();
        this._emit('selection', { indices: [] });
    }

    /**
     * Selección con modificadores de teclado (spec §3.3).
     *  - sin modificador: reemplaza la selección
     *  - Shift: rango continuo desde el último índice hasta el nuevo
     *  - Ctrl/Cmd: agrega o quita (discontinuo)
     *
     * @param {number} index Índice original de la fila clicada.
     * @param {{shift?:boolean, ctrl?:boolean}} mods
     */
    selectWithModifiers(index, mods = {}) {
        if (mods.shift) {
            const anchor = this._anchor ?? index;
            const rows = this.visibleRows().map(r => r.index);
            const ia = rows.indexOf(anchor);
            const ib = rows.indexOf(index);
            if (ia === -1 || ib === -1) {
                this.select(index);
            } else {
                const [lo, hi] = ia <= ib ? [ia, ib] : [ib, ia];
                this.selected = new Set(rows.slice(lo, hi + 1));
            }
        } else if (mods.ctrl) {
            this.toggleSelection(index);
        } else {
            this.select(index);
        }
        this._anchor = index;
        this._emit('selection', { indices: this.selectedIndices() });
    }

    /**
     * Extensión espacial de la selección, para el zoom.
     * @returns {{type:string, bounds:number[]|null, single:boolean}}
     *   type: 'empty' | 'point' | 'extent'
     */
    selectionExtent() {
        const idx = this.selectedIndices();
        if (!idx.length) return { type: 'empty', bounds: null, single: false };
        const bb = boundsOfFeatures(idx.map(i => this.features[i]));
        if (!bb) return { type: 'empty', bounds: null, single: false };
        const isPoint = bb[0] === bb[2] && bb[1] === bb[3];
        return {
            type: isPoint ? 'point' : 'extent',
            bounds: bb,
            single: idx.length === 1
        };
    }

    // ── Relates 1:N (spec §3.2) ───────────────────────────────────────────────
    /**
     * Abre la tabla hija de un registro relacionado.
     * @param {object} opts {childLayerId, childFeatures, parentRowIndex, field, label}
     */
    openRelated({ childLayerId, childFeatures, parentRowIndex, field, label }) {
        // Guardar el estado actual en el historial para poder volver.
        this.history.push({
            layerId: this.layerId,
            features: this.features,
            columns: this.columns.map(c => ({ ...c })),
            sortField: this.sortField, sortOrder: this.sortOrder,
            page: this.page, pageSize: this.pageSize,
            selected: new Set(this.selected),
            filter: this.filter ? { ...this.filter } : null,
            related: this.related
        });
        this.related = { parentLayerId: this.layerId, parentRowIndex, field, label: label || childLayerId };
        this.load(childLayerId, childFeatures, { keepHistory: true });
        this._emit('related-open', { childLayerId, parentRowIndex });
        return true;
    }

    /** Vuelve a la tabla padre. */
    closeRelated() {
        const prev = this.history.pop();
        if (!prev) return false;
        this.layerId = prev.layerId;
        this.features = prev.features;
        this.columns = prev.columns;
        this.sortField = prev.sortField;
        this.sortOrder = prev.sortOrder;
        this.page = prev.page;
        this.pageSize = prev.pageSize;
        this.selected = prev.selected;
        this.filter = prev.filter;
        this.related = prev.related;
        this._emit('related-close', { layerId: this.layerId });
        return true;
    }

    get hasParent() { return this.history.length > 0; }

    // ── Serialización ─────────────────────────────────────────────────────────
    /** Config lista para guardar en la capa (tableConfig). */
    toConfig() {
        return {
            pageSize: this.pageSize,
            sortField: this.sortField,
            sortOrder: this.sortOrder || 'ASC',
            selectedIds: this.selectedIndices(),
            hiddenColumns: this.hiddenColumnNames(),
            columnOrder: this.columns.map(c => c.field),
            // Solo se persisten los alias que difieren del nombre técnico,
            // para no inflar la config con entradas redundantes.
            columnAliases: this.columns
                .filter(c => c.label && c.label !== c.field)
                .reduce((acc, c) => { acc[c.field] = c.label; return acc; }, {})
        };
    }

    reset() {
        this.layerId = null;
        this.features = [];
        this.columns = [];
        this.sortField = null;
        this.sortOrder = null;
        this.page = 1;
        this.selected = new Set();
        this.filter = null;
        this.related = null;
        this.history = [];
        this._emit('reset', {});
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Deriva las columnas a partir de las claves de propiedades de las features.
 * Respeta el orden de aparición y limita el muestreo para no recorrer todo.
 */
export function deriveColumns(features, sample = 200) {
    const seen = new Set();
    const limit = Math.min(features.length, sample);
    for (let i = 0; i < limit; i++) {
        const props = features[i]?.properties || {};
        for (const k of Object.keys(props)) seen.add(k);
    }
    return [...seen].map(field => ({ field, label: field, visible: true, related: false, isAttachment: false }));
}

/** Envolvente [minLon, minLat, maxLon, maxLat] de un conjunto de features. */
export function boundsOfFeatures(features) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;
    const walk = (c) => {
        if (!Array.isArray(c)) return;
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
                if (c[0] < minX) minX = c[0];
                if (c[1] < minY) minY = c[1];
                if (c[0] > maxX) maxX = c[0];
                if (c[1] > maxY) maxY = c[1];
                n++;
            }
            return;
        }
        for (const sub of c) walk(sub);
    };
    for (const f of features || []) walk(f?.geometry?.coordinates);
    return n ? [minX, minY, maxX, maxY] : null;
}

/** Formatea un valor para mostrarlo en la celda. */
export function formatCellValue(value, field = '') {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
        // Áreas y superficies con separador de miles y 2 decimales.
        if (/AREA|SUP|SUPERF|DIST|LONG/i.test(field)) {
            return value.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return value.toLocaleString('es-PY', { maximumFractionDigits: 6 });
    }
    return String(value);
}

export const AttributeTable = new AttributeTableClass();
export { AttributeTableClass };
export default AttributeTable;
