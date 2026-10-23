/**
 * AttributeEditorUI — edición de la tabla de atributos y definición de columnas.
 *
 * Hasta ahora la tabla de atributos de SNC_v3 era de SOLO LECTURA: mostraba las
 * columnas que traía el archivo y no dejaba tocar nada. Este módulo le agrega:
 *
 *  1. EDITAR CELDAS: doble clic (o Enter) sobre una celda editable → input en el
 *     lugar, validación por tipo, y guardado.
 *  2. AGREGAR COLUMNAS: texto, número, entero, coordenada X/Y, fecha, sí/no.
 *  3. PERSISTIR: la definición de columnas y los valores editados viven en
 *     archivos sidecar junto al GeoJSON original (que nunca se toca):
 *        hidro.geojson      →  hidro.atributos.json  (esquema)
 *        hidro.geojson      →  hidro.datos.json      (valores editados)
 *  4. JOIN: traer columnas de OTRO archivo por un campo común.
 *
 * La lógica pura (tipos, validación, merge) está en js/schemaEditor.js, que es
 * testeable sin DOM. Acá solo está el cableado con la UI y el disco.
 */

import * as Schema from './schemaEditor.js';
import { logger } from './logger.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

/** Estado del editor por capa. */
const state = {
    layerId: null,
    features: [],        // features originales (WGS84)
    fileColumns: [],     // nombres de columna que trae el archivo
    userSchema: null,    // esquema guardado en el sidecar
    values: {},          // valores editados: { "FID:12": { OBS: "hola" } }
    dirty: false
};

// ─── Persistencia ─────────────────────────────────────────────────────────────

/**
 * Carga el sidecar de una capa.
 * En el navegador usa fetch; en Node (tests) devuelve vacío.
 */
export async function loadSchema(layerId) {
    state.layerId = layerId;
    state.userSchema = null;
    state.values = {};
    state.dirty = false;

    const url = Schema.sidecarPath(layerId);
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const raw = await res.text();
            state.userSchema = Schema.parseSchema(raw);
        }
    } catch (e) {
        // Sin sidecar no es un error: la capa usa solo las columnas del archivo.
        logger.debug?.('AttributeEditor: sin sidecar en ' + url);
    }

    const durl = Schema.dataPath(layerId);
    try {
        const res = await fetch(durl, { cache: 'no-store' });
        if (res.ok) {
            const raw = await res.text();
            const parsed = JSON.parse(raw);
            state.values = parsed?.values || {};
        }
    } catch (e) {
        logger.debug?.('AttributeEditor: sin datos en ' + durl);
    }
    return state.userSchema;
}

/**
 * Guarda el esquema y los valores en disco.
 * Devuelve `{ ok, files, error }`.
 */
export async function save(layerId = state.layerId) {
    if (!layerId) return { ok: false, error: 'Sin capa' };
    const id = layerId || state.layerId;

    const schemaBody = Schema.serializeSchema(state.userSchema || {}, {
        values: state.values
    });
    const dataBody = JSON.stringify({ version: 1, values: state.values }, null, 2);

    const files = [
        { path: Schema.sidecarPath(id), body: schemaBody },
        { path: Schema.dataPath(id), body: dataBody }
    ];

    // Si hay backend disponible, se guarda ahí. Si no, se avisa para descarga.
    let saved = [];
    for (const f of files) {
        const ok = await writeFile(f.path, f.body);
        if (ok) saved.push(f.path);
    }
    state.dirty = false;
    return {
        ok: saved.length === files.length,
        files: saved,
        pending: files.filter(f => !saved.includes(f.path)).map(f => f.path)
    };
}

/**
 * Escribe un archivo. Usa el endpoint del backend si existe; si no, null.
 */
async function writeFile(path, body) {
    try {
        const res = await fetch('/api/layers/attributes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, body })
        });
        return res.ok;
    } catch {
        return null;
    }
}

// ─── Columnas ─────────────────────────────────────────────────────────────────

/** Columnas finales: archivo + las nuevas del usuario. */
export function columns() {
    return Schema.mergeSchema(state.fileColumns, state.userSchema);
}

/** Columnas visibles, en orden. */
export function visibleColumns() {
    return Schema.visibleColumns(columns(), state.userSchema?.order);
}

/** Define las columnas del archivo (se llama al cargar la capa). */
export function setFileColumns(names = []) {
    state.fileColumns = Array.isArray(names) ? names : [];
}

/** Define las features (se llama al cargar la capa). */
export function setFeatures(features = []) {
    state.features = Array.isArray(features) ? features : [];
}

/**
 * Agrega una columna nueva.
 * @returns {{ok:boolean, column?:object, error?:string}}
 */
export function addColumn(opts = {}) {
    const col = Schema.makeColumn(opts);
    // No duplicar nombres.
    if (columns().some(c => c.name === col.name)) {
        return { ok: false, error: `Ya existe la columna "${col.name}"` };
    }
    const prev = state.userSchema ? Schema.normalizeSchema(state.userSchema) : { columns: {}, order: [] };
    prev.columns[col.name] = col;
    prev.order = [...prev.order, col.name];
    state.userSchema = prev;
    state.dirty = true;
    return { ok: true, column: col };
}

/**
 * Cambia el alias visible de una columna.
 */
export function renameColumn(name, alias) {
    const sc = state.userSchema ? Schema.normalizeSchema(state.userSchema) : null;
    if (!sc?.columns[name]) return { ok: false, error: 'Columna no encontrada' };
    sc.columns[name].alias = String(alias).slice(0, 80);
    state.userSchema = sc;
    state.dirty = true;
    return { ok: true };
}

/**
 * Oculta o muestra una columna.
 */
export function toggleColumn(name, visible) {
    const sc = state.userSchema ? Schema.normalizeSchema(state.userSchema) : null;
    if (!sc?.columns[name]) return { ok: false, error: 'Columna no encontrada' };
    sc.columns[name].visible = visible !== false;
    state.userSchema = sc;
    state.dirty = true;
    return { ok: true };
}

/**
 * Borra una columna nueva. Las columnas del archivo no se borran.
 */
export function removeColumn(name) {
    const sc = state.userSchema ? Schema.normalizeSchema(state.userSchema) : null;
    if (!sc?.columns[name]) return { ok: false, error: 'Columna no encontrada' };
    if (sc.columns[name].readonly) {
        return { ok: false, error: 'Las columnas del archivo no se pueden borrar' };
    }
    delete sc.columns[name];
    sc.order = sc.order.filter(n => n !== name);
    state.userSchema = sc;
    state.dirty = true;
    return { ok: true };
}

// ─── Valores ──────────────────────────────────────────────────────────────────

/** Clave de una fila: usa el FID si hay, si no el índice. */
function rowKey(feature, index) {
    const p = feature?.properties || {};
    return String(p.FID ?? p.fid ?? index);
}

/**
 * Lee el valor de una celda, aplicando la edición guardada.
 */
export function cellValue(feature, col, index) {
    const key = rowKey(feature, index);
    const edited = state.values[key]?.[col.name];
    if (edited !== undefined) return edited;
    return Schema.computeCellValue(feature, col);
}

/**
 * Guarda el valor editado de una celda.
 * @returns {{ok:boolean, error?:string}}
 */
export function setCellValue(feature, col, raw, index) {
    if (col.readonly) return { ok: false, error: 'La columna no es editable' };
    const v = Schema.coerceValue(raw, col.type);
    if (!v.ok) return v;
    const key = rowKey(feature, index);
    state.values[key] = state.values[key] || {};
    state.values[key][col.name] = v.value;
    state.dirty = true;
    return { ok: true, value: v.value };
}

/** ¿Hay cambios sin guardar? */
export function isDirty() { return state.dirty; }

/** Resumen del estado, para mostrar en la UI. */
export function summary() {
    return {
        layerId: state.layerId,
        fileColumns: state.fileColumns.length,
        userColumns: Object.keys(state.userSchema?.columns || {}).length,
        editedCells: Object.values(state.values).reduce((n, r) => n + Object.keys(r).length, 0),
        dirty: state.dirty
    };
}

// ─── JOIN ─────────────────────────────────────────────────────────────────────

/**
 * Agrega columnas de OTRO archivo cruzando por un campo común.
 * Ejemplo: cruzar parcelas con un CSV de propietarios por PADRON.
 *
 * @param {object} other { columns: string[], rows: object[] }
 * @param {string} otherKey Campo del otro archivo (ej. 'PADRON')
 * @param {string} thisKey Campo de esta capa (ej. 'PADRON')
 * @param {string[]} wanted Columnas a traer
 * @returns {{ok:boolean, added?:number, error?:string}}
 */
export function join(other = {}, otherKey = '', thisKey = '', wanted = []) {
    if (!other.rows?.length) return { ok: false, error: 'El archivo no tiene filas' };
    if (!otherKey || !thisKey) return { ok: false, error: 'Falta el campo de cruce' };

    const sc = state.userSchema ? Schema.normalizeSchema(state.userSchema) : { columns: {}, order: [] };

    // Crear las columnas nuevas (si no existen).
    for (const name of wanted) {
        const colName = name || otherKey;
        if (sc.columns[colName]) continue;
        sc.columns[colName] = Schema.normalizeColumn({
            name: colName,
            title: colName,
            type: Schema.normalizeColumnType(other.columns?.[colName] || 'text'),
            source: 'join'
        });
        sc.order = [...sc.order, colName];
    }

    // Llenar valores por fila.
    let matched = 0;
    const byKey = new Map();
    for (const row of other.rows) {
        const k = String(row[otherKey] ?? '');
        if (k) byKey.set(k, row);
    }
    state.features.forEach((f, i) => {
        const k = String(f?.properties?.[thisKey] ?? '');
        const row = byKey.get(k);
        if (!row) return;
        matched++;
        const key = rowKey(f, i);
        state.values[key] = state.values[key] || {};
        for (const name of wanted) {
            const colName = name || otherKey;
            if (row[colName] !== undefined) state.values[key][colName] = row[colName];
        }
    });

    state.userSchema = sc;
    state.dirty = true;
    return { ok: true, added: matched };
}

export default {
    loadSchema, save, columns, visibleColumns, setFileColumns, setFeatures,
    addColumn, renameColumn, toggleColumn, removeColumn,
    cellValue, setCellValue, isDirty, summary, join
};
