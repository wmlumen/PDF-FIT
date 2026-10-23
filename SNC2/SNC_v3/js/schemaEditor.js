/**
 * SchemaEditor — definición de columnas de la tabla de atributos.
 *
 * La tabla de atributos de SNC_v3 hoy es de SOLO LECTURA: muestra las
 * columnas que trae el archivo y no deja editarlas ni agregar nuevas. Este
 * módulo es la base para que eso cambie.
 *
 * Qué modela:
 *  - Las columnas del archivo (traídas por el GeoJSON).
 *  - Las columnas NUEVAS que el usuario agrega (texto, número, coordenada…).
 *  - El tipo de dato, el alias visible y el ancho de cada columna.
 *
 * Las columnas nuevas viven en un sidecar junto al archivo:
 *   data/piribebuy/hidro.geojson  →  data/piribebuy/hidro.atributos.json
 * Así el archivo original nunca se toca, y la definición siempre vive en disco.
 *
 * Este módulo es lógica pura: no toca el DOM ni el filesystem. Es testeable.
 */

/** Tipos de columna soportados. */
export const COLUMN_TYPES = {
    TEXT:    { value: 'text',    label: 'Texto',          hint: 'Cualquier cadena' },
    NUMBER:  { value: 'number',  label: 'Número',         hint: 'Entero o decimal' },
    INTEGER: { value: 'integer', label: 'Número entero',  hint: 'Sin decimales' },
    COORD_X: { value: 'coord_x', label: 'Coordenada X',   hint: 'Longitud / Este' },
    COORD_Y: { value: 'coord_y', label: 'Coordenada Y',   hint: 'Latitud / Norte' },
    DATE:    { value: 'date',    label: 'Fecha',          hint: 'AAAA-MM-DD' },
    BOOL:    { value: 'bool',    label: 'Sí/No',          hint: 'Valor lógico' }
};

export const TYPE_VALUES = Object.values(COLUMN_TYPES).map(t => t.value);

/** Columna por defecto del sistema (no editable ni borrable). */
export const SYSTEM_COLUMNS = ['FID', 'GEOMETRY', 'AREA_M2', 'PERIM_M'];

/**
 * Normaliza el tipo de una columna.
 * @param {*} t
 * @returns {string} uno de TYPE_VALUES
 */
export function normalizeColumnType(t) {
    const s = String(t || '').toLowerCase();
    return TYPE_VALUES.includes(s) ? s : 'text';
}

/**
 * Normaliza una definición de columna.
 * @param {object} [partial]
 * @param {object} [opts]
 * @param {string} [opts.id] Id de la capa a la que pertenece.
 */
export function normalizeColumn(partial, opts = {}) {
    const p = partial || {};
    const type = normalizeColumnType(p.type);
    return {
        // Nombre de campo: si no viene, se deriva del título.
        name: String(p.name || deriveName(p.title) || '').slice(0, 64),
        title: String(p.title || p.name || 'Columna sin nombre').slice(0, 80),
        type,
        // Alias visible (hereda del título si no se define).
        alias: String(p.alias ?? p.title ?? p.name ?? '').slice(0, 80),
        // Valor por defecto para las filas nuevas.
        default: p.default == null ? '' : String(p.default),
        width: clampNum(p.width, 120, 6, 400),
        visible: p.visible !== false,
        editable: p.editable !== false,
        // Columnas del archivo no se pueden borrar, solo ocultar.
        readonly: p.readonly === true,
        // De qué capa viene (para joins).
        source: String(p.source || '').slice(0, 64)
    };
}

/**
 * Normaliza la definición de columnas de UNA capa.
 * Devuelve `{ columns, order }`:
 *  - `columns`: mapa nombre → definición
 *  - `order`: orden de visualización
 *
 * @param {object} [partial]
 */
export function normalizeSchema(partial) {
    const p = partial || {};
    const raw = Array.isArray(p.columns) ? p.columns : [];
    const columns = {};
    for (const c of raw) {
        const n = normalizeColumn(c);
        if (n.name) columns[n.name] = n;
    }
    // Idempotente: si `columns` ya vino como mapa (salida de una llamada
    // anterior), se conserva tal cual en vez de descartarlo.
    if (!raw.length && p.columns && !Array.isArray(p.columns)) {
        for (const [k, v] of Object.entries(p.columns)) {
            const n = normalizeColumn(v);
            if (n.name) columns[n.name] = n;
        }
    }
    const order = Array.isArray(p.order)
        ? p.order.filter(n => columns[n])
        : Object.keys(columns);
    return { columns, order, version: p.version ?? 1 };
}

/**
 * Deriva un nombre de campo válido a partir de un título.
 * "Nombre de la calle" → "NOMBRE_CALLE"
 */
export function deriveName(title) {
    return String(title || '')
        .trim()
        .toUpperCase()
        // Superíndices y ordinales comunes → dígito equivalente.
        .replace(/[²³¹]/g, m => ({ '²': '2', '³': '3', '¹': '1' }[m] || ''))
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        // Conservar dígitos: "Área (m²)" → AREA_M2, no AREA_M
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48);
}

/**
 * Crea una columna nueva con un id único.
 * @param {object} [opts] { title, type, id }
 */
export function makeColumn(opts = {}) {
    const title = opts.title?.trim() || 'Columna nueva';
    let name = deriveName(title);
    if (!name) name = 'COL_' + Date.now().toString(36).toUpperCase();
    return normalizeColumn({
        name,
        title,
        type: normalizeColumnType(opts.type),
        source: opts.source || '',
        width: COLUMN_TYPES[normalizeColumnType(opts.type)]?.value === 'text' ? 160 : 120
    });
}

/**
 * Calcula el valor de una celda según el tipo de columna.
 * Para coordenadas toma el vértice representativo de la geometría.
 *
 * @param {object} row Fila con `properties` y `geometry`
 * @param {object} col Definición de columna
 * @returns {string} valor listo para mostrar
 */
export function computeCellValue(row, col) {
    if (!row) return '';
    const props = row.properties || {};

    // Columna del archivo: sale directo de los atributos.
    if (col.source === 'file' && col.name in props) {
        return formatValue(props[col.name], col.type);
    }

    // Coordenadas: se derivan de la geometría.
    if (col.type === 'coord_x' || col.type === 'coord_y') {
        const c = representativePoint(row.geometry);
        if (!c) return '';
        const raw = col.type === 'coord_x' ? c[0] : c[1];
        return col.type === 'coord_x' ? roundCoord(raw, 6) : roundCoord(raw, 6);
    }

    // Columna nueva del usuario: ya está en properties (persistida).
    if (col.name in props) return formatValue(props[col.name], col.type);

    return col.default ?? '';
}

/** Punto representativo: baricentro del polígono, punto medio de la línea. */
function representativePoint(geometry) {
    if (!geometry || !Array.isArray(geometry.coordinates)) return null;
    const t = geometry.type;
    const coords = geometry.coordinates;
    try {
        if (t === 'Point') return coords;
        if (t === 'MultiPoint' && coords.length) return coords[0];
        if (t === 'LineString' || t === 'MultiLineString') {
            const line = t === 'LineString' ? coords : coords[0];
            return line && line.length ? line[Math.floor(line.length / 2)] : null;
        }
        if (t === 'Polygon' || t === 'MultiPolygon') {
            const ring = t === 'Polygon' ? coords[0] : coords[0]?.[0];
            if (!ring || !ring.length) return null;
            // Baricentro de los vértices (suficiente como etiqueta).
            let sx = 0, sy = 0;
            for (const p of ring) { sx += p[0]; sy += p[1]; }
            return [sx / ring.length, sy / ring.length];
        }
    } catch { return null; }
    return null;
}

const roundCoord = (v, d) => Number(Number(v).toFixed(d));

/** Formatea un valor según el tipo de columna. */
export function formatValue(v, type) {
    if (v == null || v === '') return '';
    switch (type) {
        case 'number': case 'integer': {
            const n = Number(v);
            if (!Number.isFinite(n)) return String(v);
            return type === 'integer' ? String(Math.round(n)) : String(n);
        }
        case 'bool': {
            const s = String(v).toLowerCase();
            if (['true','1','si','sí','yes','y'].includes(s)) return 'Sí';
            if (['false','0','no','n'].includes(s)) return 'No';
            return String(v);
        }
        default: return String(v);
    }
}

/**
 * Coercea un valor de entrada al tipo de la columna.
 * Devuelve `{ ok, value, error }`.
 */
export function coerceValue(raw, type) {
    const s = raw == null ? '' : String(raw).trim();
    if (s === '') return { ok: true, value: '' };
    switch (type) {
        case 'number': {
            const n = Number(s.replace(',', '.'));
            if (!Number.isFinite(n)) return { ok: false, error: `"${s}" no es un número` };
            return { ok: true, value: n };
        }
        case 'integer': {
            const n = Number(s);
            if (!Number.isInteger(n)) return { ok: false, error: `"${s}" no es un entero` };
            return { ok: true, value: n };
        }
        case 'bool': {
            const t = s.toLowerCase();
            if (['true','1','si','sí','yes','y'].includes(t)) return { ok: true, value: true };
            if (['false','0','no','n'].includes(t)) return { ok: true, value: false };
            return { ok: false, error: `"${s}" no es Sí/No` };
        }
        case 'date': {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: 'Formato: AAAA-MM-DD' };
            return { ok: true, value: s };
        }
        default:
            return { ok: true, value: s };
    }
}

/**
 * Une el esquema de archivo con las columnas nuevas del usuario.
 * Devuelve el orden final de columnas visibles.
 *
 * @param {string[]} fileColumns Columnas que trae el archivo
 * @param {object} userSchema Esquema guardado en el sidecar
 * @returns {{name:string,title:string,type:string,alias:string,readonly:boolean,visible:boolean,width:number}[]}
 */
export function mergeSchema(fileColumns = [], userSchema = null) {
    const cols = [];
    const seen = new Set();

    // Primero las del archivo, en su orden original.
    for (const name of (Array.isArray(fileColumns) ? fileColumns : [])) {
        seen.add(name);
        cols.push(normalizeColumn({ name, title: name, type: guessType(name), source: 'file', readonly: true }));
    }

    // Después las del usuario: las que ya existen (actualizan) y las nuevas.
    if (userSchema) {
        const sc = normalizeSchema(userSchema);
        const order = sc.order.length ? sc.order : Object.keys(sc.columns);
        for (const name of order) {
            const def = sc.columns[name];
            if (!def) continue;
            if (seen.has(name)) {
                // Columna del archivo redefinida por el usuario (ej. alias).
                const i = cols.findIndex(c => c.name === name);
                if (i >= 0 && !cols[i].readonly) cols[i] = { ...cols[i], ...def, readonly: true };
                continue;
            }
            seen.add(name);
            cols.push(normalizeColumn(def));
        }
    }
    return cols;
}

/** Adivina el tipo de una columna del archivo por su nombre. */
function guessType(name) {
    const n = String(name).toUpperCase();
    if (/(^|_)(X|LON|LONG|EAST|ESTE)($|_)/.test(n)) return 'coord_x';
    if (/(^|_)(Y|LAT|NORTE|NORTH)($|_)/.test(n)) return 'coord_y';
    if (/(^|_)(AREA|AREA_M2|SUPERFICIE)($|_)/.test(n)) return 'number';
    if (/(^|_)(ID|PADRON|CODIGO|NUMERO|NRO)($|_)/.test(n)) return 'text';
    return 'text';
}

/**
 * Devuelve solo las columnas visibles, en el orden pedido.
 */
export function visibleColumns(cols, order) {
    const o = order?.length ? order : cols.map(c => c.name);
    return o.map(n => cols.find(c => c.name === n)).filter(Boolean);
}

const clampNum = (v, def, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
};

/**
 * Nombre del archivo sidecar de atributos.
 * hidro.geojson → hidro.atributos.json
 * @param {string} layerId
 */
export function sidecarPath(layerId) {
    // Solo conserva caracteres seguros: el id NO puede escapar del directorio.
    const safe = String(layerId)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 60) || 'capa';
    return `data/piribebuy/${safe}.atributos.json`;
}

/**
 * Nombre del archivo de datos editados (valores de celdas).
 * hidro.geojson → hidro.datos.json
 * @param {string} layerId
 */
export function dataPath(layerId) {
    const safe = String(layerId).replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `data/piribebuy/${safe}.datos.json`;
}

/**
 * Serializa el sidecar para guardar en disco.
 * @param {object} schema Esquema de columnas
 * @param {object} [extra] Datos extra (valores editados, joins)
 */
export function serializeSchema(schema, extra = {}) {
    const sc = normalizeSchema(schema);
    // `sc.columns` es un mapa nombre→definición; hay que pasarlo a array.
    const cols = sc.order
        .map(n => sc.columns[n])
        .filter(Boolean)
        .map(c => ({ ...c }));
    return JSON.stringify({
        version: 1,
        columns: cols,
        order: sc.order,
        ...extra
    }, null, 2);
}

/**
 * Parsea un sidecar guardado. Tolera null y basura.
 * @param {string} raw Contenido del archivo
 */
export function parseSchema(raw) {
    if (!raw) return { columns: [], order: [] };
    try {
        const p = JSON.parse(raw);
        return normalizeSchema(p);
    } catch {
        return { columns: [], order: [] };
    }
}

export default {
    COLUMN_TYPES, TYPE_VALUES, SYSTEM_COLUMNS,
    normalizeColumnType, normalizeColumn, normalizeSchema, deriveName, makeColumn,
    computeCellValue, formatValue, coerceValue, mergeSchema, visibleColumns,
    sidecarPath, dataPath, serializeSchema, parseSchema
};
