/**
 * Utilidades Generales
 * Funciones auxiliares para todo el sistema
 */

import { SIMPLIFY_THRESHOLD, MAX_VERTICES_BEFORE_SIMPLIFY, EPSG_32720, PROJ_32720, PROJ_32721 } from './config.js';
import { logger } from './logger.js';

// Contenedor para overlay de loading
let loadingOverlay = null;
let loadingTimeout = null;

/**
 * Sanitiza un string: elimina acentos, espacios extra, convierte a mayúsculas
 */
export function sanitizeString(str) {
    if (!str) return '';
    const sinAcentos = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return sinAcentos.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Muestra overlay de carga
 */
export function showLoading(message = 'Procesando...') {
    if (!loadingOverlay) {
        loadingOverlay = document.querySelector('.map-loading');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'map-loading';
            loadingOverlay.innerHTML = `
                <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="background: white; padding: 1.5rem 2rem; border-radius: 12px; text-align: center;">
                        <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                        <div id="loadingMsg" style="color: #334155; font-weight: 600; margin-bottom: 1rem;">${message}</div>
                        <button id="forceCloseBtn" style="display: none; background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem;">Forzar Cierre de Carga</button>
                    </div>
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            document.body.appendChild(loadingOverlay);
            loadingOverlay.querySelector('#forceCloseBtn').addEventListener('click', hideLoading);
        }
    }
    
    const msgSpan = loadingOverlay.querySelector('#loadingMsg');
    if (msgSpan) msgSpan.textContent = message;

    const forceBtn = loadingOverlay.querySelector('#forceCloseBtn');
    if (forceBtn) forceBtn.style.display = 'none';

    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        if (loadingOverlay.style.display === 'flex' && forceBtn) {
            forceBtn.style.display = 'inline-block';
        }
    }, 10000);

    loadingOverlay.style.display = 'flex';
}

/**
 * Oculta overlay de carga
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatRumbo(azimuthDecimal) {
    let grados = Math.floor(azimuthDecimal);
    let minDec = (azimuthDecimal - grados) * 60;
    let minutos = Math.floor(minDec);
    let segundos = Math.round((minDec - minutos) * 60);
    if (segundos >= 60) {
        segundos = 0;
        minutos++;
    }
    if (minutos >= 60) {
        minutos = 0;
        grados++;
    }
    
    let rumbo = '';
    if (azimuthDecimal >= 0 && azimuthDecimal <= 90) {
        rumbo = `N ${grados}° ${minutos}' ${segundos}" E`;
    } else if (azimuthDecimal > 90 && azimuthDecimal <= 180) {
        let diff = 180 - azimuthDecimal;
        let g = Math.floor(diff);
        let m = Math.floor((diff - g)*60);
        let s = Math.round(((diff - g)*60 - m)*60);
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; g++; }
        rumbo = `S ${g}° ${m}' ${s}" E`;
    } else if (azimuthDecimal > 180 && azimuthDecimal <= 270) {
        let diff = azimuthDecimal - 180;
        let g = Math.floor(diff);
        let m = Math.floor((diff - g)*60);
        let s = Math.round(((diff - g)*60 - m)*60);
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; g++; }
        rumbo = `S ${g}° ${m}' ${s}" W`;
    } else {
        let diff = 360 - azimuthDecimal;
        let g = Math.floor(diff);
        let m = Math.floor((diff - g)*60);
        let s = Math.round(((diff - g)*60 - m)*60);
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; g++; }
        rumbo = `N ${g}° ${m}' ${s}" W`;
    }
    
    return { rumbo, azimuth: `${grados}° ${minutos}' ${segundos}"` };
}

export function generarDerrotero(geojson, currentProj = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs') {
    if (typeof proj4 === 'undefined') throw new Error('Proj4 no disponible');
    
    const derrotero = [];
    if (!geojson || !geojson.features) return derrotero;
    
    geojson.features.forEach((feature, fIdx) => {
        const codigo = feature.properties?.PADRON || feature.properties?.CODIGO || `Parcela_${fIdx+1}`;
        
        if (feature.geometry && feature.geometry.type.includes('Polygon')) {
            const flattenPolys = [];
            if (feature.geometry.type === 'Polygon') {
                flattenPolys.push(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiPolygon') {
                flattenPolys.push(...feature.geometry.coordinates);
            }
            
            flattenPolys.forEach((polygon, polyIdx) => {
                polygon.forEach((ring, ringIdx) => {
                    const isExterior = ringIdx === 0;
                    const utmCoords = ring.map(c => proj4('WGS84', currentProj, [c[0], c[1]]));
                    
                    for (let i = 0; i < utmCoords.length - 1; i++) {
                        const p1 = utmCoords[i];
                        const p2 = utmCoords[i+1];
                        
                        const dx = p2[0] - p1[0];
                        const dy = p2[1] - p1[1];
                        
                        const distancia = Math.sqrt(dx*dx + dy*dy);
                        if (distancia < 0.001) continue; 
                        
                        let anguloRad = Math.atan2(dy, dx);
                        let anguloGrados = anguloRad * 180 / Math.PI;
                        let azimutDecimal = 90 - anguloGrados;
                        if (azimutDecimal < 0) azimutDecimal += 360;
                        if (azimutDecimal >= 360) azimutDecimal -= 360;
                        
                        const { rumbo, azimuth } = formatRumbo(azimutDecimal);
                        
                        derrotero.push({
                            'Padrón / Código': codigo,
                            'Parte': flattenPolys.length > 1 ? `Polígono ${polyIdx+1}` : 'Única',
                            'Anillo': isExterior ? 'Exterior' : `Interior ${ringIdx}`,
                            'Vértice Origen': `V${i+1}`,
                            'Vértice Destino': `V${i+2}`,
                            'Coord X (Este)': parseFloat(p1[0].toFixed(4)),
                            'Coord Y (Norte)': parseFloat(p1[1].toFixed(4)),
                            'Distancia (m)': parseFloat(distancia.toFixed(2)),
                            'Azimut': azimuth,
                            'Rumbo': rumbo
                        });
                    }
                    
                    const last = utmCoords[utmCoords.length-1];
                    derrotero.push({
                        'Padrón / Código': codigo,
                        'Parte': flattenPolys.length > 1 ? `Polígono ${polyIdx+1}` : 'Única',
                        'Anillo': isExterior ? 'Exterior' : `Interior ${ringIdx}`,
                        'Vértice Origen': `V${utmCoords.length}`,
                        'Vértice Destino': '-',
                        'Coord X (Este)': parseFloat(last[0].toFixed(4)),
                        'Coord Y (Norte)': parseFloat(last[1].toFixed(4)),
                        'Distancia (m)': '-',
                        'Azimut': '-',
                        'Rumbo': '-'
                    });
                });
            });
        }
    });
    
    return derrotero;
}

export function hideLoading() {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    const initialLoading = document.getElementById('loading');
    if (initialLoading) {
        initialLoading.style.opacity = '0';
        setTimeout(() => initialLoading.style.display = 'none', 500);
    }
}

/**
 * Muestra notificación tipo toast
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: '#10b981',
        error: '#dc2626', // Rojo más oscuro
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        pointer-events: none;
        transition: opacity 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Descarga un archivo
 */
export function downloadFile(content, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Calcula el centroide de un feature usando Turf
 */
export function calcularCentroide(feature) {
    if (!feature || !feature.geometry) return null;
    try {
        const centroid = turf.centroid(feature);
        return centroid.geometry.coordinates;
    } catch (e) {
        logger.error('Error calculando centroide:', e);
        return null;
    }
}

/**
 * Simplifica geometría si tiene muchos vértices (para rendimiento)
 */
export function simplifyGeometryIfNeeded(feature) {
    if (!feature || !feature.geometry) return feature;
    
    let vertexCount = 0;
    const countVerts = (geom) => {
        if (geom.type === 'Polygon') {
            geom.coordinates.forEach(ring => { vertexCount += ring.length; });
        } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach(poly => {
                poly.forEach(ring => { vertexCount += ring.length; });
            });
        }
    };
    countVerts(feature.geometry);
    
    if (vertexCount > MAX_VERTICES_BEFORE_SIMPLIFY) {
        const simplified = turf.simplify(feature, { tolerance: SIMPLIFY_THRESHOLD, highQuality: true });
        logger.debug(`🔧 Geometría simplificada: ${vertexCount} → vértices reducidos`);
        return simplified;
    }
    return feature;
}

/**
 * Actualiza contadores en UI
 */
export function actualizarContadoresUI(polyCount, dataCount) {
    const polySpan = document.getElementById('polyCount');
    const dataSpan = document.getElementById('dataCount');
    const tabTableCount = document.getElementById('tabTableCount');
    const btnValidate = document.getElementById('validateBtn');
    
    if (polySpan) polySpan.textContent = polyCount;
    if (dataSpan) dataSpan.textContent = dataCount;
    if (tabTableCount) tabTableCount.textContent = dataCount;
    
    // Habilitar botón de validación si ambos datasets existen
    if (btnValidate) {
        btnValidate.disabled = !(polyCount > 0 && dataCount > 0);
    }
}

/**
 * Sincroniza los indicadores visibles del expediente con las geometrías y el
 * último dictamen de validación.
 */
function normalizarDepartamento(nombre) {
    if (!nombre || nombre === 'Sin determinar' || nombre === '-') return 'Sin determinar';
    const clean = String(nombre).trim();
    const upper = clean.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (upper === 'ASUNCION' || upper === '00' || upper === 'DISTRITO CAPITAL' || upper === 'CAPITAL') {
        return 'CAPITAL';
    }
    return clean.toUpperCase();
}

export function actualizarEstadoProyecto(geojson, validationResults = null, zoneLabel = null) {
    const features = geojson?.features || [];
    const parcelas = features.filter(feature => ['Polygon', 'MultiPolygon'].includes(feature?.geometry?.type));
    let areaM2 = 0;

    for (const parcela of parcelas) {
        try {
            areaM2 += calcularMetricasPlanasUTM(parcela).areaM2;
        } catch (error) {
            logger.warn('No se pudo calcular la superficie de una parcela:', error);
        }
    }

    let dpto = 'Sin determinar';
    let dist = 'Sin determinar';
    let barrio = 'Sin determinar';
    let padron = '-';
    let centroidLng = null;
    let centroidLat = null;

    if (parcelas.length > 0) {
        let sumX = 0, sumY = 0, ptCount = 0;
        for (const p of parcelas) {
            const geom = p.geometry;
            const rings = geom.type === 'Polygon' ? geom.coordinates : (geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : []);
            for (const ring of rings) {
                for (const pt of ring) {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        sumX += pt[0];
                        sumY += pt[1];
                        ptCount++;
                    }
                }
            }
        }
        if (ptCount > 0) {
            centroidLng = sumX / ptCount;
            centroidLat = sumY / ptCount;
            if (!zoneLabel) {
                zoneLabel = centroidLng < -60 ? '20S / WGS84' : '21S / WGS84';
            }
        }

        const props = parcelas[0].properties || {};
        dpto = normalizarDepartamento(props.DPTO_DESC || props.NAM_DPTO || props.DEPARTAMEN || 'Sin determinar');
        dist = props.DIST_DESC || props.NAM_DISTRI || props.DISTRITO || 'Sin determinar';
        barrio = props.BARRIO || props.BARLO_DESC || props.BAR_LOC || props.LOCALIDAD || 'Sin determinar';
        padron = props.PADRON || props.FINCA || props.CTA_CTE || '-';
        
        if (parcelas.length > 1) {
            padron = 'Múltiples';
            const allSameDist = parcelas.every(p => {
                const pProps = p.properties || {};
                return (pProps.DIST_DESC || pProps.NAM_DISTRI || pProps.DISTRITO) === dist;
            });
            if (!allSameDist) dist = 'Múltiples';
        }
    } else if (features.length > 0) {
        // Geometrías no poligonales (ej. puntos)
        const puntos = features.filter(f => f?.geometry?.type === 'Point');
        if (puntos.length > 0) {
            let sumX = 0, sumY = 0;
            puntos.forEach(p => {
                sumX += p.geometry.coordinates[0];
                sumY += p.geometry.coordinates[1];
            });
            centroidLng = sumX / puntos.length;
            centroidLat = sumY / puntos.length;
            if (!zoneLabel) zoneLabel = centroidLng < -60 ? '20S / WGS84' : '21S / WGS84';
        }
    }

    if (!zoneLabel) zoneLabel = '21S / WGS84';

    // Búsqueda instantánea en cliente para Departamento si no vino en propiedades
    if ((dpto === 'Sin determinar' || dpto === '-') && centroidLat !== null && centroidLng !== null) {
        try {
            if (typeof window !== 'undefined' && window.turf) {
                const pt = window.turf.point([centroidLng, centroidLat]);
                const deptos = window.DeptosData?.DEPTOS_GEOJSON?.features;
                if (deptos) {
                    for (const feat of deptos) {
                        if (window.turf.booleanPointInPolygon(pt, feat)) {
                            dpto = normalizarDepartamento(feat.properties?.DPTO_DESC || dpto);
                            break;
                        }
                    }
                }
            }
        } catch {}
    }

    const statArea = document.getElementById('stat-area');
    if (statArea) {
        const m2 = areaM2.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const ha = (areaM2 / 10000).toLocaleString('es-PY', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        statArea.innerHTML = `<span class="block text-[10px] whitespace-nowrap">${m2} m²</span><span class="text-[9px] text-slate-500">${ha} ha</span>`;
    }
    
    const statCount = document.getElementById('stat-count');
    if (statCount) {
        statCount.textContent = parcelas.length > 0 ? parcelas.length : features.length;
    }
    
    // Actualizar Ubicación Geográfica (Dashboard lateral)
    const elDpto = document.getElementById('stat-dpto-map');
    if (elDpto) { elDpto.textContent = dpto; elDpto.title = dpto; }

    const elDist = document.getElementById('stat-dist-map');
    if (elDist) { elDist.textContent = dist; elDist.title = dist; }

    const elBarrio = document.getElementById('stat-barrio');
    if (elBarrio) { elBarrio.textContent = barrio; elBarrio.title = barrio; }

    const elPadron = document.getElementById('stat-padron-map');
    if (elPadron) elPadron.textContent = padron;
    for (const id of ['stat-zone', 'stat-zone-map']) {
        const element = document.getElementById(id);
        if (element) element.textContent = zoneLabel;
    }

    // Identificación espacial automática oficial de alta velocidad (<200ms)
    if (centroidLat !== null && centroidLng !== null && (dpto === 'Sin determinar' || dist === 'Sin determinar' || barrio === 'Sin determinar' || dpto === '-' || dist === '-')) {
        let qLat = centroidLat;
        let qLng = centroidLng;
        // Si las coordenadas están en metros UTM, reproyectar a WGS84
        if (Math.abs(qLng) > 180 || Math.abs(qLat) > 90) {
            try {
                if (typeof proj4 !== 'undefined') {
                    const utmCode = zoneLabel.includes('20S') ? 'EPSG:32720' : 'EPSG:32721';
                    const [wLng, wLat] = proj4(utmCode, 'EPSG:4326', [qLng, qLat]);
                    qLng = wLng;
                    qLat = wLat;
                }
            } catch {}
        }
        fetch(`/api/spatial-identify?lat=${qLat.toFixed(6)}&lng=${qLng.toFixed(6)}&noGeom=1`)
            .then(res => res.json())
            .then(data => {
                if (data && data.ok) {
                    const nuevoDpto = normalizarDepartamento(data.departamento || dpto);
                    const nuevoDist = data.distrito || dist;
                    const nuevoBarrio = data.barrio || barrio;
                    if (elDpto && nuevoDpto && nuevoDpto !== 'Sin determinar') {
                        elDpto.textContent = nuevoDpto;
                        elDpto.title = nuevoDpto;
                    }
                    if (elDist && nuevoDist && nuevoDist !== 'Sin determinar') {
                        elDist.textContent = nuevoDist;
                        elDist.title = nuevoDist;
                    }
                    if (elBarrio && nuevoBarrio && nuevoBarrio !== 'Sin determinar') {
                        elBarrio.textContent = nuevoBarrio;
                        elBarrio.title = nuevoBarrio;
                    }
                    if (typeof window !== 'undefined' && window.State) {
                        if (nuevoDpto && nuevoDpto !== 'Sin determinar') window.State.set('departamento', nuevoDpto);
                        if (nuevoDist && nuevoDist !== 'Sin determinar') window.State.set('distrito', nuevoDist);
                        if (nuevoBarrio && nuevoBarrio !== 'Sin determinar') window.State.set('barrio', nuevoBarrio);
                    }
                    parcelas.forEach(p => {
                        p.properties = p.properties || {};
                        if (!p.properties.DEPARTAMEN && nuevoDpto) p.properties.DEPARTAMEN = nuevoDpto;
                        if (!p.properties.DISTRITO && nuevoDist) p.properties.DISTRITO = nuevoDist;
                        if (nuevoBarrio && !p.properties.BARRIO) p.properties.BARRIO = nuevoBarrio;
                    });
                }
            })
            .catch(() => {});
    }
}

/**
 * Detecta si un valor es numérico
 */
export function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Formatea número con 2 decimales
 */
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return Number(num).toFixed(decimals);
}

/**
 * Calcula área y perímetro sobre el plano UTM mediante la fórmula de Gauss
 * (Shoelace). Evita el error de usar área esférica para una parcela catastral.
 */
export function calcularMetricasPlanasUTM(feature, projectionCode = 'EPSG:32721') {
    const geometry = feature?.geometry || feature;
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) {
        return { areaM2: 0, perimeterM: 0 };
    }

    const projection = projectionCode === EPSG_32720 ? PROJ_32720 : PROJ_32721;
    const toUtm = ([x, y]) => {
        // Las geometrías DXF/UTM ya vienen en metros; GeoJSON/KML llega en WGS84.
        if (Math.abs(x) > 180 || Math.abs(y) > 90) return [x, y];
        if (typeof proj4 === 'undefined') throw new Error('Proj4 no está disponible para calcular métricas UTM.');
        return proj4(projection, [x, y]);
    };
    const calculateRing = (ring) => {
        const points = ring.map(toUtm);
        if (points.length < 3) return { signedArea: 0, perimeter: 0 };
        const closed = points.length > 1 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]
            ? points.slice(0, -1)
            : points;
        let twiceArea = 0;
        let perimeter = 0;
        for (let index = 0; index < closed.length; index++) {
            const [x1, y1] = closed[index];
            const [x2, y2] = closed[(index + 1) % closed.length];
            twiceArea += x1 * y2 - y1 * x2;
            perimeter += Math.hypot(x2 - x1, y2 - y1);
        }
        return { signedArea: twiceArea / 2, perimeter };
    };

    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.reduce((metrics, polygon) => {
        polygon.forEach((ring, ringIndex) => {
            const ringMetrics = calculateRing(ring);
            metrics.areaM2 += ringIndex === 0 ? Math.abs(ringMetrics.signedArea) : -Math.abs(ringMetrics.signedArea);
            metrics.perimeterM += ringMetrics.perimeter;
        });
        return metrics;
    }, { areaM2: 0, perimeterM: 0 });
}

/**
 * MÓDULO 10: Arquitectura, Seguridad y Base de Datos (191-200)
 * Requerimientos herranuebras.txt: 191-200
 */

/**
 * Verificar si el usuario tiene permiso para un recurso específico
 * @param {string} recurso - Nombre del recurso (e.g., 'expedientes', 'pagos', 'planes')
 * @param {string} accion - Acción a verificar (e.g., 'crear', 'leer', 'actualizar', 'eliminar')
 * @returns {boolean} true si tiene permiso
 */
export function verificarPermiso(recurso, accion) {
    const rbac = window.State?.get?.('rbac');
    if (!rbac || !rbac.permisos) return false;

    const permisoKey = `${recurso}:${accion}`;
    return rbac.permisos[permisoKey] === true;
}

/**
 * Otorgar permiso al usuario actual
 * @param {string} recurso - Nombre del recurso
 * @param {string} accion - Acción a conceder
 * @param {boolean} valor - Valor del permiso (true/false)
 */
export function otorgarPermiso(recurso, accion, valor = true) {
    const rbac = window.State?.get?.('rbac');
    if (!rbac) return;

    rbac.permisos[`${recurso}:${accion}`] = valor;
    // Persistir en localStorage
    try {
        localStorage.setItem('snc_rbac_permisos', JSON.stringify(rbac.permisos));
    } catch { /* ignorar en entornos sin localStorage */ }
}

/**
 * Obtener los roles asignados al usuario actual
 * @returns {Array<string>} Array de roles
 */
export function obtenerRoles() {
    const rbac = window.State?.get?.('rbac');
    return rbac ? [rbac.rol] : [];
}

/**
 * Verificar si el MFA (Autenticación Multifactor) está habilitado
 * @returns {boolean} true si MFA está habilitado
 */
export function mfaEstaHabilitado() {
    const mfa = window.State?.get?.('mfa');
    return mfa ? mfa.habilitado : false;
}

/**
 * Verificar si el usuario tiene rol administrativo
 * @returns {boolean} true si es admin
 */
export function esUsuarioAdmin() {
    const rbac = window.State?.get?.('rbac');
    return rbac ? rbac.rol === 'admin' : false;
}

/**
 * Verificar acceso departamental - verificar si el usuario tiene acceso a un departamento específico
 * @param {string} departamento - Código del departamento (e.g., '10', '05', 'Capital')
 * @returns {boolean} true si tiene acceso
 */
export function verificarAccesoDepartamental(departamento) {
    const rbac = window.State?.get?.('rbac');
    if (!rbac) return false;

    // Si es admin, tiene acceso a todo
    if (rbac.rol === 'admin') return true;

    // Verificar departamento asignado
    return rbac.departamental === departamento;
}

/**
 * Inicializar MFA (simulación - en producción usaría Web Crypto API o proveedor TOTP)
 * @param {Object} config - Configuración MFA
 * @param {string} config.metodo - 'totp', 'sms', 'authenticator_app'
 * @param {boolean} config.habilitado - Si está habilitado por defecto
 */
export function inicializarMFA(config = {}) {
    const mfa = window.State?.get?.('mfa');
    if (!mfa) return;

    mfa.habilitado = config.habilitado !== false;
    mfa.metodo = config.metodo || 'totp';
    mfa.ultimoVerificacion = new Date().toISOString();

    try {
        localStorage.setItem('snc_mfa_config', JSON.stringify(mfa));
    } catch { /* ignorar */ }

    showToast(`MFA inicializado con método: ${mfa.metodo}`, 'info');
}

/**
 * Verificar integridad criptográfica de un objeto (para copias de seguridad/S3)
 * @param {Object} obj - Objeto a verificar
 * @returns {string} Hash SHA-256 del objeto serializado
 */
export function verificarIntegridadObjeto(obj) {
    const serialized = JSON.stringify(obj, Object.keys(obj).sort());
    // En producción usaría: crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
    // Aquí retornamos un hash simulado
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
        hash = ((hash << 5) - hash + serialized.charCodeAt(i)) | 0;
    }
    return ('0'.repeat(64 - hash.toString(16).length) + hash.toString(16)).slice(-64);
}

/**
 * Definir tablas particionadas por departamento para PostgreSQL/PostGIS
 * @param {string[]} codigosDepartamento - códigos de departamento (00-17, Capital 00)
 * @returns {Object[]} arreglo de definiciones de particiones
 */
export function definirParticionesDB(codigosDepartamento = []) {
    const departamentos = codigosDepartamento || ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];

    return codigosDepartamento.map(codigo => ({
        nombreTabla: `expedientes_departamento_${codigo}`,
        columnaParticion: 'department_code',
        valores: [codigo],
        constraints: `CHECK (department_code = '${codigo}')`
    }));
}

/**
 * Validar que un archivo sea compatible con almacenamiento S3 configurado
 * @param {File} file - Archivo a validar
 * @param {Object} config - Configuración con propiedad bucket
 * @returns {boolean} true si es compatible
 */
export function validarArchivoS3(file, config = { bucket: '' }) {
    const extensionesPermitidas = ['.dwg', '.dxf', '.shp', '.geojson', '.kml', '.pdf', '.rinex'];
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    return extensionesPermitidas.includes(extension);
}

/**
 * Formatear tamaño de archivo a legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
export function formatearTamanio(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
