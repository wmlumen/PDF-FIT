/**
 * Labels — etiquetado de capas por atributo (tipo ArcGIS "Labels").
 *
 * Permite mostrar el valor de una columna de la tabla sobre cada geometría
 * del mapa. Ejemplo: la capa Hidrografía tiene una columna `nombre`, y se
 * quiere ver el nombre de cada río/canal dibujado sobre el mapa.
 *
 * El color de la etiqueta hereda por defecto el color de la capa (para que
 * quede coherente con su simbología) y es modificable por separado.
 *
 * Este módulo es lógica pura (sin DOM ni Leaflet) para poder testearlo:
 *  - normaliza la configuración de etiquetas de una capa
 *  - resuelve la expresión de texto contra las propiedades de una entidad
 *  - calcula el estilo final (color, halo, tamaño) combinando capa + config
 */

// ─── Valores por defecto ──────────────────────────────────────────────────────
export const LABEL_DEFAULTS = {
    enabled: false,
    // Expresión del texto. Admite varios campos: "{nombre} — {tipo}".
    // Si está vacío y hay `field`, se usa ese campo solo.
    expression: '',
    field: '',
    fontSize: 11,
    bold: false,
    italic: false,
    // Color: si `colorFromLayer` es true se usa el color de la capa y `color`
    // se ignora (pero se conserva por si el usuario lo desactiva).
    colorFromLayer: true,
    color: '#1f2937',
    // Halo (contorno) para que el texto se lea sobre cualquier fondo.
    haloEnabled: true,
    haloColor: '#ffffff',
    haloWidth: 2,
    // Caja de fondo opcional.
    boxEnabled: false,
    boxColor: '#ffffff',
    boxOpacity: 0.75,
    // Posición respecto de la geometría.
    placement: 'auto',        // auto | center | above | below | left | right
    // Evitar que se repita la misma etiqueta en entidades contiguas.
    dedupe: false,
    // Escala mínima/máxima (denominador) en la que se muestran las etiquetas.
    minScale: null,
    maxScale: null
};

export const PLACEMENTS = [
    { id: 'auto',   label: 'Automática' },
    { id: 'center', label: 'Centrada' },
    { id: 'above',  label: 'Arriba' },
    { id: 'below',  label: 'Abajo' },
    { id: 'left',   label: 'Izquierda' },
    { id: 'right',  label: 'Derecha' }
];

/** Traducción de la posición a `direction` de Leaflet. */
export function leafletDirection(placement) {
    switch (placement) {
        case 'center': return 'center';
        case 'above':  return 'top';
        case 'below':  return 'bottom';
        case 'left':   return 'left';
        case 'right':  return 'right';
        default:       return 'auto';
    }
}

// ─── Normalización ────────────────────────────────────────────────────────────
/**
 * Normaliza una configuración parcial de etiquetas, aplicando los valores por
 * defecto. Tolera null/undefined y valores basura.
 *
 * @param {object} [partial]
 * @returns {object} configuración completa y válida
 */
export function normalizeLabelConfig(partial) {
    const p = partial || {};
    const num = (v, def, min, max) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return def;
        if (min !== undefined && n < min) return min;
        if (max !== undefined && n > max) return max;
        return n;
    };
    const hex = (v, def) => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : def);

    return {
        enabled: p.enabled === true,
        expression: typeof p.expression === 'string' ? p.expression : '',
        field: typeof p.field === 'string' ? p.field : '',
        fontSize: num(p.fontSize, LABEL_DEFAULTS.fontSize, 6, 48),
        bold: p.bold === true,
        italic: p.italic === true,
        colorFromLayer: p.colorFromLayer !== false,
        color: hex(p.color, LABEL_DEFAULTS.color),
        haloEnabled: p.haloEnabled !== false,
        haloColor: hex(p.haloColor, LABEL_DEFAULTS.haloColor),
        haloWidth: num(p.haloWidth, LABEL_DEFAULTS.haloWidth, 0, 8),
        boxEnabled: p.boxEnabled === true,
        boxColor: hex(p.boxColor, LABEL_DEFAULTS.boxColor),
        boxOpacity: num(p.boxOpacity, LABEL_DEFAULTS.boxOpacity, 0, 1),
        placement: PLACEMENTS.some(x => x.id === p.placement) ? p.placement : LABEL_DEFAULTS.placement,
        dedupe: p.dedupe === true,
        minScale: p.minScale == null || p.minScale === '' ? null : num(p.minScale, null, 0),
        maxScale: p.maxScale == null || p.maxScale === '' ? null : num(p.maxScale, null, 0)
    };
}

/**
 * ¿Hay algo que mostrar? Se necesita al menos un campo o una expresión.
 * @param {object} config
 */
export function hasLabelSource(config) {
    const c = normalizeLabelConfig(config);
    return !!(c.expression.trim() || c.field.trim());
}

// ─── Texto de la etiqueta ─────────────────────────────────────────────────────
/**
 * Sustituye los `{campo}` de una expresión por los valores de las propiedades.
 * Los campos ausentes quedan vacíos (no se muestra "undefined").
 *
 * @param {string} expression
 * @param {object} properties
 * @returns {string}
 */
export function interpolate(expression, properties) {
    if (!expression) return '';
    const props = properties || {};
    return expression.replace(/\{([^}]+)\}/g, (_, key) => {
        const k = key.trim();
        // Búsqueda exacta y, si falla, sin distinguir mayúsculas.
        let v = props[k];
        if (v === undefined || v === null) {
            const found = Object.keys(props).find(pk => pk.toLowerCase() === k.toLowerCase());
            v = found ? props[found] : undefined;
        }
        return v === undefined || v === null ? '' : String(v);
    }).replace(/\s+/g, ' ').trim();
}

/**
 * Texto final de la etiqueta para una entidad.
 * Si hay expresión, manda la expresión; si no, el campo simple.
 *
 * @param {object} properties
 * @param {object} config
 * @returns {string} '' si no hay nada que mostrar
 */
export function labelText(properties, config) {
    const c = normalizeLabelConfig(config);
    const expr = c.expression.trim();
    if (expr) return interpolate(expr, properties);
    if (c.field.trim()) {
        // El campo simple admite tanto "nombre" como "{nombre}".
        const raw = props_value(properties, c.field);
        return raw === undefined || raw === null ? '' : String(raw);
    }
    return '';
}

/** Lee una propiedad tolerando diferencias de mayúsculas. */
function props_value(properties, key) {
    const props = properties || {};
    if (props[key] !== undefined) return props[key];
    const found = Object.keys(props).find(k => k.toLowerCase() === String(key).toLowerCase());
    return found ? props[found] : undefined;
}

/**
 * Genera la lista de etiquetas a dibujar para un conjunto de entidades,
 * aplicando deduplicación si está activada.
 *
 * @param {object[]} features
 * @param {object} config
 * @returns {Array<{index:number, text:string}>}
 */
export function buildLabels(features, config) {
    const c = normalizeLabelConfig(config);
    if (!c.enabled || !hasLabelSource(c)) return [];
    const out = [];
    const vistos = new Set();
    (features || []).forEach((f, index) => {
        const text = labelText(f?.properties, c);
        if (!text) return;
        if (c.dedupe) {
            if (vistos.has(text)) return;
            vistos.add(text);
        }
        out.push({ index, text });
    });
    return out;
}

// ─── Estilo ───────────────────────────────────────────────────────────────────
/**
 * Estilo final de la etiqueta, combinando la config con la simbología de la
 * capa.
 *
 * @param {object} config
 * @param {object} [layerStyle] Estilo de la capa ({color, ...})
 * @returns {{color:string, fontSize:number, fontWeight:string, fontStyle:string,
 *            halo:boolean, haloColor:string, haloWidth:number,
 *            box:boolean, boxColor:string, boxOpacity:number}}
 */
export function labelStyle(config, layerStyle = {}) {
    const c = normalizeLabelConfig(config);
    // El color de la capa es el predeterminado: mantiene la coherencia visual.
    const color = c.colorFromLayer ? (layerStyle?.color || c.color) : c.color;
    return {
        color,
        fontSize: c.fontSize,
        fontWeight: c.bold ? '700' : '500',
        fontStyle: c.italic ? 'italic' : 'normal',
        halo: c.haloEnabled,
        haloColor: c.haloColor,
        haloWidth: c.haloWidth,
        box: c.boxEnabled,
        boxColor: c.boxColor,
        boxOpacity: c.boxOpacity,
        colorFromLayer: c.colorFromLayer
    };
}

/**
 * HTML de la etiqueta para Leaflet (tooltip permanente).
 * El halo se resuelve con text-shadow, que funciona en cualquier navegador
 * y no requiere canvas ni `-webkit-text-stroke`.
 *
 * @param {string} text
 * @param {object} config
 * @param {object} [layerStyle]
 * @returns {string}
 */
export function labelHtml(text, config, layerStyle = {}) {
    const st = labelStyle(config, layerStyle);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    const shadows = st.halo && st.haloWidth > 0
        ? `text-shadow:${haloShadow(st.haloColor, st.haloWidth)};`
        : '';
    const box = st.box
        ? `background:${rgba(st.boxColor, st.boxOpacity)};padding:1px 4px;border-radius:3px;`
        : '';

    return `<span style="color:${st.color};font-size:${st.fontSize}px;` +
           `font-weight:${st.fontWeight};font-style:${st.fontStyle};` +
           `${shadows}${box}white-space:nowrap;line-height:1.15;">${esc(text)}</span>`;
}

/** Construye el text-shadow del halo en las 8 direcciones. */
function haloShadow(color, width) {
    const w = Math.max(0.5, Number(width) || 1);
    const dirs = [[-w,0],[w,0],[0,-w],[0,w],[-w,-w],[w,-w],[-w,w],[w,w]];
    return dirs.map(([x,y]) => `${x}px ${y}px 0 ${color}`).join(',');
}

/** Convierte #rrggbb + alfa a rgba(). Tolera entradas inválidas. */
function rgba(hex, alpha) {
    const h = String(hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0,2), 16) || 0;
    const g = parseInt(full.slice(2,4), 16) || 0;
    const b = parseInt(full.slice(4,6), 16) || 0;
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    return `rgba(${r},${g},${b},${a})`;
}

/**
 * ¿Se deben mostrar las etiquetas a la escala actual?
 * @param {object} config
 * @param {number|null} currentScale Denominador de escala del visor
 */
export function inScaleRange(config, currentScale) {
    const c = normalizeLabelConfig(config);
    if (currentScale == null) return true;
    if (c.minScale != null && currentScale > c.minScale) return false;
    if (c.maxScale != null && currentScale < c.maxScale) return false;
    return true;
}

/**
 * Descripción legible de la configuración, para mostrar en el panel.
 * @param {object} config
 */
export function describeLabelConfig(config) {
    const c = normalizeLabelConfig(config);
    if (!c.enabled) return 'Desactivadas';
    if (!hasLabelSource(c)) return 'Activadas, sin campo elegido';
    const fuente = c.expression.trim() || `{${c.field}}`;
    const color = c.colorFromLayer ? 'color de la capa' : c.color;
    return `${fuente} · ${c.fontSize}px · ${color}`;
}

export default {
    LABEL_DEFAULTS, PLACEMENTS,
    normalizeLabelConfig, hasLabelSource, interpolate, labelText, buildLabels,
    labelStyle, labelHtml, inScaleRange, describeLabelConfig, leafletDirection
};
