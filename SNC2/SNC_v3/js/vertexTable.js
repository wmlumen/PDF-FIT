/**
 * Cuadro de Vértices / Derrotero — Res. SNC N° 551/2023
 * ====================================================
 * Genera el cuadro de mojones exigido por Catastro: por cada tramo perimetral
 * emite vértice origen/destino, coordenadas proyectadas, distancia, azimut y
 * rumbo. Además calcula la superficie PLANA (Gauss/shoelace en UTM) y la
 * superficie GEODÉSICA (elipsoide GRS80), que es la de referencia oficial.
 *
 * El proyecto usa EPSG:32721 (WGS 84 UTM 21S) por defecto. SIRGAS 2000
 * (EPSG:31981) difiere en < 1 m, dentro de la tolerancia catastral, de modo que
 * los cálculos son válidos para ambas referencias.
 *
 * Dependencias: solo `proj4` (mismo patrón que segmentLengths.js).
 */

import { PROJ_32720, PROJ_32721 } from './config.js';

export const CUADRO_COLUMNAS = [
    'Padrón / Código',
    'Parte',
    'Anillo',
    'Vértice Origen',
    'Vértice Destino',
    'Coord X (Este)',
    'Coord Y (Norte)',
    'Distancia (m)',
    'Azimut',
    'Rumbo'
];

const GEOGRAPHIC_CODES = new Set(['EPSG:4326', 'EPSG:4258', 'EPSG:4269']);

/** Devuelve la cadena proj4 de un código EPSG soportado. */
export function projectionOf(code) {
    if (code === 'EPSG:32720' || code === 'EPSG:31980' || code === 'EPSG:22195') return PROJ_32720;
    return PROJ_32721; // 32721, 31981, 31982 y default
}

const toNumber = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** Quita el vértice de cierre duplicado de un anillo. */
export function uniqueVertices(ring) {
    if (!Array.isArray(ring) || ring.length < 2) return [];
    const first = ring[0];
    const last = ring[ring.length - 1];
    const closed = Number(first[0]) === Number(last[0]) && Number(first[1]) === Number(last[1]);
    return closed ? ring.slice(0, -1) : ring.slice();
}

/**
 * Normaliza un anillo a pares [x, y] numéricos, descartando coordenadas inválidas.
 * @returns {number[][]}
 */
export function normalizeRing(ring) {
    const points = [];
    for (const coord of ring) {
        if (!Array.isArray(coord) || coord.length < 2) continue;
        const x = toNumber(coord[0]);
        const y = toNumber(coord[1]);
        if (x === null || y === null) continue;
        points.push([x, y]);
    }
    return points;
}

/**
 * true si las coordenadas parecen geográficas (grados) por magnitud.
 * Un GeoJSON válido SIEMPRE está en grados (EPSG:4326); el flag `crs` solo
 * documenta la referencia de trabajo del expediente.
 */
export function looksGeographic(points) {
    if (!Array.isArray(points) || !points.length) return false;
    const maxAbs = points.reduce((m, p) => {
        const ax = Math.abs(Number(p[0]) || 0);
        const ay = Math.abs(Number(p[1]) || 0);
        return Math.max(m, ax, ay);
    }, 0);
    return maxAbs <= 180;
}

/**
 * Si las coordenadas están en grados geográficos, las reproyecta al CRS
 * proyectado pedido (por defecto UTM 21S). Las que ya vienen en metros se
 * dejan intactas.
 *
 * @param {number[][]} points anillo en orden de vértices
 * @param {{from?: string, to?: string}} opts
 * @returns {number[][]}
 */
export function toProjected(points, opts = {}) {
    const to = opts.to || 'EPSG:32721';
    const sourceIsDegrees = looksGeographic(points) && GEOGRAPHIC_CODES.has(opts.from || 'EPSG:4326');
    if (sourceIsDegrees && !GEOGRAPHIC_CODES.has(to)) {
        if (typeof proj4 === 'undefined') {
            throw new Error('proj4js no está disponible para reproyectar el cuadro de vértices');
        }
        return points.map(([x, y]) => proj4('EPSG:4326', to, [x, y]));
    }
    return points;
}

/**
 * Superficie plana por fórmula de Gauss (shoelace) sobre coordenadas proyectadas.
 * @returns {number} m² (positivo)
 */
export function areaPlana(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let twice = 0;
    for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        twice += x1 * y2 - y1 * x2;
    }
    return Math.abs(twice / 2);
}

/**
 * Superficie geodésica sobre el elipsoide (fórmula de l'Alsáciana / Gauss-Bomford)
 * para un anillo expresado en grados.
 *
 * Es la superficie de referencia oficial: la plana (UTM) solo es aproximada y se
 * aleja del valor elipsoidal conforme crece la parcela o se aleja del meridiano central.
 *
 * @param {number[][]} points anillo en [lon, lat] (grados)
 * @param {{a?: number, e2?: number}} opts elipsoide (default GRS80 / SIRGAS 2000)
 * @returns {number} m²
 */
export function areaGeodesica(points, opts = {}) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    const a = opts.a || 6378137.0;                 // semieje mayor GRS80
    const e2 = opts.e2 || 0.00669438002290;        // excentricidad^2 GRS80
    const rad = Math.PI / 180;
    const n = points.length;
    // Radio de curvatura del paralelo (primer radio vertical) por vértice.
    const paralelo = latRad =>
        a * Math.cos(latRad) / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
    // Teorema de Gauss-Bomford: A = a²/2 · Σ Δλ · (r₁·sinB₁ + r₂·sinB₂)
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const [lon1, lat1] = points[i];
        const [lon2, lat2] = points[(i + 1) % n];
        const dLon = (lon2 - lon1) * rad;
        const b1 = lat1 * rad;
        const b2 = lat2 * rad;
        sum += dLon * (paralelo(b1) * Math.sin(b1) + paralelo(b2) * Math.sin(b2));
    }
    return Math.abs(sum) * (a * a) / 2;
}

/**
 * Ángulo de un tramo en grados (0° = Norte, sentido horario), plano proyectado.
 * @returns {number|null} grados normalizados a [0, 360)
 */
export function azimuthOf(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    if (dx === 0 && dy === 0) return null;
    let az = Math.atan2(dx, dy) * 180 / Math.PI; // 0° Norte, horario
    if (az < 0) az += 360;
    return az;
}

/** Convierte un azimut decimal a texto sexagesimal "123° 25' 30\"". */
export function azimuthText(az) {
    if (az === null || az === undefined || !Number.isFinite(az)) return '-';
    const d = Math.floor(az);
    const m = Math.floor((az - d) * 60);
    const s = Math.round(((az - d) * 60 - m) * 60);
    if (s === 60) return `${d}° ${m + 1}' 00"`;
    return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
}

/** Convierte un azimut decimal a rumbo "N 25° 30' 00\" E". */
export function rumboText(az) {
    if (az === null || az === undefined || !Number.isFinite(az)) return '-';
    if (az < 90) {
        return `N ${azimuthText(az)} E`;
    }
    if (az < 180) {
        return `S ${azimuthText(180 - az)} E`;
    }
    if (az < 270) {
        return `S ${azimuthText(az - 180)} W`;
    }
    return `N ${azimuthText(360 - az)} W`;
}

/**
 * Construye el cuadro de vértices de UN anillo.
 *
 * @param {number[][]} points anillo ya proyectado (sin vértice de cierre duplicado)
 * @param {{codigo?: string, parte?: string, anillo?: string, decimals?: number}} meta
 * @returns {object[]} filas del cuadro (columnas de CUADRO_COLUMNAS)
 */
export function buildRingRows(points, meta = {}) {
    const vertices = uniqueVertices(normalizeRing(points));
    const rows = [];
    const n = vertices.length;
    if (n < 2) return rows;
    const decimals = Number.isFinite(Number(meta.decimals)) ? Number(meta.decimals) : 4;
    const factor = 10 ** decimals;

    for (let i = 0; i < n; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % n];
        const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        if (dist < 0.001) continue; // descarta segmentos degenerados
        const az = azimuthOf(p1, p2);
        rows.push({
            'Padrón / Código': meta.codigo || 'PARCELA',
            'Parte': meta.parte || 'Única',
            'Anillo': meta.anillo || 'Exterior',
            'Vértice Origen': `V${i + 1}`,
            'Vértice Destino': `V${(i + 1) % n + 1}`,
            'Coord X (Este)': Math.round(p1[0] * factor) / factor,
            'Coord Y (Norte)': Math.round(p1[1] * factor) / factor,
            'Distancia (m)': Number(dist.toFixed(2)),
            'Azimut': azimuthText(az),
            'Rumbo': rumboText(az)
        });
    }

    // Fila de cierre: último vértice sin tramo asociado.
    const last = vertices[n - 1];
    rows.push({
        'Padrón / Código': meta.codigo || 'PARCELA',
        'Parte': meta.parte || 'Única',
        'Anillo': meta.anillo || 'Exterior',
        'Vértice Origen': `V${n}`,
        'Vértice Destino': '-',
        'Coord X (Este)': Math.round(last[0] * factor) / factor,
        'Coord Y (Norte)': Math.round(last[1] * factor) / factor,
        'Distancia (m)': '-',
        'Azimut': '-',
        'Rumbo': '-'
    });

    return rows;
}

/** Devuelve la lista de anillos de una geometría Polygon/MultiPolygon. */
export function ringsOf(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates || [];
    if (geometry.type === 'MultiPolygon') {
        return (geometry.coordinates || []).flat();
    }
    return [];
}

/**
 * Cuadro de vértices completo de un GeoJSON (feature o featureCollection).
 *
 * @param {object} geojson
 * @param {{crs?: string, decimals?: number}} opts crs: 'EPSG:4326' si el dato es geográfico
 * @returns {{rows: object[], parcels: object[], crs: string}}
 *   rows    — filas del cuadro (para tabla/CSV)
 *   parcels — resumen por parcela (superficie plana, geodésica, perímetro, vértices)
 */
export function buildCuadro(geojson, opts = {}) {
    const crs = opts.crs || 'EPSG:32721';
    const projectedCrs = GEOGRAPHIC_CODES.has(crs) ? 'EPSG:32721' : crs;
    const features = Array.isArray(geojson?.features) ? geojson.features : (geojson ? [geojson] : []);
    const rows = [];
    const parcels = [];

    features.forEach((feature, fIdx) => {
        if (!feature?.geometry) return;
        const props = feature.properties || {};
        const codigo = props.PADRON || props.CODIGO || `PARCELA_${fIdx + 1}`;
        const rings = ringsOf(feature.geometry);
        let areaPlanaTotal = 0;
        let areaGeodesicaTotal = 0;
        let perimetro = 0;
        let vertices = 0;

        rings.forEach((ring, ringIdx) => {
            const isExterior = ringIdx === 0;
            const part = rings.length > 1 ? `Polígono ${ringIdx + 1}` : 'Única';
            const meta = {
                codigo,
                parte: part,
                anillo: isExterior ? 'Exterior' : `Interior ${ringIdx}`,
                decimals: opts.decimals
            };

            // Geodésico sobre el anillo original (grados).
            const geoRing = normalizeRing(ring);
            if (isExterior) {
                areaGeodesicaTotal += areaGeodesica(geoRing);
            } else {
                areaGeodesicaTotal -= areaGeodesica(geoRing);
            }

            // Proyectado para distancias/azimuts.
            let projected;
            try {
                projected = toProjected(geoRing, { from: crs, to: projectedCrs });
            } catch {
                projected = geoRing; // ya venía en metros
            }
            const clean = uniqueVertices(projected);
            vertices += clean.length;
            const ringArea = areaPlana(clean);
            if (isExterior) {
                areaPlanaTotal += ringArea;
            } else {
                areaPlanaTotal -= ringArea;
            }
            perimetro += clean.reduce((acc, p, i) => {
                const q = clean[(i + 1) % clean.length];
                return acc + Math.hypot(q[0] - p[0], q[1] - p[1]);
            }, 0);

            rows.push(...buildRingRows(projected, meta));
        });

        parcels.push({
            codigo,
            parte: rings.length > 1 ? `Polígono ${rings.length}` : 'Única',
            superficiePlanaM2: Number(areaPlanaTotal.toFixed(2)),
            superficieGeodesicaM2: Number(Math.abs(areaGeodesicaTotal).toFixed(2)),
            perimetroM: Number(perimetro.toFixed(2)),
            vertices
        });
    });

    return { rows, parcels, crs: projectedCrs };
}

/** Serializa las filas del cuadro a CSV (separador `;`, compatible Excel es-PY). */
export function toCSV(rows, { columnas = CUADRO_COLUMNAS, separador = ';' } = {}) {
    const escape = value => {
        if (value === null || value === undefined) return '';
        const text = String(value);
        return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const header = columnas.join(separador);
    const body = rows.map(row => columnas.map(col => escape(row[col])).join(separador));
    return [header, ...body].join('\r\n');
}

/** Serializa el resumen de parcelas a CSV. */
export function parcelsToCSV(parcels) {
    const columnas = ['Padrón / Código', 'Parte', 'Superficie Plana (m²)', 'Superficie Geodésica (m²)', 'Perímetro (m)', 'Vértices'];
    const map = {
        'Padrón / Código': 'codigo',
        'Parte': 'parte',
        'Superficie Plana (m²)': 'superficiePlanaM2',
        'Superficie Geodésica (m²)': 'superficieGeodesicaM2',
        'Perímetro (m)': 'perimetroM',
        'Vértices': 'vertices'
    };
    const escape = value => {
        if (value === null || value === undefined) return '';
        const text = String(value);
        return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const header = columnas.join(';');
    const body = parcels.map(p => columnas.map(col => escape(p[map[col]])).join(';'));
    return [header, ...body].join('\r\n');
}

/** Agrupa las filas del cuadro por parcela (clave Padrón / Código). */
export function groupByParcel(rows) {
    const groups = new Map();
    for (const row of rows) {
        const key = row['Padrón / Código'];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }
    return groups;
}
