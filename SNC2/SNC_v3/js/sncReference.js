/**
 * SNCReference — capa de referencia catastral, con dos controles independientes.
 *
 * Antes había una sola capa y un solo flag, lo que mezclaba dos cosas que el
 * usuario quiere manejar aparte:
 *
 *   1. Capa VISUAL opcional: el polígono/servicio del visor oficial que se
 *      dibuja sobre el mapa. Se puede prender y apagar.
 *   2. Capa REMOTA (WMS): activada, puede aparecer ENCIMA de los mapas base;
 *      si no se activa, se puede ver solo (el mapa base).
 *
 * La capa remota es de un servicio externo, así que:
 *  - no debe estar en la leyenda por defecto (es un fondo, no una capa temática)
 *  - debe poder ir por encima del mapa base (opacidad y orden propios)
 *  - su disponibilidad se detecta sola (si el servicio cae, no rompe el arranque)
 *
 * Este módulo es lógica pura: decide qué capa va y dónde, sin tocar el DOM.
 */

export const REF_STATES = {
    OFF: 'off',           // ni la visual ni la remota
    VISUAL: 'visual',     // solo el polígono/servicio visual
    REMOTA: 'remota',     // solo la capa remota encima del mapa base
    AMBAS: 'ambas'        // visual + remota
};

export const REF_DEFAULTS = {
    visualEnabled: false,
    remotaEnabled: false,
    // Opacidad de la capa remota (0..1).
    remotaOpacity: 0.85,
    // ¿La capa remota va por encima del mapa base?
    remotaOnTop: true,
    // ¿La capa remota se muestra en la leyenda?
    remotaInLegend: false
};

/**
 * Normaliza la configuración de la referencia.
 * @param {object} [partial]
 */
export function normalizeRefConfig(partial) {
    const p = partial || {};
    const num = (v, def, min, max) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return def;
        return Math.min(max, Math.max(min, n));
    };
    return {
        visualEnabled: p.visualEnabled === true,
        remotaEnabled: p.remotaEnabled === true,
        remotaOpacity: num(p.remotaOpacity, REF_DEFAULTS.remotaOpacity, 0, 1),
        remotaOnTop: p.remotaOnTop !== false,
        remotaInLegend: p.remotaInLegend === true
    };
}

/**
 * Estado compuesto de la referencia, derivado de la configuración.
 * @param {object} [config]
 * @returns {string} uno de REF_STATES
 */
export function refState(config) {
    const c = normalizeRefConfig(config);
    if (c.visualEnabled && c.remotaEnabled) return REF_STATES.AMBAS;
    if (c.remotaEnabled) return REF_STATES.REMOTA;
    if (c.visualEnabled) return REF_STATES.VISUAL;
    return REF_STATES.OFF;
}

/**
 * ¿Hay algo visible que dibujar?
 */
export function refVisible(config) {
    return refState(config) !== REF_STATES.OFF;
}

/**
 * ¿La capa remota debe dibujarse?
 * Es independiente de la visual: puede ir sola encima del mapa base.
 */
export function refRemotaVisible(config) {
    const c = normalizeRefConfig(config);
    return c.remotaEnabled;
}

/**
 * ¿La capa visual debe dibujarse?
 */
export function refVisualVisible(config) {
    const c = normalizeRefConfig(config);
    return c.visualEnabled;
}

/**
 * ¿La referencia (cualquiera de sus partes) figura en la leyenda?
 * Solo si está explícitamente habilitado en la config: por defecto no, porque
 * es una capa de fondo.
 */
export function refInLegend(config) {
    const c = normalizeRefConfig(config);
    return c.remotaInLegend;
}

/**
 * ¿La capa remota va por encima del mapa base?
 */
export function refRemotaOnTop(config) {
    return normalizeRefConfig(config).remotaOnTop;
}

/**
 * Traduce el estado a un texto legible, para mostrar en el panel.
 */
export function describeRefState(config) {
    switch (refState(config)) {
        case REF_STATES.AMBAS:  return 'Visual + remota activas';
        case REF_STATES.REMOTA: return 'Solo capa remota (encima del mapa base)';
        case REF_STATES.VISUAL: return 'Solo capa visual';
        default:                return 'Desactivada';
    }
}

/**
 * Etiqueta de la capa para la leyenda.
 * La remota y la visual se muestran como entradas separadas si ambas están
 * activas, para que el usuario sepa qué es qué.
 */
export function refLegendEntries(config) {
    const c = normalizeRefConfig(config);
    const out = [];
    if (c.visualEnabled && c.remotaInLegend) {
        out.push({ id: 'snc-ref', title: 'Referencia catastral SNC' });
    }
    if (c.remotaEnabled && c.remotaInLegend) {
        out.push({ id: 'snc-ref-remota', title: 'Referencia SNC (capa remota)' });
    }
    return out;
}

/**
 * Decide si una capa temática cualquiera debe figurar en la leyenda.
 * Regla del spec: la leyenda refleja el toggle de "mostrar en leyenda" de la
 * capa; si se apagó, desaparece. Una capa apagada no aparece nunca.
 *
 * @param {object} node Nodo de capa del LayerManager
 * @param {object} [opts]
 * @param {boolean} [opts.isVisible] La capa está visible en el mapa
 * @returns {boolean}
 */
export function shouldShowInLegend(node, opts = {}) {
    if (!node) return false;
    // Apagada: fuera de la leyenda, siempre.
    if (opts.isVisible === false || node.visible === false) return false;
    // Oculta explícitamente: fuera.
    if (node.legend?.hideInLegend === true) return false;
    // El toggle de leyenda manda: por defecto se muestra.
    return node.legend?.showInLegend !== false;
}

export default {
    REF_STATES, REF_DEFAULTS,
    normalizeRefConfig, refState, refVisible, refRemotaVisible, refVisualVisible,
    refInLegend, refRemotaOnTop, describeRefState, refLegendEntries,
    shouldShowInLegend
};
