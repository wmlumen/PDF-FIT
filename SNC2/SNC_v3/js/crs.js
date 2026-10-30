/**
 * Motor de Sistemas de Referencia de Coordenadas (CRS) para SNC_v3.
 *
 * Responsabilidades:
 * - Definir las proyecciones soportadas (geográficas y UTM de Paraguay).
 * - Detectar automáticamente el CRS real de un FeatureCollection entrante.
 * - Reproyectar geometrías entre CRS con precisión (proj4js).
 * - Reportar diagnósticos para que la UI muestre el estado por capa.
 *
 * Convención interna: TODO el mapa y el estado de la app trabajan en
 * EPSG:4326 (lon, lat) porque Leaflet consume grados. La reproyección se
 * aplica al INGRESAR datos y al EXPORTAR, nunca en el render.
 *
 * Nota sobre zona UTM: la zona NO se puede deducir del par (easting, northing)
 * por sí solo. Se resuelve por evidencia en este orden:
 *   1) campo `crs` del GeoJSON
 *   2) atributos por feature (ZONA / ZONA_UTM / EPSG / CRS)
 *   3) prueba de hipótesis: se reproyecta con cada zona candidata y se cuenta
 *      cuántos vértices caen dentro del territorio paraguayo; gana la que más
 *      aciertos tenga con margen suficiente sobre la siguiente.
 */

import { PROJ_32720, PROJ_32721 } from './config.js';

// ─── Definiciones de CRS soportados ──────────────────────────────────────────
// EPSG:31981..31985 = SIRGAS 2000 / UTM (equivalente práctico a WGS84 UTM en
// Paraguay; difieren < 1 m, dentro de tolerancia catastral).
export const CRS_DEFS = {
    'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs',
    'EPSG:4258': '+proj=longlat +ellps=GRS80 +no_defs',
    'EPSG:4269': '+proj=longlat +datum=NAD83 +no_defs',
    'EPSG:32720': '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs',
    'EPSG:32721': '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs',
    'EPSG:32722': '+proj=utm +zone=22 +south +datum=WGS84 +units=m +no_defs',
    'EPSG:31980': '+proj=utm +zone=20 +south +ellps=GRS80 +units=m +no_defs',
    'EPSG:31981': '+proj=utm +zone=21 +south +ellps=GRS80 +units=m +no_defs',
    'EPSG:31982': '+proj=utm +zone=22 +south +ellps=GRS80 +units=m +no_defs',
    // Argentina/Paraguay POSGAR 94 (aún presente en relevamientos antiguos)
    'EPSG:22195': '+proj=utm +zone=21 +south +ellps=GRS80 +units=m +no_defs',
    'EPSG:22196': '+proj=utm +zone=22 +south +ellps=GRS80 +units=m +no_defs'
};

// WKT para el archivo .prj de shapefiles exportados.
export const CRS_WKT = {
    'EPSG:4326': 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
    'EPSG:32721': 'PROJCS["WGS_1984_UTM_Zone_21S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-57.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
    'EPSG:32720': 'PROJCS["WGS_1984_UTM_Zone_20S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-63.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]'
};

// Etiquetas legibles para la UI.
export const CRS_LABELS = {
    'EPSG:4326': 'Geográfico WGS84 (grados)',
    'EPSG:4258': 'Geográfico ETRS89 (grados)',
    'EPSG:4269': 'Geográfico NAD83 (grados)',
    'EPSG:32720': 'UTM 20S WGS84 (metros)',
    'EPSG:32721': 'UTM 21S WGS84 (metros)',
    'EPSG:32722': 'UTM 22S WGS84 (metros)',
    'EPSG:31980': 'UTM 20S SIRGAS2000 (metros)',
    'EPSG:31981': 'UTM 21S SIRGAS2000 (metros)',
    'EPSG:31982': 'UTM 22S SIRGAS2000 (metros)',
    'EPSG:22195': 'UTM 21S POSGAR94 (metros)',
    'EPSG:22196': 'UTM 22S POSGAR94 (metros)'
};

// CRS de destino ofrecidos al exportar.
export const EXPORT_CRS = ['EPSG:4326', 'EPSG:32721', 'EPSG:32720'];

// Códigos que representan datos en grados.
const GEOGRAPHIC_CODES = new Set(['EPSG:4326', 'EPSG:4258', 'EPSG:4269']);
const UTM_ZONE_BY_CRS = {
    'EPSG:32720': 20, 'EPSG:32721': 21, 'EPSG:32722': 22,
    'EPSG:31980': 20, 'EPSG:31981': 21, 'EPSG:31982': 22,
    'EPSG:22195': 21, 'EPSG:22196': 22
};
// CRS que corresponden a cada zona, en orden de preferencia (WGS84 primero).
const CRS_BY_ZONE = { 20: 'EPSG:32720', 21: 'EPSG:32721', 22: 'EPSG:32722' };

// ─── Territorio paraguayo ────────────────────────────────────────────────────
// Bbox envolvente: se usa solo para descartes rápidos y para el mapa.
export const PY_BBOX = { minLon: -62.8, maxLon: -54.0, minLat: -27.8, maxLat: -19.0 };

// Contorno simplificado de Paraguay (sentido horario, ~30 vértices).
// CRÍTICO: un rectángulo NO sirve para discriminar zona UTM 20 vs 21, porque
// el oeste de Brasil y el este de Paraguay caen dentro del mismo rango de
// longitud. Leer un punto del Chaco (zona 20) como zona 21 lo desplaza
// exactamente 6° al este, a -54.5 (Mato Grosso do Sul, Brasil) — que un
// rectángulo acepta como válido. El polígono rechaza ese falso positivo.
const PY_OUTLINE = [
    [-62.65, -19.30], [-60.00, -19.30], [-58.20, -19.90], [-57.85, -20.16],
    [-57.90, -21.00], [-57.60, -22.20], [-55.50, -22.30], [-55.20, -22.70],
    [-54.60, -23.90], [-54.30, -24.05], [-54.60, -24.95], [-54.55, -25.60],
    [-54.30, -25.65], [-54.60, -26.20], [-54.90, -26.50], [-55.40, -26.90],
    [-55.55, -27.35], [-56.00, -27.50], [-56.60, -27.58], [-57.10, -27.62],
    [-58.20, -27.20], [-58.65, -27.05], [-59.50, -27.40], [-60.00, -27.10],
    [-61.00, -26.90], [-61.70, -26.20], [-62.00, -25.50], [-62.60, -25.00],
    [-62.30, -24.00], [-62.50, -23.00], [-62.80, -22.00], [-62.65, -21.00],
    [-62.30, -20.20]
];

// El contorno se "infla" radialmente 0.12° desde su centroide para absorber
// errores de digitalización y puntos costeros legítimos (p. ej. Bahía Negra,
// que el trazado simplificado deja fuera por unos kilómetros).
const PY_POLYGON = (() => {
    const n = PY_OUTLINE.length;
    const cx = PY_OUTLINE.reduce((s, p) => s + p[0], 0) / n;
    const cy = PY_OUTLINE.reduce((s, p) => s + p[1], 0) / n;
    const pad = 0.12;
    return PY_OUTLINE.map(([x, y]) => {
        const dx = x - cx, dy = y - cy;
        const d = Math.hypot(dx, dy) || 1;
        return [x + (dx / d) * pad, y + (dy / d) * pad];
    });
})();

/**
 * Prueba punto-en-polígono (ray casting) sobre el contorno de Paraguay.
 * @returns {boolean}
 */
export function isInsideParaguay(lon, lat) {
    // Descarte rápido por bbox antes del test completo.
    if (lon < PY_BBOX.minLon - 1 || lon > PY_BBOX.maxLon + 1 ||
        lat < PY_BBOX.minLat - 1 || lat > PY_BBOX.maxLat + 1) return false;
    let inside = false;
    const poly = PY_POLYGON;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if ((yi > lat) !== (yj > lat)) {
            const xInt = xi + ((lat - yi) * (xj - xi)) / (yj - yi);
            if (lon < xInt) inside = !inside;
        }
    }
    return inside;
}

// Zonas UTM candidatas para Paraguay (Oriental = 21, Chaco occidental = 20).
const CANDIDATE_ZONES = [21, 20, 22];

// ─── Acceso a proj4 tolerante (global en navegador, require en Node) ─────────
function getProj4() {
    if (typeof proj4 !== 'undefined' && proj4) return proj4;
    if (typeof globalThis !== 'undefined' && globalThis.proj4) return globalThis.proj4;
    return null;
}

/**
 * Registra las definiciones en proj4js (idempotente).
 * @returns {boolean} true si proj4 quedó disponible.
 */
export function initCrs() {
    const p = getProj4();
    if (!p) return false;
    for (const [code, def] of Object.entries(CRS_DEFS)) {
        try { p.defs(code, def); } catch { /* ya definido */ }
    }
    return true;
}

/**
 * Devuelve la definición proj4 de un código, registrándola si hace falta.
 */
export function projDef(code) {
    if (CRS_DEFS[code]) return CRS_DEFS[code];
    throw new Error(`CRS no soportado: ${code}`);
}

export function isGeographic(code) {
    return GEOGRAPHIC_CODES.has(code);
}

export function zoneOf(code) {
    return UTM_ZONE_BY_CRS[code] ?? null;
}

export function labelOf(code) {
    return CRS_LABELS[code] || code;
}

// ─── Recorrido de coordenadas ────────────────────────────────────────────────
/**
 * Itera todos los pares (x, y) de una geometría GeoJSON.
 * @param {object} geometry
 * @param {(x:number, y:number) => void} fn
 */
export function forEachCoord(geometry, fn) {
    if (!geometry || !geometry.coordinates) return;
    const walk = (c) => {
        if (!Array.isArray(c)) return;
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            fn(c[0], c[1]);
            return;
        }
        for (const sub of c) walk(sub);
    };
    walk(geometry.coordinates);
}

/**
 * Devuelve la envolvente [minX, minY, maxX, maxY] de un FeatureCollection.
 * @returns {number[]|null} null si no hay coordenadas numéricas.
 */
export function bboxOf(fc) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;
    const feats = (fc && fc.features) || [];
    for (const f of feats) {
        forEachCoord(f && f.geometry, (x, y) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            n++;
        });
    }
    return n ? [minX, minY, maxX, maxY] : null;
}

/**
 * Muestra hasta `limit` vértices para análisis sin recorrer todo el dataset.
 */
function sampleCoords(fc, limit = 400) {
    const out = [];
    const feats = (fc && fc.features) || [];
    for (const f of feats) {
        if (out.length >= limit) break;
        forEachCoord(f && f.geometry, (x, y) => {
            if (out.length < limit && Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
        });
    }
    return out;
}

// ─── Detección de CRS ────────────────────────────────────────────────────────
/**
 * Normaliza un código EPSG escrito de cualquier forma ("32721", "EPSG:32721",
 * "urn:ogc:def:crs:EPSG::32721") a la forma canónica "EPSG:32721".
 */
export function normalizeEpsg(raw) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().toUpperCase();
    if (!s) return null;
    const m = s.match(/(\d{4,5})\s*$/);
    if (!m) return null;
    const code = `EPSG:${m[1]}`;
    return CRS_DEFS[code] ? code : null;
}

/**
 * Busca pistas de CRS en los metadatos y atributos del FeatureCollection.
 * @returns {string|null} código canónico o null.
 */
function explicitCrsBlock(fc) {
    const crs = fc && fc.crs;
    return !!(crs && (normalizeEpsg(crs.properties && crs.properties.name) || normalizeEpsg(crs.properties && crs.properties.href) || normalizeEpsg(crs.name)));
}

function crsFromMetadata(fc) {
    // 1) Bloque `crs` estilo GeoJSON 2008.
    const crs = fc && fc.crs;
    if (crs) {
        const direct = normalizeEpsg(crs.properties && crs.properties.name) ||
                       normalizeEpsg(crs.properties && crs.properties.href) ||
                       normalizeEpsg(crs.name);
        if (direct) return direct;
    }
    // 2) Atributos de las primeras features.
    const feats = (fc && fc.features) || [];
    for (let i = 0; i < Math.min(feats.length, 20); i++) {
        const p = feats[i] && feats[i].properties;
        if (!p) continue;
        for (const key of ['EPSG', 'epsg', 'CRS', 'crs', 'SRC', 'src', 'SISTEMA', 'sistema']) {
            const found = normalizeEpsg(p[key]);
            if (found) return found;
        }
        // Pista de zona sin código completo.
        for (const key of ['ZONA', 'zona', 'ZONA_UTM', 'UTM_ZONE']) {
            const v = p[key];
            if (v === undefined || v === null) continue;
            const z = parseInt(String(v).replace(/\D/g, ''), 10);
            if (z === 20 || z === 21 || z === 22) return CRS_BY_ZONE[z];
        }
    }
    return null;
}

/**
 * Heurística sobre el rango de coordenadas cuando no hay metadatos.
 * @returns {{code:string, reason:string}|null}
 */
function crsFromRange(fc) {
    const bb = bboxOf(fc);
    if (!bb) return null;
    const [minX, minY, maxX, maxY] = bb;

    // Grados: ambos ejes dentro de rangos angulares.
    const looksGeographic = Math.abs(minX) <= 180 && Math.abs(maxX) <= 180 &&
                            Math.abs(minY) <= 90 && Math.abs(maxY) <= 90;
    if (looksGeographic) {
        // ¿Cae realmente en Paraguay? Si sí, es la respuesta directa.
        const inPy = isInsideParaguay(minX, minY) || isInsideParaguay(maxX, maxY) ||
                     isInsideParaguay((minX + maxX) / 2, (minY + maxY) / 2);
        return { code: 'EPSG:4326', reason: inPy ? 'coordenadas en grados dentro de Paraguay' : 'coordenadas en grados' };
    }

    // Metros: rango compatible con UTM.
    const looksUtm = minX >= 100000 && maxX <= 900000 && minY >= 0 && maxY <= 10000000;
    if (looksUtm) {
        return { code: null, reason: 'coordenadas en metros (UTM) — se requiere resolver la zona' };
    }

    return { code: null, reason: 'rango de coordenadas no reconocido' };
}

/**
 * Cuenta cuántos vértices muestreados caen dentro del territorio paraguayo
 * tras reproyectar con una zona UTM dada. Se usa para elegir la zona correcta.
 */
function scoreZone(sample, zone) {
    const p = getProj4();
    if (!p) return 0;
    const def = `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
    let hits = 0;
    for (const [x, y] of sample) {
        try {
            const [lon, lat] = p(def, 'WGS84', [x, y]);
            if (isInsideParaguay(lon, lat)) hits++;
        } catch { /* vértice fuera de dominio */ }
    }
    return hits;
}

/**
 * Detecta el CRS de un FeatureCollection.
 *
 * @param {object} fc FeatureCollection.
 * @returns {{
 *   code: string|null,        // CRS detectado (null si indeterminado)
 *   confidence: number,       // 0..1
 *   source: string,           // 'metadata' | 'range' | 'zone-probe' | 'none'
 *   reason: string,           // explicación legible
 *   zone: number|null,        // zona UTM si aplica
 *   candidates: Array<{zone:number, hits:number}> // evidencia de la prueba
 * }}
 */
export function detectCRS(fc) {
    // 1) Metadatos explícitos: máxima confianza.
    const meta = crsFromMetadata(fc);
    // Una pista sacada de los ATRIBUTOS (p. ej. ZONA = 21) no puede contradecir coordenadas que ya están en
    // grados: en catastro "ZONA" es la zona catastral, no la UTM, y un GeoJSON ya reproyectado a WGS84 la
    // conserva. Sin esta guarda se reproyectaba dos veces y las parcelas colapsaban cerca del polo sur.
    if (meta && !explicitCrsBlock(fc) && meta !== 'EPSG:4326') {
        const range = crsFromRange(fc);
        if (range && range.code === 'EPSG:4326') {
            return {
                code: 'EPSG:4326', confidence: 0.9, source: 'range',
                reason: `${range.reason} (se ignora la pista ${meta} de los atributos: las coordenadas ya están en grados)`,
                zone: null, candidates: []
            };
        }
    }
    if (meta) {
        return {
            code: meta, confidence: 1, source: 'metadata',
            reason: 'CRS declarado en metadatos/atributos', zone: zoneOf(meta), candidates: []
        };
    }

    // 2) Rango de coordenadas.
    const range = crsFromRange(fc);
    if (range && range.code) {
        return {
            code: range.code, confidence: 0.9, source: 'range',
            reason: range.reason, zone: null, candidates: []
        };
    }

    // 3) Coordenadas en metros: resolver la zona por prueba de hipótesis.
    const sample = sampleCoords(fc, 400);
    if (!sample.length) {
        return { code: null, confidence: 0, source: 'none', reason: 'sin coordenadas numéricas', zone: null, candidates: [] };
    }
    const candidates = CANDIDATE_ZONES.map(z => ({ zone: z, hits: scoreZone(sample, z) }))
                                     .sort((a, b) => b.hits - a.hits);
    const best = candidates[0];
    const second = candidates[1] || { hits: 0 };
    const total = sample.length;

    // Exigimos mayoría clara y ventaja sobre la alternativa.
    const strong = best.hits / total >= 0.6 && best.hits > second.hits;
    if (strong) {
        const code = CRS_BY_ZONE[best.zone];
        return {
            code, confidence: best.hits / total, source: 'zone-probe',
            reason: `${best.hits}/${total} vértices caen en Paraguay con zona ${best.zone}S`,
            zone: best.zone, candidates
        };
    }

    return {
        code: null, confidence: 0, source: 'none',
        reason: 'coordenadas en metros pero la zona UTM no pudo resolverse con certeza',
        zone: null, candidates
    };
}

// ─── Reproyección ────────────────────────────────────────────────────────────
/**
 * Reproyecta un único par de coordenadas.
 * @returns {number[]} [x, y] destino.
 */
export function reprojectPoint(x, y, fromCode, toCode) {
    if (fromCode === toCode) return [x, y];
    const p = getProj4();
    if (!p) throw new Error('proj4js no disponible para reproyectar');
    initCrs();
    return p(projDef(fromCode), projDef(toCode), [x, y]);
}

/**
 * Reproyecta toda la geometría de una feature (in place sobre una copia).
 */
function reprojectGeometry(geometry, fromCode, toCode) {
    if (!geometry || !geometry.coordinates) return geometry;
    const walk = (c) => {
        if (!Array.isArray(c)) return c;
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            const [x, y] = reprojectPoint(c[0], c[1], fromCode, toCode);
            // Conservar la altitud si existía.
            return c.length > 2 ? [x, y, c[2]] : [x, y];
        }
        return c.map(walk);
    };
    return { ...geometry, coordinates: walk(geometry.coordinates) };
}

/**
 * Reproyecta un FeatureCollection completo.
 *
 * @param {object} fc
 * @param {string} fromCode CRS de origen.
 * @param {string} toCode   CRS de destino.
 * @param {{round?:number}} [opts] Decimales a conservar (default 8 en grados, 3 en metros).
 * @returns {object} nuevo FeatureCollection (no muta el original).
 */
export function reprojectFeatureCollection(fc, fromCode, toCode, opts = {}) {
    if (!fc || !Array.isArray(fc.features)) throw new Error('FeatureCollection inválido');
    if (fromCode === toCode) return fc;
    const round = opts.round ?? (isGeographic(toCode) ? 8 : 3);
    const factor = Math.pow(10, round);
    const r = (v) => Math.round(v * factor) / factor;

    const roundGeom = (g) => {
        const walk = (c) => {
            if (!Array.isArray(c)) return c;
            if (typeof c[0] === 'number' && typeof c[1] === 'number') {
                const out = [r(c[0]), r(c[1])];
                if (c.length > 2) out.push(c[2]);
                return out;
            }
            return c.map(walk);
        };
        return { ...g, coordinates: walk(g.coordinates) };
    };

    const features = fc.features.map(f => {
        if (!f || !f.geometry) return f;
        const projected = reprojectGeometry(f.geometry, fromCode, toCode);
        return {
            ...f,
            geometry: roundGeom(projected),
            properties: {
                ...(f.properties || {}),
                // Trazabilidad: queda registrado en cada feature exportada.
                SRC_ORIGEN: fromCode,
                SRC_DESTINO: toCode
            }
        };
    });

    const out = { ...fc, features };
    delete out.crs;                       // el CRS destino lo define el .prj / metadato externo
    out.__crs = toCode;                   // metadato propio, no estándar pero útil
    return out;
}

/**
 * Analiza un FeatureCollection y devuelve un informe listo para la UI.
 *
 * @param {object} fc
 * @param {string} [targetCode='EPSG:4326'] CRS en el que debe quedar para el mapa.
 * @returns {{
 *   detected: object,        // salida de detectCRS
 *   needsReprojection: boolean,
 *   source: string|null,     // CRS que se usaría como origen
 *   target: string,
 *   ok: boolean,             // puede mostrarse sin intervención
 *   message: string          // texto para el usuario
 * }}
 */
export function analyzeCRS(fc, targetCode = 'EPSG:4326') {
    const detected = detectCRS(fc);
    const src = detected.code;
    const needs = !!src && src !== targetCode;

    if (!src) {
        return {
            detected, needsReprojection: false, source: null, target: targetCode,
            ok: false,
            message: `Proyección no identificada — ${detected.reason}. Seleccione el CRS de origen manualmente.`
        };
    }
    if (!needs) {
        return {
            detected, needsReprojection: false, source: src, target: targetCode,
            ok: true,
            message: `Proyección correcta: ${labelOf(src)}`
        };
    }
    return {
        detected, needsReprojection: true, source: src, target: targetCode,
        ok: true,
        message: `Se reproyectará ${labelOf(src)} → ${labelOf(targetCode)}`
    };
}

/** ¿Alguna coordenada del GeoJSON cae en Paraguay, en grados o en UTM 20S/21S/22S? */
export function geojsonPlausibleEnParaguay(fc) {
    let vistos = 0, plausibles = 0;
    const walk = (c) => {
        if (!Array.isArray(c) || vistos > 200) return;
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            vistos++;
            const [x, y] = c;
            const grados = x >= -63 && x <= -54 && y >= -28 && y <= -19;
            const utm = x >= 100000 && x <= 900000 && y >= 6800000 && y <= 7900000;
            if (grados || utm) plausibles++;
            return;
        }
        c.forEach(walk);
    };
    for (const f of (fc && fc.features) || []) walk(f && f.geometry && f.geometry.coordinates);
    return vistos === 0 || plausibles > 0;
}
