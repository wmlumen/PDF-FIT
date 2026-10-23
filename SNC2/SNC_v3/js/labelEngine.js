/**
 * LabelEngine — dibuja las etiquetas de una capa sobre el mapa.
 *
 * Toma la configuración de etiquetas del LayerManager y la simbología real de
 * la capa, y agrega tooltips permanentes de Leaflet con el valor del atributo
 * elegido. El color hereda el de la capa (modificable).
 *
 * Ejemplo: capa Hidrografía, columna `nombre` → cada río muestra su nombre
 * en el mapa con el azul de la capa.
 *
 * Uso:
 *   LabelEngine.apply(map, 'hidro', features, { enabled:true, field:'nombre' }, { color:'#0ea5e9' });
 *   LabelEngine.clear(map, 'hidro');
 */

import {
    buildLabels, labelHtml, leafletDirection, normalizeLabelConfig,
    inScaleRange, hasLabelSource
} from './labels.js';
import { logger } from './logger.js';

/** Grupo de etiquetas por capa: { layerId: L.layerGroup } */
const groups = new Map();
/** Configuración vigente por capa, para re-evaluar al cambiar la escala. */
const configs = new Map();

// ─── Utilidades ───────────────────────────────────────────────────────────────
/**
 * Calcula el punto donde anclar la etiqueta de una geometría.
 * Punto → su coordenada. Línea/polígono → el centro de su extensión.
 *
 * @param {object} feature
 * @returns {[number, number]|null} [lat, lng] o null si no se puede.
 */
export function anchorOf(feature) {
    const g = feature?.geometry;
    if (!g) return null;

    if (g.type === 'Point') {
        const [lng, lat] = g.coordinates || [];
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    }
    if (g.type === 'MultiPoint') {
        const first = (g.coordinates || [])[0] || [];
        return first.length >= 2 ? [first[1], first[0]] : null;
    }

    // Para líneas y polígonos se usa el centro de la extensión: Leaflet lo
    // resuelve solo con getCenter() sobre una capa temporal.
    try {
        const tmp = L.geoJSON(feature);
        const bounds = tmp.getBounds();
        if (!bounds.isValid()) return null;
        const c = bounds.getCenter();
        return [c.lat, c.lng];
    } catch {
        return null;
    }
}

/** Etiqueta Leaflet con el estilo ya resuelto. */
function makeTooltip(text, config, layerStyle) {
    const dir = leafletDirection(config.placement);
    return {
        html: labelHtml(text, config, layerStyle),
        options: {
            permanent: true,
            direction: dir === 'auto' ? 'center' : dir,
            className: 'snc-label',
            // `auto` de Leaflet solo elige entre left/right; para etiquetas de
            // línea y polígono 'center' se ve mejor y no tapa el trazo.
            offset: [0, 0],
            opacity: 1,
            interactive: false,
            pane: 'tooltipPane'
        }
    };
}

// ─── API principal ────────────────────────────────────────────────────────────
/**
 * Dibuja (o redibuja) las etiquetas de una capa.
 *
 * @param {object} map Instancia Leaflet.
 * @param {string} layerId
 * @param {object[]} features Entidades en WGS84.
 * @param {object} config Configuración de etiquetas de la capa.
 * @param {object} [layerStyle] Estilo de la capa (para heredar el color).
 * @returns {number} cantidad de etiquetas dibujadas
 */
export function apply(map, layerId, features, config, layerStyle = {}) {
    if (!map || !layerId) return 0;
    clear(map, layerId);

    const c = normalizeLabelConfig(config);
    configs.set(layerId, { config: c, layerStyle, features });

    if (!c.enabled || !hasLabelSource(c)) return 0;
    if (!inScaleRange(c, currentScale)) return 0;

    const labels = buildLabels(features, c);
    if (!labels.length) return 0;

    const group = L.layerGroup();
    for (const { index, text } of labels) {
        const anchor = anchorOf(features[index]);
        if (!anchor) continue;
        const { html, options } = makeTooltip(text, c, layerStyle);
        // Un marcador invisible sostiene el tooltip. No es interactivo, así
        // que no interfiere con clics, selección ni digitalización.
        L.circleMarker(anchor, {
            radius: 0, opacity: 0, fillOpacity: 0, interactive: false
        }).bindTooltip(html, options).addTo(group);
    }

    group.addTo(map);
    groups.set(layerId, group);
    return labels.length;
}

/**
 * Quita las etiquetas de una capa.
 * @param {object} map
 * @param {string} layerId
 */
export function clear(map, layerId) {
    const group = groups.get(layerId);
    if (group && map?.hasLayer(group)) map.removeLayer(group);
    if (group) groups.delete(layerId);
    configs.delete(layerId);
}

/** Quita todas las etiquetas del mapa. */
export function clearAll(map) {
    for (const [id] of groups) clear(map, id);
    configs.clear();
}

/**
 * Vuelve a dibujar todas las etiquetas, reevaluando el rango de escala.
 * Se llama en cada zoom del mapa.
 *
 * @param {object} map
 * @param {number|null} scale Denominador de escala actual.
 */
export function refreshForScale(map, scale) {
    currentScale = scale;
    for (const [id, entry] of [...configs]) {
        const { config, layerStyle, features } = entry;
        if (config.enabled && !inScaleRange(config, scale)) {
            // Fuera de rango: quitar del mapa pero conservar la configuración
            // para que vuelvan a aparecer al volver a la escala adecuada.
            const group = groups.get(id);
            if (group && map?.hasLayer(group)) map.removeLayer(group);
        } else if (config.enabled && hasLabelSource(config) && !groups.has(id)) {
            apply(map, id, features, config, layerStyle);
        }
    }
}

/** Escala actual del visor (la fija refreshForScale). */
let currentScale = null;

/** ¿Tiene etiquetas dibujadas esta capa? */
export function hasLabels(layerId) { return groups.has(layerId); }

/** Ids de las capas con etiquetas activas. */
export function labeledLayerIds() { return [...groups.keys()]; }

/** Información de diagnóstico (para el panel). */
export function debugInfo() {
    return [...configs.entries()].map(([id, e]) => ({
        id,
        enabled: e.config.enabled,
        campo: e.config.field || e.config.expression || '—',
        dibujadas: groups.has(id)
    }));
}

export default {
    apply, clear, clearAll, refreshForScale, hasLabels, labeledLayerIds,
    debugInfo, anchorOf
};
