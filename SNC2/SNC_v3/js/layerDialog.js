/**
 * LayerDialog — panel de propiedades de capa.
 *
 * Reemplaza los `window.prompt()` / `window.alert()` nativos (que muestran el
 * cartel "localhost:5556 dice") por un diálogo propio, con pestañas y todos
 * los parámetros de la capa editables de una vez.
 *
 * Los helpers puros (parseScaleRange, validateScaleRange, buildDialogSpec)
 * están separados del DOM para poder testearse en Node sin navegador.
 */

import LayerManager, { formatScale, zoomToScale } from './layerManager.js';
import * as LabelConfig from './labels.js';

// ─── Presets de rango de escala ───────────────────────────────────────────────
export const SCALE_PRESETS = [
    { id: 'sin-limite', label: 'Sin límite', minScale: null, maxScale: null },
    { id: 'lote', label: 'Lote / manzana (1:2.000)', minScale: 2000, maxScale: 250 },
    { id: 'ciudad', label: 'Ciudad (1:5.000)', minScale: 5000, maxScale: 500 },
    { id: 'distrito', label: 'Distrito (1:50.000)', minScale: 50000, maxScale: 500 },
    { id: 'departamento', label: 'Departamento (1:250.000)', minScale: 250000, maxScale: 5000 }
];

// ─── Patrones de línea ────────────────────────────────────────────────────────
export const LINE_PATTERNS = [
    { id: 'solid', label: 'Continuo', dashArray: null },
    { id: 'dashed', label: 'Segmentado', dashArray: '6, 6' },
    { id: 'dotted', label: 'Punteado', dashArray: '2, 4' },
    { id: 'dashdot', label: 'Raya-punto', dashArray: '10, 4, 2, 4' }
];

// ─── Traducción de nombres técnicos a español ─────────────────────────────────
/**
 * Traduce el tipo de geometría GeoJSON a su nombre en español, para mostrar al
 * usuario. Los nombres técnicos (Polygon, LineString…) quedan solo en el modelo.
 */
export function geometryLabel(type) {
    const MAP = {
        Point: 'Punto',
        MultiPoint: 'Multi-punto',
        LineString: 'Línea',
        MultiLineString: 'Multi-línea',
        Polygon: 'Polígono',
        MultiPolygon: 'Multi-polígono',
        GeometryCollection: 'Colección de geometrías'
    };
    return MAP[type] || 'No determinada';
}

/**
 * Traduce las claves de acción interna a su nombre en español, para el
 * resumen de cambios que se le muestra al usuario.
 */
export function changedLabel(key) {
    const MAP = {
        escala: 'escala',
        nombre: 'nombre',
        opacidad: 'opacidad',
        visibilidad: 'visibilidad',
        selectable: 'selección',
        editable: 'edición',
        snappable: 'ajuste',
        labelEnabled: 'etiquetado',
        leyenda: 'leyenda',
        'simbología': 'simbología',
        simbologia: 'simbología',
        popup: 'ventana emergente',
        tabla: 'tabla de atributos'
    };
    return MAP[key] || key;
}

// ─── Helpers puros ────────────────────────────────────────────────────────────
/**
 * Parsea un rango de escala escrito como texto.
 *
 * Acepta: "50000-500", "50000", "-500", "1:50.000 – 1:500", "" (sin límite).
 * Los separadores de miles y el prefijo "1:" se ignoran.
 *
 * @param {string} text
 * @returns {{minScale:number|null, maxScale:number|null, error:string|null}}
 */
export function parseScaleRange(text) {
    const clean = String(text ?? '').replace(/1\s*:/g, '').replace(/\./g, '').trim();
    if (!clean) return { minScale: null, maxScale: null, error: null };

    // Rango "a-b"
    const m = clean.match(/^(\d*)\s*[-–—]\s*(\d*)$/);
    if (m) {
        const a = m[1] ? Number(m[1]) : null;
        const b = m[2] ? Number(m[2]) : null;
        if (a !== null && !Number.isFinite(a)) return { minScale: null, maxScale: null, error: 'Escala mínima inválida' };
        if (b !== null && !Number.isFinite(b)) return { minScale: null, maxScale: null, error: 'Escala máxima inválida' };
        const err = validateScaleRange(a, b);
        return { minScale: a, maxScale: b, error: err };
    }

    // Valor único: se interpreta como escala mínima (el denominador mayor).
    const single = Number(clean);
    if (!Number.isFinite(single) || single <= 0) {
        return { minScale: null, maxScale: null, error: 'Formato inválido. Usá "50000-500" o dejalo vacío.' };
    }
    return { minScale: single, maxScale: null, error: null };
}

/**
 * Valida un rango de escala.
 * minScale es el denominador MAYOR (más alejado); maxScale el menor (más cerca).
 * Por lo tanto minScale debe ser > maxScale.
 *
 * @returns {string|null} mensaje de error, o null si es válido.
 */
export function validateScaleRange(minScale, maxScale) {
    if (minScale !== null && minScale !== undefined) {
        if (!Number.isFinite(minScale) || minScale <= 0) return 'La escala mínima debe ser un número mayor que 0';
    }
    if (maxScale !== null && maxScale !== undefined) {
        if (!Number.isFinite(maxScale) || maxScale <= 0) return 'La escala máxima debe ser un número mayor que 0';
    }
    if (minScale != null && maxScale != null && minScale <= maxScale) {
        return `La escala mínima (${formatScale(minScale)}) debe ser mayor que la máxima (${formatScale(maxScale)}). ` +
               'La mínima es el límite alejado; la máxima, el cercano.';
    }
    return null;
}

/** Formatea un rango para mostrar: {min:50000,max:500} → "1:50.000 – 1:500". */
export function formatScaleRange(minScale, maxScale) {
    if (minScale == null && maxScale == null) return 'Sin límite';
    if (minScale != null && maxScale == null) return `Hasta ${formatScale(minScale)}`;
    if (minScale == null && maxScale != null) return `Desde ${formatScale(maxScale)}`;
    return `${formatScale(minScale)} – ${formatScale(maxScale)}`;
}

/** Normaliza un color a #rrggbb para el input[type=color]. */
export function normalizeColor(c) {
    if (!c) return '#22d3ee';
    const s = String(c).trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) {
        return '#' + s.slice(1).split('').map(ch => ch + ch).join('').toLowerCase();
    }
    const rgb = s.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgb) {
        return '#' + [rgb[1], rgb[2], rgb[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
    }
    return '#22d3ee';
}

// ─── Especificación del diálogo (puro, testeable) ─────────────────────────────
/**
 * Construye la descripción de pestañas y campos del panel de propiedades.
 *
 * @param {object} node Nodo del LayerManager.
 * @param {{currentScale?:number, properties?:string[], geometryType?:string}} [ctx]
 * @returns {{title:string, subtitle:string, tabs:Array}}
 */
export function buildDialogSpec(node, ctx = {}) {
    if (!node) throw new Error('buildDialogSpec requiere un nodo');
    const isGroup = node.kind === 'group';
    const style = node.style || {};
    const isPoint = ctx.geometryType === 'Point' || ctx.geometryType === 'MultiPoint' ||
                    /centro/i.test(node.id);
    const isLine = ctx.geometryType === 'LineString' || ctx.geometryType === 'MultiLineString' ||
                   ['vias', 'hidro'].includes(node.id);

    const tabs = [];

    // ── General ──────────────────────────────────────────────────────────────
    const generalFields = [
        { type: 'text', key: 'title', label: 'Nombre de la capa', value: node.title,
          hint: `Original: ${node.originalTitle}` }
    ];
    if (!isGroup) {
        generalFields.push(
            { type: 'toggle', key: 'visible', label: 'Capa visible', value: node.visible,
              hint: 'Equivale a la casilla del árbol de contenido' },
            { type: 'range', key: 'opacity', label: 'Opacidad', value: Math.round((node.opacity ?? 1) * 100),
              min: 0, max: 100, step: 5, suffix: '%' },
            { type: 'select', key: 'geometry', label: 'Tipo de geometría',
              value: geometryLabel(ctx.geometryType),
              options: [{ value: geometryLabel(ctx.geometryType), label: geometryLabel(ctx.geometryType) }],
              disabled: true,
              hint: 'Se detecta del archivo y no es editable' }
        );
    }
    tabs.push({ id: 'general', label: 'General', icon: 'fa-sliders', fields: generalFields });

    // ── Referencia catastral SNC: capa visual opcional + capa remota ─────────
    // Solo para la capa de referencia. Son dos controles INDEPENDIENTES:
    //   · la VISUAL es opcional: se dibuja como referencia de parcelas
    //   · la REMOTA (WMS) puede aparecer ENCIMA de los mapas base; apagada,
    //     solo se ve el mapa base
    // Por defecto ambas arrancan apagadas: la capa se muestra solo si se
    // activa, y no figura en la leyenda salvo que se lo indique.
    if (node.id === 'snc-ref' || node.kind === 'snc-ref') {
        const ref = node.sncRef || {};
        tabs.push({
            id: 'referencia', label: 'Referencia SNC', icon: 'fa-map-location-dot',
            fields: [
                { type: 'toggle', key: 'sncRef.visualEnabled', label: 'Referencia visual SNC',
                  value: ref.visualEnabled === true,
                  hint: 'Capa visual opcional del visor oficial. Se muestra solo si se activa.' },
                { type: 'toggle', key: 'sncRef.remotaEnabled', label: 'Activar capa remota (WMS)',
                  value: ref.remotaEnabled === true,
                  hint: 'Activada, puede aparecer encima de los otros mapas base. Si no se activa, se puede ver solo.' },
                { type: 'number', key: 'sncRef.remotaOpacity', label: 'Opacidad de la capa remota',
                  value: ref.remotaOpacity ?? 0.85, min: 0, max: 1, step: 0.05 },
                { type: 'toggle', key: 'sncRef.remotaInLegend', label: 'Mostrar la referencia en la leyenda',
                  value: ref.remotaInLegend === true,
                  hint: 'Por defecto la referencia NO figura en la leyenda: es una capa de fondo.' }
            ]
        });
    }

    if (!isGroup) {
        // ── Escala ───────────────────────────────────────────────────────────
        tabs.push({
            id: 'escala', label: 'Escala', icon: 'fa-magnifying-glass',
            fields: [
                { type: 'scale-range', key: 'scaleRange', label: 'Rango de escala visible',
                  minScale: node.minScale, maxScale: node.maxScale,
                  currentScale: ctx.currentScale ?? null,
                  hint: 'La capa se dibuja solo dentro de este rango. Fuera de él aparece atenuada.' },
                { type: 'presets', key: 'scalePresets', label: 'Presets',
                  presets: SCALE_PRESETS, current: { minScale: node.minScale, maxScale: node.maxScale } }
            ]
        });

        // ── Simbología ───────────────────────────────────────────────────────
        const isPolygon = !isPoint && !isLine;
        const symFields = [
            { type: 'color', key: 'style.color', label: isLine ? 'Color de línea' : 'Color de borde',
              value: normalizeColor(style.color) }
        ];
        // El relleno solo tiene sentido en polígonos.
        if (isPolygon) {
            symFields.push({ type: 'color', key: 'style.fillColor', label: 'Color de relleno',
                             value: normalizeColor(style.fillColor || style.color) });
            symFields.push({ type: 'range', key: 'style.fillOpacity', label: 'Opacidad del relleno',
                             value: Math.round((style.fillOpacity ?? 0.2) * 100), min: 0, max: 100, step: 5, suffix: '%' });
        }
        symFields.push({ type: 'range', key: 'style.weight', label: 'Grosor',
                         value: style.weight ?? 2, min: 0.5, max: 8, step: 0.5 });
        if (isPoint) {
            symFields.push({ type: 'range', key: 'style.radius', label: 'Radio del punto',
                             value: style.radius ?? 7, min: 2, max: 20, step: 1 });
        }
        symFields.push({ type: 'select', key: 'style.dashArray', label: 'Patrón de línea',
                         value: style.dashArray || 'solid',
                         options: LINE_PATTERNS.map(p => ({ value: p.dashArray || 'solid', label: p.label })) });
        tabs.push({ id: 'simbologia', label: 'Simbología', icon: 'fa-palette', fields: symFields });

        // ── Interacción ──────────────────────────────────────────────────────
        tabs.push({
            id: 'interaccion', label: 'Interacción', icon: 'fa-arrow-pointer',
            fields: [
                { type: 'toggle', key: 'selectable', label: 'Seleccionable con el puntero', value: node.selectable },
                { type: 'toggle', key: 'editable', label: 'Editable (requiere permisos de escritura)', value: node.editable },
                { type: 'toggle', key: 'snappable', label: 'Ajuste (snapping) al digitalizar', value: node.snappable },
                { type: 'toggle', key: 'labelEnabled', label: 'Etiquetado habilitado', value: node.labelEnabled },
                { type: 'toggle', key: 'legend.showInLegend', label: 'Mostrar en la leyenda', value: node.legend?.showInLegend },
                { type: 'toggle', key: 'legend.hideInLegend', label: 'Ocultar de la leyenda global', value: node.legend?.hideInLegend }
            ]
        });

        // ── Etiquetas (mostrar una columna de la tabla sobre el mapa) ────────
        // Ejemplo: capa Hidrografía → columna "nombre" → el nombre de cada
        // río aparece dibujado sobre el mapa, con el color de la capa.
        const labelCfg = LabelConfig.normalizeLabelConfig(node.labelConfig);
        const camposDisponibles = (ctx.properties?.length ? ctx.properties : []).map(p => ({
            value: p, label: p
        }));
        // Campos detectados en el archivo + los que ya estén configurados,
        // para no perder la selección si el archivo aún no se cargó.
        for (const extra of [labelCfg.field, node.popupInfo?.fields?.map(f => f.field)].flat().filter(Boolean)) {
            if (!camposDisponibles.some(c => c.value === extra)) {
                camposDisponibles.push({ value: extra, label: extra });
            }
        }
        const sinCampos = camposDisponibles.length === 0;

        const labelFields = [
            { type: 'toggle', key: 'labelConfig.enabled', label: 'Mostrar etiquetas en el mapa',
              value: labelCfg.enabled,
              hint: sinCampos
                  ? 'Active la capa una vez para que se detecten sus columnas.'
                  : 'Muestra el valor de una columna sobre cada geometría.' },
            { type: 'select', key: 'labelConfig.field', label: 'Columna a mostrar',
              value: labelCfg.field,
              options: [{ value: '', label: sinCampos ? '(sin columnas detectadas)' : '— Elegir columna —' }, ...camposDisponibles],
              hint: 'Es la columna de la tabla cuyo dato se dibuja sobre el mapa.' },
            { type: 'text', key: 'labelConfig.expression', label: 'Expresión (opcional)',
              value: labelCfg.expression,
              hint: 'Para combinar columnas: "{nombre} ({tipo})". Si se completa, manda sobre la columna.' },
            { type: 'color', key: 'labelConfig.color', label: 'Color del texto',
              value: labelCfg.color,
              hint: 'Se usa solo si desactiva "usar el color de la capa".' },
            { type: 'toggle', key: 'labelConfig.colorFromLayer', label: 'Usar el color de la capa',
              value: labelCfg.colorFromLayer,
              hint: 'Recomendado: mantiene la etiqueta igual que la simbología.' },
            { type: 'range', key: 'labelConfig.fontSize', label: 'Tamaño del texto',
              value: labelCfg.fontSize, min: 6, max: 32, step: 1, suffix: ' px' },
            { type: 'toggle', key: 'labelConfig.bold', label: 'Negrita', value: labelCfg.bold },
            { type: 'toggle', key: 'labelConfig.italic', label: 'Cursiva', value: labelCfg.italic },
            { type: 'toggle', key: 'labelConfig.haloEnabled', label: 'Halo de contraste',
              value: labelCfg.haloEnabled,
              hint: 'Contorno claro para que el texto se lea sobre el mapa.' },
            { type: 'color', key: 'labelConfig.haloColor', label: 'Color del halo', value: labelCfg.haloColor },
            { type: 'select', key: 'labelConfig.placement', label: 'Posición',
              value: labelCfg.placement, options: LabelConfig.PLACEMENTS },
            { type: 'toggle', key: 'labelConfig.boxEnabled', label: 'Caja de fondo',
              value: labelCfg.boxEnabled, hint: 'Recuadro detrás del texto, útil sobre ortofoto.' },
            { type: 'toggle', key: 'labelConfig.dedupe', label: 'No repetir textos iguales',
              value: labelCfg.dedupe, hint: 'Útil en capas con muchos polígonos contiguos.' }
        ];
        tabs.push({ id: 'etiquetas', label: 'Etiquetas', icon: 'fa-font', fields: labelFields });

        // ── Popup ────────────────────────────────────────────────────────────
        const props = ctx.properties?.length ? ctx.properties : [];
        tabs.push({
            id: 'popup', label: 'Popup', icon: 'fa-window-restore',
            fields: [
                { type: 'text', key: 'popup.title', label: 'Título del popup',
                  value: node.popupInfo?.title || (props[0] ? `{${props[0]}}` : '{NOMBRE}'),
                  hint: 'Usá {campo} para interpolar el valor del atributo' },
                { type: 'fields', key: 'popup.fields', label: 'Campos del popup',
                  value: buildPopupFields(node, props),
                  hint: 'Marcá los visibles, editá el alias y reordená con las flechas' }
            ]
        });

        // ── Tabla ────────────────────────────────────────────────────────────
        tabs.push({
            id: 'tabla', label: 'Tabla', icon: 'fa-table',
            fields: [
                { type: 'number', key: 'tableConfig.pageSize', label: 'Filas por página',
                  value: node.tableConfig?.pageSize ?? 50, min: 10, max: 1000, step: 10 },
                { type: 'select', key: 'tableConfig.sortOrder', label: 'Orden por defecto',
                  value: node.tableConfig?.sortOrder || 'ASC',
                  options: [{ value: 'ASC', label: 'Ascendente' }, { value: 'DESC', label: 'Descendente' }] },
                { type: 'number', key: 'tableConfig.sortField', label: 'Campo de orden',
                  value: node.tableConfig?.sortField || '', text: true,
                  hint: 'Nombre del campo. Vacío = orden original del archivo.' }
            ]
        });

        // ── Detalles ─────────────────────────────────────────────────────────
        tabs.push({
            id: 'detalles', label: 'Detalles', icon: 'fa-circle-info',
            fields: [
                { type: 'readonly', label: 'Identificador', value: node.id },
                { type: 'readonly', label: 'Nombre original', value: node.originalTitle },
                { type: 'readonly', label: 'Origen', value: node.sourcePath || node.sourceType || '—' },
                { type: 'readonly', label: 'Tipo de origen', value: node.sourceType || '—' },
                { type: 'readonly', label: 'Geometría', value: geometryLabel(ctx.geometryType) },
                { type: 'readonly', label: 'Entidades', value: String(node.featureCount ?? '—') },
                { type: 'readonly', label: 'Estado', value: {
                    active: 'Activo', inactive: 'Inactivo', disabled: 'Fuera de rango de escala'
                }[LayerManager.visualState(node.id)] || '—' },
                { type: 'readonly', label: 'Escala actual del visor',
                  value: ctx.currentScale ? formatScale(Math.round(ctx.currentScale)) : '—' }
            ]
        });
    }

    return {
        title: isGroup ? 'Propiedades de grupo' : 'Propiedades de capa',
        subtitle: `${node.title}${node.sourcePath ? ' — ' + node.sourcePath : ''}`,
        tabs
    };
}

/** Combina los campos declarados en popupInfo con los reales del archivo. */
function buildPopupFields(node, props) {
    const declared = node.popupInfo?.fields || [];
    const known = new Map(declared.map(f => [f.fieldName, f]));
    // Primero los declarados (respetando su orden), luego los nuevos del archivo.
    const ordered = [
        ...declared.map(f => ({ fieldName: f.fieldName, label: f.label || f.fieldName, visible: f.visible !== false })),
        ...props.filter(p => !known.has(p)).map(p => ({ fieldName: p, label: p, visible: true }))
    ];
    if (!ordered.length) {
        return ['NOMBRE', 'TIPO', 'AREA', 'BUFF_DIST', 'X', 'Y'].map(f => ({ fieldName: f, label: f, visible: true }));
    }
    return ordered;
}

// ─── Aplicación de valores (puro salvo por los hooks) ─────────────────────────
/**
 * Aplica los valores recolectados del diálogo al LayerManager y al mapa.
 *
 * @param {object} node
 * @param {object} values Mapa plano { 'style.color': '#fff', title: 'x', ... }
 * @param {{onStyleChange?:(id:string,style:object)=>void, onVisibilityChange?:(id:string,v:boolean)=>void}} [hooks]
 * @returns {{ok:boolean, error?:string, changed:string[]}}
 */
export function applyDialogValues(node, values, hooks = {}) {
    if (!node) return { ok: false, error: 'Capa inexistente', changed: [] };
    const changed = [];

    // Validar escala antes de tocar nada.
    if ('scaleRange' in values) {
        const { minScale, maxScale, error } = parseScaleRange(values.scaleRange);
        if (error) return { ok: false, error, changed: [] };
        if (node.minScale !== minScale || node.maxScale !== maxScale) {
            LayerManager.setScaleRange(node.id, { minScale, maxScale });
            changed.push('escala');
        }
    }

    if ('title' in values) {
        const t = String(values.title || '').trim();
        if (t && t !== node.title) { LayerManager.rename(node.id, t); changed.push('nombre'); }
        else if (!t) { LayerManager.resetTitle(node.id); changed.push('nombre'); }
    }

    if ('opacity' in values) {
        const v = Number(values.opacity) / 100;
        if (Number.isFinite(v) && Math.abs(v - node.opacity) > 0.001) {
            LayerManager.setOpacity(node.id, v); changed.push('opacidad');
        }
    }

    if ('visible' in values) {
        const v = values.visible === true || values.visible === 'true';
        if (v !== node.visible) {
            LayerManager.setVisible(node.id, v);
            hooks.onVisibilityChange?.(node.id, v);
            changed.push('visibilidad');
        }
    }

    for (const cap of ['selectable', 'editable', 'snappable', 'labelEnabled']) {
        if (cap in values) {
            const v = values[cap] === true || values[cap] === 'true';
            if (v !== node[cap]) { LayerManager.setCapability(node.id, cap, v); changed.push(cap); }
        }
    }

    for (const leg of ['legend.showInLegend', 'legend.hideInLegend']) {
        if (leg in values) {
            const key = leg.split('.')[1];
            const v = values[leg] === true || values[leg] === 'true';
            if (node.legend[key] !== v) { node.legend[key] = v; changed.push('leyenda'); }
        }
    }

    // Simbología
    const stylePatch = {};
    for (const [k, v] of Object.entries(values)) {
        if (!k.startsWith('style.')) continue;
        const prop = k.slice(6);
        let val = v;
        if (prop === 'weight' || prop === 'radius') val = Number(v);
        if (prop === 'fillOpacity') val = Number(v) / 100;
        if (prop === 'dashArray' && v === 'solid') val = null;
        stylePatch[prop] = val;
    }
    if (Object.keys(stylePatch).length) {
        const merged = { ...(node.style || {}), ...stylePatch };
        node.style = merged;
        hooks.onStyleChange?.(node.id, merged);
        changed.push('simbología');
    }

    // Popup
    if ('popup.title' in values || 'popup.fields' in values) {
        LayerManager.setPopupConfig(node.id, {
            title: values['popup.title'] ?? node.popupInfo?.title ?? '',
            fields: values['popup.fields'] ?? node.popupInfo?.fields ?? []
        });
        changed.push('popup');
    }

    // Referencia SNC: visual opcional + capa remota, por separado.
    const sncRefPatch = {};
    for (const [k, v] of Object.entries(values)) {
        if (!k.startsWith('sncRef.')) continue;
        const prop = k.slice('sncRef.'.length);
        sncRefPatch[prop] = prop === 'remotaOpacity' ? Number(v) : (v === true || v === 'true');
    }
    if (Object.keys(sncRefPatch).length) {
        node.sncRef = { ...(node.sncRef || {}), ...sncRefPatch };
        hooks.onSNCRefChange?.(node.id, node.sncRef);
        changed.push('referencia SNC');
    }

    // Etiquetas (mostrar una columna de la tabla sobre el mapa)
    const labelPatch = {};
    for (const [k, v] of Object.entries(values)) {
        if (!k.startsWith('labelConfig.')) continue;
        labelPatch[k.slice('labelConfig.'.length)] = v;
    }
    if (Object.keys(labelPatch).length) {
        const merged = LabelConfig.normalizeLabelConfig({ ...(node.labelConfig || {}), ...labelPatch });
        node.labelConfig = merged;
        hooks.onLabelChange?.(node.id, merged);
        changed.push('etiquetas');
    }

    // Tabla
    const tablePatch = {};
    if ('tableConfig.pageSize' in values) tablePatch.pageSize = Number(values['tableConfig.pageSize']);
    if ('tableConfig.sortOrder' in values) tablePatch.sortOrder = values['tableConfig.sortOrder'];
    if ('tableConfig.sortField' in values) tablePatch.sortField = String(values['tableConfig.sortField'] || '').trim() || null;
    if (Object.keys(tablePatch).length) { LayerManager.setTableConfig(node.id, tablePatch); changed.push('tabla'); }

    if (changed.length) LayerManager._emit('change', { type: 'dialog-apply', id: node.id });
    return { ok: true, changed };
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
let dlgEl = null;
let lastFocus = null;

export function isDialogOpen() { return !!dlgEl; }

export function closeDialog() {
    if (!dlgEl) return;
    dlgEl._cleanup?.();
    dlgEl.remove();
    dlgEl = null;
    lastFocus?.focus?.();
    lastFocus = null;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/** Renderiza un campo según su tipo. La geometría vive en CSS estático. */
function renderField(f) {
    const id = 'lpd-' + Math.random().toString(36).slice(2, 9);
    const hint = f.hint ? `<p class="lp-dlg-hint">${esc(f.hint)}</p>` : '';

    switch (f.type) {
        case 'text':
            return `<div class="lp-dlg-field">
                <label for="${id}">${esc(f.label)}</label>
                <input id="${id}" type="text" class="lp-dlg-input" data-key="${esc(f.key)}" value="${esc(f.value ?? '')}">
                ${hint}</div>`;

        case 'number':
            return `<div class="lp-dlg-field">
                <label for="${id}">${esc(f.label)}</label>
                <input id="${id}" type="${f.text ? 'text' : 'number'}" class="lp-dlg-input" data-key="${esc(f.key)}"
                       value="${esc(f.value ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}
                       ${f.step != null ? `step="${f.step}"` : ''}>
                ${hint}</div>`;

        case 'toggle':
            return `<label class="lp-dlg-toggle">
                <input type="checkbox" data-key="${esc(f.key)}" ${f.value ? 'checked' : ''}>
                <span>${esc(f.label)}</span>
                ${f.hint ? `<span class="lp-dlg-hint-inline">${esc(f.hint)}</span>` : ''}
            </label>`;

        case 'range':
            return `<div class="lp-dlg-field">
                <label>${esc(f.label)} <output class="lp-dlg-out" data-out-for="${esc(f.key)}">${esc(f.value)}${esc(f.suffix || '')}</output></label>
                <input type="range" class="lp-dlg-range" data-key="${esc(f.key)}"
                       value="${esc(f.value)}" min="${f.min}" max="${f.max}" step="${f.step}">
                ${hint}</div>`;

        case 'color':
            return `<div class="lp-dlg-field lp-dlg-inline">
                <label for="${id}">${esc(f.label)}</label>
                <input id="${id}" type="color" class="lp-dlg-color" data-key="${esc(f.key)}" value="${esc(f.value)}">
                <span class="lp-dlg-colorval" data-colorval-for="${esc(f.key)}">${esc(f.value)}</span>
                ${hint}</div>`;

        case 'select':
            return `<div class="lp-dlg-field">
                <label for="${id}">${esc(f.label)}</label>
                <select id="${id}" class="lp-dlg-select" data-key="${esc(f.key)}" ${f.disabled ? 'disabled' : ''}>
                    ${(f.options || []).map(o =>
                        `<option value="${esc(o.value)}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${esc(o.label)}</option>`
                    ).join('')}
                </select>${hint}</div>`;

        case 'readonly':
            return `<div class="lp-dlg-ro"><span>${esc(f.label)}</span><b>${esc(f.value)}</b></div>`;

        case 'scale-range':
            return `<div class="lp-dlg-field">
                <label for="${id}">${esc(f.label)}</label>
                <input id="${id}" type="text" class="lp-dlg-input" data-key="scaleRange"
                       placeholder="50000-500  (vacío = sin límite)"
                       value="${f.minScale != null || f.maxScale != null ? `${f.minScale ?? ''}-${f.maxScale ?? ''}` : ''}">
                <div class="lp-dlg-scaleref">
                    <span>Actual: <b>${f.currentScale ? formatScale(Math.round(f.currentScale)) : '—'}</b></span>
                    <button type="button" class="lp-dlg-mini" data-act="use-current-min">Usar como mínima</button>
                    <button type="button" class="lp-dlg-mini" data-act="use-current-max">Usar como máxima</button>
                </div>
                <p class="lp-dlg-error" data-error-for="scaleRange" hidden></p>
                ${hint}</div>`;

        case 'presets':
            return `<div class="lp-dlg-field">
                <label>${esc(f.label)}</label>
                <div class="lp-dlg-presets">
                    ${(f.presets || []).map(p =>
                        `<button type="button" class="lp-dlg-preset" data-act="preset"
                                 data-min="${p.minScale ?? ''}" data-max="${p.maxScale ?? ''}">${esc(p.label)}</button>`
                    ).join('')}
                </div></div>`;

        case 'fields':
            return `<div class="lp-dlg-field">
                <label>${esc(f.label)}</label>
                <div class="lp-dlg-fields" data-key="popup.fields">
                    ${(f.value || []).map((fl, i) => `
                        <div class="lp-dlg-frow" data-idx="${i}">
                            <input type="checkbox" class="lp-dlg-fvis" ${fl.visible ? 'checked' : ''} aria-label="Visible">
                            <input type="text" class="lp-dlg-falias" value="${esc(fl.label)}" aria-label="Alias">
                            <code class="lp-dlg-fname">${esc(fl.fieldName)}</code>
                            <button type="button" class="lp-dlg-mini" data-act="fup" aria-label="Subir">▲</button>
                            <button type="button" class="lp-dlg-mini" data-act="fdown" aria-label="Bajar">▼</button>
                        </div>`).join('')}
                </div>${hint}</div>`;

        default:
            return '';
    }
}

/** Recolecta los valores del formulario. */
function collectValues(root) {
    const values = {};
    root.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        if (el.type === 'checkbox') values[key] = el.checked;
        else if (el.tagName === 'SELECT') values[key] = el.value;
        else values[key] = el.value;
    });
    // Campos del popup: se arman desde las filas.
    const fbox = root.querySelector('[data-key="popup.fields"]');
    if (fbox) {
        values['popup.fields'] = [...fbox.querySelectorAll('.lp-dlg-frow')].map(r => ({
            fieldName: r.querySelector('.lp-dlg-fname').textContent,
            label: r.querySelector('.lp-dlg-falias').value || r.querySelector('.lp-dlg-fname').textContent,
            visible: r.querySelector('.lp-dlg-fvis').checked
        }));
    }
    return values;
}

/**
 * Abre el panel de propiedades de una capa.
 *
 * @param {object} node
 * @param {{currentScale?:number, properties?:string[], geometryType?:string,
 *          onStyleChange?:Function, onVisibilityChange?:Function,
 *          onOpenTable?:Function, onZoom?:Function}} [ctx]
 */
export function openLayerDialog(node, ctx = {}) {
    closeDialog();
    const spec = buildDialogSpec(node, ctx);

    lastFocus = document.activeElement;
    dlgEl = document.createElement('div');
    dlgEl.id = 'lp-dlg-overlay';
    dlgEl.innerHTML = `
      <div class="lp-dlg" role="dialog" aria-modal="true" aria-labelledby="lp-dlg-title">
        <header class="lp-dlg-head">
          <div class="lp-dlg-headtext">
            <h2 id="lp-dlg-title">${esc(spec.title)}</h2>
            <p class="lp-dlg-sub" title="${esc(spec.subtitle)}">${esc(spec.subtitle)}</p>
          </div>
          <button type="button" class="lp-dlg-x" data-act="close" aria-label="Cerrar">✕</button>
        </header>
        <nav class="lp-dlg-tabs" role="tablist">
          ${spec.tabs.map((t, i) => `
            <button type="button" role="tab" class="lp-dlg-tab ${i === 0 ? 'is-active' : ''}"
                    data-tab="${t.id}" aria-selected="${i === 0}">
              <i class="fas ${t.icon}"></i><span>${esc(t.label)}</span>
            </button>`).join('')}
        </nav>
        <div class="lp-dlg-body">
          ${spec.tabs.map((t, i) => `
            <section class="lp-dlg-pane ${i === 0 ? 'is-active' : ''}" data-pane="${t.id}" role="tabpanel">
              ${t.fields.map(renderField).join('')}
            </section>`).join('')}
        </div>
        <footer class="lp-dlg-foot">
          <span class="lp-dlg-msg" data-msg hidden></span>
          <div class="lp-dlg-actions">
            <button type="button" class="lp-dlg-btn" data-act="cancel">Cancelar</button>
            <button type="button" class="lp-dlg-btn primary" data-act="apply">Aplicar</button>
          </div>
        </footer>
      </div>`;
    document.body.appendChild(dlgEl);

    const showMsg = (text, kind = 'error') => {
        const m = dlgEl.querySelector('[data-msg]');
        m.textContent = text;
        m.className = `lp-dlg-msg is-${kind}`;
        m.hidden = false;
    };

    // Pestañas
    dlgEl.querySelectorAll('.lp-dlg-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            dlgEl.querySelectorAll('.lp-dlg-tab').forEach(t => {
                const on = t === tab;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', String(on));
            });
            dlgEl.querySelectorAll('.lp-dlg-pane').forEach(p => {
                p.classList.toggle('is-active', p.dataset.pane === tab.dataset.tab);
            });
        });
    });

    // Salidas en vivo para los sliders y colores
    dlgEl.querySelectorAll('.lp-dlg-range').forEach(r => {
        r.addEventListener('input', () => {
            const out = dlgEl.querySelector(`[data-out-for="${r.dataset.key}"]`);
            if (out) out.textContent = r.value + (r.dataset.suffix || '%');
        });
    });
    dlgEl.querySelectorAll('.lp-dlg-color').forEach(c => {
        c.addEventListener('input', () => {
            const v = dlgEl.querySelector(`[data-colorval-for="${c.dataset.key}"]`);
            if (v) v.textContent = c.value;
        });
    });

    // Acciones internas (presets, usar escala actual, reordenar campos)
    dlgEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const scaleInput = dlgEl.querySelector('[data-key="scaleRange"]');

        if (act === 'preset') {
            const mn = btn.dataset.min, mx = btn.dataset.max;
            scaleInput.value = (mn || mx) ? `${mn}-${mx}` : '';
            dlgEl.querySelector('[data-error-for="scaleRange"]').hidden = true;
            return;
        }
        if (act === 'use-current-min' || act === 'use-current-max') {
            if (!ctx.currentScale) return;
            const v = Math.round(ctx.currentScale);
            const [a, b] = String(scaleInput.value).split('-');
            scaleInput.value = act === 'use-current-min'
                ? `${v}-${(b || '').trim()}`
                : `${(a || '').trim()}-${v}`;
            return;
        }
        if (act === 'fup' || act === 'fdown') {
            const row = btn.closest('.lp-dlg-frow');
            const box = row.parentElement;
            if (act === 'fup' && row.previousElementSibling) box.insertBefore(row, row.previousElementSibling);
            if (act === 'fdown' && row.nextElementSibling) box.insertBefore(row.nextElementSibling, row);
            return;
        }
        if (act === 'close' || act === 'cancel') { closeDialog(); return; }
        if (act === 'apply') {
            const values = collectValues(dlgEl);
            const res = applyDialogValues(node, values, ctx);
            if (!res.ok) {
                // Mostrar el error en su campo y saltar a esa pestaña.
                const box = dlgEl.querySelector('[data-error-for="scaleRange"]');
                if (box) {
                    box.textContent = res.error;
                    box.hidden = false;
                    dlgEl.querySelector('.lp-dlg-tab[data-tab="escala"]')?.click();
                } else {
                    showMsg(res.error);
                }
                return;
            }
            closeDialog();
            ctx.onApplied?.(node.id, res.changed);
        }
    });

    // Escape cierra; Tab queda atrapado dentro del diálogo.
    const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
        if (e.key === 'Tab') {
            const f = [...dlgEl.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')]
                .filter(el => !el.disabled && el.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    document.addEventListener('keydown', onKey);
    dlgEl._cleanup = () => document.removeEventListener('keydown', onKey);

    // Clic en el fondo cierra.
    dlgEl.addEventListener('mousedown', (e) => { if (e.target === dlgEl) closeDialog(); });

    dlgEl.querySelector('.lp-dlg-input')?.focus();
}

export default { openLayerDialog, closeDialog, isDialogOpen, buildDialogSpec, parseScaleRange, validateScaleRange, formatScaleRange };
