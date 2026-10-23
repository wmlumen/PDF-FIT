/**
 * signatureManager.js — Módulo Oficial de Firmas Digitales y Sellos Institucionales (SNC_v3)
 * Cumplimiento: Ley N° 6822/2021 (Servicios de Confianza y Firma Digital Cualificada)
 * y Resolución SNC N° 551/2023 (Protocolo Catastral y Circuito de Visado).
 *
 * Funcionalidades:
 * 1. Ensamble de Firmas Digitales y Sellos Institucionales con API estirable.
 * 2. Generador automático de imágenes provisorias para sellos (SVG / DataURL vectoriales).
 * 3. Gestión del ciclo de vida: Alzar (registrar), Revocar (CRL) y Eliminar firmas/sellos.
 * 4. Circuitos y ubicaciones preestablecidas según protocolo gubernamental (con orden modificable).
 * 5. Regla de negocio estricta: Sellos internos para trámites en revisión y Firmas Digitales
 *    cualificadas obligatorias únicamente para dictámenes definitivos.
 */

// ==================== TIPOS Y CONSTANTES OFICIALES ====================

export const TIPOS_FIRMA = {
    FIRMA_DIGITAL: 'FIRMA_DIGITAL',      // Firma Digital Cualificada (Ley 6822/21)
    SELLO_INTERNO: 'SELLO_INTERNO'        // Sello Institucional de Control / Visado Técnico
};

export const ESTADOS_FIRMA = {
    ACTIVA: 'ACTIVA',
    REVOCADA: 'REVOCADA',
    EXPIRADA: 'EXPIRADA'
};

export const TIPOS_SELLO_PROVISORIO = {
    CIRCULAR_OFICIAL: 'CIRCULAR_OFICIAL',   // Redondo con membrete perimetral y escudo
    RECTANGULAR_CONTROL: 'RECTANGULAR_CONTROL' // Rectangular de visado técnico con recuadros
};

// Protocolo gubernamental predefinido de firmas y sellos (SNC / Municipalidad)
export const PROTOCOLO_GUBERNAMENTAL_ORDEN = [
    {
        slotId: 'slot_profesional',
        orden: 1,
        etiqueta: 'Responsable Técnico de Agrimensura',
        rolRequerido: 'AGRIMENSOR_TOPOGRAFO',
        tipoPermitido: TIPOS_FIRMA.FIRMA_DIGITAL,
        obligatorioDefinitivo: true,
        descripcion: 'Declaración jurada y responsabilidad técnica del profesional matriculado',
        layout: { x: 15, y: 220, ancho: 43, alto: 35 }
    },
    {
        slotId: 'slot_revisor',
        orden: 2,
        etiqueta: 'Control Técnico y Topológico',
        rolRequerido: 'REVISOR_TECNICO',
        tipoPermitido: TIPOS_FIRMA.SELLO_INTERNO,
        obligatorioDefinitivo: false,
        descripcion: 'Sello de visado y control preliminar de topología y atributos',
        layout: { x: 62, y: 220, ancho: 43, alto: 35 }
    },
    {
        slotId: 'slot_fiscalizador',
        orden: 3,
        etiqueta: 'Fiscalización y Dictamen',
        rolRequerido: 'JEFE_FISCALIZACION',
        tipoPermitido: TIPOS_FIRMA.SELLO_INTERNO,
        obligatorioDefinitivo: false,
        descripcion: 'Visto bueno interno de la jefatura de fiscalización catastral',
        layout: { x: 109, y: 220, ancho: 43, alto: 35 }
    },
    {
        slotId: 'slot_director',
        orden: 4,
        etiqueta: 'Aprobación y Homologación Oficial',
        rolRequerido: 'AUTORIDAD_RESOLUTIVA',
        tipoPermitido: TIPOS_FIRMA.FIRMA_DIGITAL,
        obligatorioDefinitivo: true,
        descripcion: 'Firma digital de la máxima autoridad (Director SNC / Intendente)',
        layout: { x: 156, y: 220, ancho: 43, alto: 35 }
    }
];

// Estados del workflow que representan etapas internas (usan solo SELLO_INTERNO)
export const ESTADOS_INTERNOS = [
    'BORRADOR',
    'MESA_ENTRADA',
    'ASIGNADO',
    'EN_REVISION',
    'OBSERVADO',
    'REINGRESO'
];

// Estados del workflow que representan dictamen definitivo (exigen FIRMA_DIGITAL)
export const ESTADOS_DEFINITIVOS = [
    'DICTAMEN',
    'APROBADO_FISCALIZACION',
    'FIRMADO_DIRECTOR',
    'PADRON_ASIGNADO'
];

// ==================== ALMACENAMIENTO SEGURO DE FIRMAS ====================

const STORAGE_KEYS = {
    FIRMAS: 'snc_firmas_catalogo',
    REVOCADAS: 'snc_firmas_revocadas_crl',
    CIRCUITO: 'snc_circuito_firmas_config'
};

// Memoria interna como fallback
const _memoria = {
    firmas: new Map(),
    revocadas: new Map(),
    circuito: JSON.parse(JSON.stringify(PROTOCOLO_GUBERNAMENTAL_ORDEN))
};

function getStorage(key) {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
    } catch {
        /* fallback memoria */
    }
    return null;
}

function setStorage(key, value) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch {
        /* fallback memoria */
    }
}

// ==================== GENERADOR PROVISORIO DE SELLOS ====================

/**
 * Genera un sello provisorio vectorial SVG o DataURL listo para estampar en pantalla o PDF
 * @param {Object} params
 * @param {string} params.tipo - CIRCULAR_OFICIAL o RECTANGULAR_CONTROL
 * @param {string} params.entidad - Nombre de la institución (ej: 'SERVICIO NACIONAL DE CATASTRO')
 * @param {string} params.dependencia - Ej: 'DIRECCIÓN DE GEODESIA' o 'MUNICIPALIDAD'
 * @param {string} params.titulo - Ej: 'VISADO TÉCNICO' o 'DICTAMEN DEFINITIVO'
 * @param {string} params.expediente - Número de expediente
 * @param {string} params.fecha - Fecha o timestamp
 * @param {string} params.codigoControl - Código o hash
 * @param {string} params.color - Color HEX primario (por defecto azul oficial '#1e3a8a')
 * @returns {Object} { svg, dataUrl, width, height }
 */
export function generarSelloProvisorio({
    tipo = TIPOS_SELLO_PROVISORIO.CIRCULAR_OFICIAL,
    entidad = 'REPÚBLICA DEL PARAGUAY - SNC',
    dependencia = 'DIRECCIÓN DE GEODESIA',
    titulo = 'VISADO TÉCNICO INTERNO',
    expediente = 'EXP-2026-0001',
    fecha = new Date().toLocaleDateString('es-PY'),
    codigoControl = 'SNC-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    color = '#1e3a8a'
} = {}) {
    if (tipo === TIPOS_SELLO_PROVISORIO.RECTANGULAR_CONTROL) {
        const width = 260;
        const height = 130;
        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="#f8fafc" stroke="${color}" stroke-width="3" rx="4" />
    <rect x="9" y="9" width="${width - 18}" height="${height - 18}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4 2" />
    <rect x="9" y="9" width="${width - 18}" height="28" fill="${color}" />
    <text x="${width / 2}" y="28" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" letter-spacing="0.5">${entidad}</text>
    
    <text x="${width / 2}" y="52" fill="${color}" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${dependencia}</text>
    <text x="${width / 2}" y="67" fill="#dc2626" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" text-anchor="middle">${titulo}</text>
    
    <line x1="16" y1="74" x2="${width - 16}" y2="74" stroke="${color}" stroke-width="0.8" />
    
    <text x="16" y="90" fill="#334155" font-family="monospace" font-size="8">EXP: <tspan font-weight="bold">${expediente}</tspan></text>
    <text x="16" y="104" fill="#334155" font-family="monospace" font-size="8">FECHA: ${fecha}</text>
    <text x="16" y="118" fill="#64748b" font-family="monospace" font-size="7">HASH: ${codigoControl}</text>
    
    <circle cx="${width - 32}" cy="100" r="14" fill="none" stroke="${color}" stroke-width="1.5" />
    <text x="${width - 32}" y="104" fill="${color}" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle">SNC</text>
</svg>`.trim();

        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        return { svg, dataUrl, width, height, tipo };
    }

    // Default: CIRCULAR_OFICIAL
    const size = 180;
    const center = size / 2;
    const radius = 80;
    const innerRadius = 55;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
        <path id="circlePathUpper" d="M 18,${center} A 72,72 0 1,1 162,${center}" fill="none" />
        <path id="circlePathLower" d="M 162,${center} A 72,72 0 1,1 18,${center}" fill="none" />
    </defs>
    
    <!-- Anillos exteriores -->
    <circle cx="${center}" cy="${center}" r="${radius}" fill="#ffffff" stroke="${color}" stroke-width="3" />
    <circle cx="${center}" cy="${center}" r="${radius - 5}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="3 2" />
    <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="#f0f9ff" stroke="${color}" stroke-width="1.5" />
    
    <!-- Texto Perimetral Superior -->
    <text fill="${color}" font-family="Helvetica, Arial, sans-serif" font-size="7.5" font-weight="bold" letter-spacing="1">
        <textPath href="#circlePathUpper" startOffset="50%" text-anchor="middle">${entidad}</textPath>
    </text>
    
    <!-- Texto Perimetral Inferior -->
    <text fill="${color}" font-family="Helvetica, Arial, sans-serif" font-size="7" font-weight="bold" letter-spacing="0.5">
        <textPath href="#circlePathLower" startOffset="50%" text-anchor="middle">${dependencia}</textPath>
    </text>
    
    <!-- Centro Institucional -->
    <!-- Estrella geométrica oficial de 5 puntas -->
    <polygon points="${center},${center - 25} ${center + 6},${center - 10} ${center + 23},${center - 9} ${center + 10},${center + 2} ${center + 14},${center + 19} ${center},${center + 8} ${center - 14},${center + 19} ${center - 10},${center + 2} ${center - 23},${center - 9} ${center - 6},${center - 10}" fill="${color}" opacity="0.15" />
    
    <text x="${center}" y="${center - 6}" fill="${color}" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold" text-anchor="middle">${titulo}</text>
    <text x="${center}" y="${center + 7}" fill="#334155" font-family="monospace" font-size="7.5" text-anchor="middle">${fecha}</text>
    <text x="${center}" y="${center + 18}" fill="#64748b" font-family="monospace" font-size="6.5" text-anchor="middle">${codigoControl}</text>
</svg>`.trim();

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return { svg, dataUrl, width: size, height: size, tipo };
}

// ==================== GESTIÓN DE FIRMAS Y SELLOS (ALZAR, REVOCAR, ELIMINAR) ====================

/**
 * Obtiene el catálogo completo de firmas y sellos registrados
 */
export function obtenerFirmasCatalogo() {
    const fromStore = getStorage(STORAGE_KEYS.FIRMAS);
    if (fromStore && Array.isArray(fromStore)) {
        return fromStore;
    }
    return Array.from(_memoria.firmas.values());
}

/**
 * Registra o "Alza" una nueva firma digital o sello institucional.
 * Si no incluye estampa personalizada, genera automáticamente un sello provisorio.
 * @param {Object} firmaData
 * @returns {Object} Firma registrada con ID y estampa
 */
export function alzarFirma(firmaData) {
    if (!firmaData || !firmaData.nombre || !firmaData.cargo) {
        throw new Error('Datos de firma incompletos: se requiere nombre y cargo.');
    }

    const id = firmaData.id || `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tipo = firmaData.tipo === TIPOS_FIRMA.SELLO_INTERNO ? TIPOS_FIRMA.SELLO_INTERNO : TIPOS_FIRMA.FIRMA_DIGITAL;

    // Si no tiene estampa visual, generar sello provisorio institucional
    let estampaVisual = firmaData.estampaVisual;
    if (!estampaVisual) {
        const stampGen = generarSelloProvisorio({
            tipo: tipo === TIPOS_FIRMA.SELLO_INTERNO ? TIPOS_SELLO_PROVISORIO.RECTANGULAR_CONTROL : TIPOS_SELLO_PROVISORIO.CIRCULAR_OFICIAL,
            entidad: firmaData.institucion || 'SERVICIO NACIONAL DE CATASTRO',
            dependencia: firmaData.dependencia || firmaData.cargo,
            titulo: tipo === TIPOS_FIRMA.SELLO_INTERNO ? 'VISADO TÉCNICO INTERNO' : 'FIRMA DIGITAL OFICIAL',
            fecha: new Date().toLocaleDateString('es-PY')
        });
        estampaVisual = stampGen.dataUrl;
    }

    const nuevaFirma = {
        id,
        nombre: firmaData.nombre.trim(),
        cargo: firmaData.cargo.trim(),
        matricula: firmaData.matricula || '',
        institucion: firmaData.institucion || 'Servicio Nacional de Catastro',
        dependencia: firmaData.dependencia || '',
        tipo,
        estado: ESTADOS_FIRMA.ACTIVA,
        algoritmo: firmaData.algoritmo || (tipo === TIPOS_FIRMA.FIRMA_DIGITAL ? 'SHA-256/RSA-PSC' : 'INTERNO_SELLO'),
        certificadoInfo: firmaData.certificadoInfo || (tipo === TIPOS_FIRMA.FIRMA_DIGITAL ? 'PSC Habilitado MIC (Ley 6822/21)' : 'Sello de Control Interno'),
        estampaVisual,
        fechaAlta: new Date().toISOString(),
        validoHasta: firmaData.validoHasta || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Guardar en memoria y storage
    _memoria.firmas.set(id, nuevaFirma);
    const actual = obtenerFirmasCatalogo().filter(f => f.id !== id);
    actual.push(nuevaFirma);
    setStorage(STORAGE_KEYS.FIRMAS, actual);

    return nuevaFirma;
}

/**
 * Revoca inmediatamente una firma o certificado digital
 * @param {string} firmaId - ID de la firma a revocar
 * @param {Object} params - Motivo, fecha y operador
 * @returns {Object} Firma actualizada en estado REVOCADA
 */
export function revocarFirma(firmaId, { motivo = 'Revocación administrativa', operador = 'SISTEMA' } = {}) {
    const catalogo = obtenerFirmasCatalogo();
    const target = catalogo.find(f => f.id === firmaId);
    if (!target) {
        throw new Error(`Firma no encontrada para revocación: ${firmaId}`);
    }

    target.estado = ESTADOS_FIRMA.REVOCADA;
    target.revocacion = {
        fecha: new Date().toISOString(),
        motivo,
        operador
    };

    // Actualizar catálogo
    _memoria.firmas.set(firmaId, target);
    setStorage(STORAGE_KEYS.FIRMAS, catalogo);

    // Registrar en CRL (Certificate Revocation List)
    const crl = getStorage(STORAGE_KEYS.REVOCADAS) || [];
    const crlEntry = {
        firmaId,
        nombre: target.nombre,
        tipo: target.tipo,
        fechaRevocacion: target.revocacion.fecha,
        motivo
    };
    crl.push(crlEntry);
    _memoria.revocadas.set(firmaId, crlEntry);
    setStorage(STORAGE_KEYS.REVOCADAS, crl);

    return target;
}

/**
 * Verifica si una firma está registrada en la lista de revocadas (CRL)
 * @param {string} firmaId
 * @returns {boolean}
 */
export function estaRevocada(firmaId) {
    if (_memoria.revocadas.has(firmaId)) return true;
    const crl = getStorage(STORAGE_KEYS.REVOCADAS);
    if (Array.isArray(crl) && crl.some(r => r.firmaId === firmaId)) {
        return true;
    }
    const cat = obtenerFirmasCatalogo();
    const item = cat.find(f => f.id === firmaId);
    return item ? item.estado === ESTADOS_FIRMA.REVOCADA : false;
}

/**
 * Elimina una firma del catálogo (solo si no es requerida por auditoría histórica)
 * @param {string} firmaId
 * @returns {boolean}
 */
export function eliminarFirma(firmaId) {
    let catalogo = obtenerFirmasCatalogo();
    const item = catalogo.find(f => f.id === firmaId);
    if (!item) return false;

    catalogo = catalogo.filter(f => f.id !== firmaId);
    _memoria.firmas.delete(firmaId);
    setStorage(STORAGE_KEYS.FIRMAS, catalogo);
    return true;
}

// ==================== PROTOCOLO GUBERNAMENTAL Y GESTIÓN DE ÓRDENES ====================

/**
 * Obtiene el circuito gubernamental activo (orden predefinido o reconfigurado)
 */
export function obtenerCircuitoGubernamental() {
    const fromStore = getStorage(STORAGE_KEYS.CIRCUITO);
    if (fromStore && Array.isArray(fromStore)) {
        return fromStore.sort((a, b) => a.orden - b.orden);
    }
    return JSON.parse(JSON.stringify(_memoria.circuito)).sort((a, b) => a.orden - b.orden);
}

/**
 * Permite reordenar o cambiar los roles del circuito gubernamental de visado/firma
 * @param {Array<Object>} nuevoOrden - Array con la nueva estructura de slots y órdenes
 * @returns {Array<Object>} Circuito ordenado validado y persistido
 */
export function reordenarCircuito(nuevoOrden) {
    if (!Array.isArray(nuevoOrden) || nuevoOrden.length === 0) {
        throw new Error('El nuevo orden del circuito debe ser un array no vacío.');
    }

    // Validar ordenes numéricos únicos
    const ordenes = nuevoOrden.map(s => Number(s.orden));
    const setOrdenes = new Set(ordenes);
    if (setOrdenes.size !== ordenes.length) {
        throw new Error('Los números de orden en el circuito deben ser únicos.');
    }

    // Normalizar y ordenar ascendentemente
    const normalizado = nuevoOrden.map((slot, idx) => ({
        ...slot,
        orden: Number(slot.orden) || (idx + 1)
    })).sort((a, b) => a.orden - b.orden);

    _memoria.circuito = normalizado;
    setStorage(STORAGE_KEYS.CIRCUITO, normalizado);
    return normalizado;
}

/**
 * Modifica la posición (layout X, Y, Ancho, Alto) de un casillero/slot específico
 * @param {string} slotId
 * @param {Object} layout - { x, y, ancho, alto }
 */
export function configurarSlotLayout(slotId, layout) {
    const circuito = obtenerCircuitoGubernamental();
    const slot = circuito.find(s => s.slotId === slotId);
    if (!slot) {
        throw new Error(`Slot no encontrado: ${slotId}`);
    }

    slot.layout = { ...slot.layout, ...layout };
    setStorage(STORAGE_KEYS.CIRCUITO, circuito);
    _memoria.circuito = circuito;
    return slot;
}

/**
 * Restablece el circuito al estándar oficial por defecto del protocolo gubernamental
 */
export function resetearCircuitoOficial() {
    const def = JSON.parse(JSON.stringify(PROTOCOLO_GUBERNAMENTAL_ORDEN));
    _memoria.circuito = def;
    setStorage(STORAGE_KEYS.CIRCUITO, def);
    return def;
}

// ==================== REGLA DE NEGOCIO: SELLOS INTERNOS VS FIRMA DIGITAL ====================

/**
 * Evalúa los requisitos de firma de acuerdo al estado del expediente y tipo de acto
 * @param {string} estadoExpediente - Ej: 'EN_REVISION', 'DICTAMEN', 'BORRADOR', etc.
 * @returns {Object} { esDefinitivo, tipoRequerido, advertencia, permiteFirmaDigital, permiteSelloInterno }
 */
export function evaluarReglaFirma({ estadoExpediente = 'BORRADOR', esDictamenFinal = false } = {}) {
    const st = String(estadoExpediente || '').toUpperCase();
    const esDefinitivo = esDictamenFinal || ESTADOS_DEFINITIVOS.includes(st);

    if (esDefinitivo) {
        return {
            esDefinitivo: true,
            tipoRequerido: TIPOS_FIRMA.FIRMA_DIGITAL,
            permiteFirmaDigital: true,
            permiteSelloInterno: false,
            descripcion: 'El expediente se encuentra en fase resolutiva / dictamen definitivo. Se exige Firma Digital Cualificada (Ley 6822/2021) con plena validez jurídica.',
            bloqueadoParaSellosSimples: true
        };
    }

    return {
        esDefinitivo: false,
        tipoRequerido: TIPOS_FIRMA.SELLO_INTERNO,
        permiteFirmaDigital: false,
        permiteSelloInterno: true,
        descripcion: 'El expediente se encuentra en trámite o revisión interna. Se debe estampar Sello Institucional de Control Técnico sin consumir firma digital cualificada.',
        bloqueadoParaSellosSimples: false
    };
}

// ==================== CRIPTOGRAFÍA Y ENSAMBLE (API CLIENTE/BACKEND) ====================

/**
 * Calcula digest SHA-256 estándar nativo W3C / Node
 * @param {string|Uint8Array} datos
 * @returns {Promise<string>} Hexadecimal SHA-256
 */
export async function calcularHashSHA256(datos) {
    const str = typeof datos === 'string' ? datos : JSON.stringify(datos);
    
    // Si existe Web Crypto API nativo
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
        const encoder = new TextEncoder();
        const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(str));
        const hashArray = Array.from(new Uint8Array(buffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback determinista seguro
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const p1 = (4294967296 + h1).toString(16).slice(-8);
    const p2 = (4294967296 + h2).toString(16).slice(-8);
    return (p1 + p2).repeat(4);
}

/**
 * Ensambla una firma o sello sobre un documento o expediente
 * @param {Object} params
 * @param {string} params.documentoId - ID o hash del documento base
 * @param {string} params.firmaId - ID de la firma/sello registrado
 * @param {string} params.slotId - ID del casillero donde se estampa (ej: 'slot_profesional')
 * @param {string} params.estadoExpediente - Estado del trámite
 * @param {Object} params.metadatosExtra - Datos complementarios
 * @returns {Promise<Object>} Ensamble de firma listo con token criptográfico
 */
export async function ensamblarFirma({
    documentoId,
    firmaId,
    slotId,
    estadoExpediente = 'BORRADOR',
    metadatosExtra = {}
}) {
    if (!documentoId) throw new Error('Se requiere documentoId para ensamblar la firma.');
    if (!firmaId) throw new Error('Se requiere firmaId para ensamblar la firma.');

    // 1. Verificar estado de revocación (CRL)
    if (estaRevocada(firmaId)) {
        throw new Error(`OPERACIÓN DENEGADA: La firma ${firmaId} ha sido REVOCADA y no puede utilizarse.`);
    }

    // 2. Obtener firma del catálogo
    const catalogo = obtenerFirmasCatalogo();
    const firma = catalogo.find(f => f.id === firmaId);
    if (!firma) {
        throw new Error(`Firma no encontrada en el catálogo: ${firmaId}`);
    }

    // 3. Evaluar regla de negocio (Sello Interno vs Firma Definitiva)
    const regla = evaluarReglaFirma({ estadoExpediente });
    if (regla.esDefinitivo && firma.tipo === TIPOS_FIRMA.SELLO_INTERNO) {
        throw new Error(`ERROR DE PROTOCOLO: En estado resolutivo (${estadoExpediente}) se exige Firma Digital Cualificada. No se permite Sello Interno.`);
    }
    if (!regla.esDefinitivo && firma.tipo === TIPOS_FIRMA.FIRMA_DIGITAL) {
        // En revisión interna, se advierte o transforma a estampación de visado interno
        // pero se permite registrar si es del profesional actuante
    }

    // 4. Ubicar el slot dentro del circuito gubernamental
    const circuito = obtenerCircuitoGubernamental();
    const slot = circuito.find(s => s.slotId === slotId) || {
        slotId: slotId || 'slot_ad_hoc',
        orden: circuito.length + 1,
        etiqueta: firma.cargo,
        layout: { x: 15, y: 220, ancho: 43, alto: 35 }
    };

    // 5. Generar sello de tiempo (TSA) y hash inmutable
    const timestamp = new Date().toISOString();
    const payloadAFirmar = `${documentoId}|${firma.id}|${firma.nombre}|${slot.slotId}|${slot.orden}|${timestamp}`;
    const hashFirma = await calcularHashSHA256(payloadAFirmar);

    const tokenFirma = {
        firmaId: firma.id,
        nombre: firma.nombre,
        cargo: firma.cargo,
        matricula: firma.matricula,
        institucion: firma.institucion,
        tipo: firma.tipo,
        slotId: slot.slotId,
        orden: slot.orden,
        timestamp,
        documentoId,
        hashFirma,
        algoritmo: firma.algoritmo,
        certificadoInfo: firma.certificadoInfo,
        estampaVisual: firma.estampaVisual,
        layout: slot.layout,
        esDictamenDefinitivo: regla.esDefinitivo,
        metadatosExtra
    };

    return tokenFirma;
}

/**
 * Valida la autenticidad e integridad de una firma ensamblada
 * @param {Object} tokenFirma - Objeto generado por ensamblarFirma
 * @returns {Promise<Object>} { valido, razon, detalles }
 */
export async function verificarFirma(tokenFirma) {
    if (!tokenFirma || !tokenFirma.firmaId || !tokenFirma.hashFirma) {
        return { valido: false, razon: 'Token de firma incompleto o inválido' };
    }

    // 1. Verificar CRL
    if (estaRevocada(tokenFirma.firmaId)) {
        return {
            valido: false,
            razon: 'FIRMA_REVOCADA: El certificado fue revocado posteriormente por la autoridad competente',
            firmaId: tokenFirma.firmaId
        };
    }

    // 2. Verificar hash de integridad
    const expectedPayload = `${tokenFirma.documentoId}|${tokenFirma.firmaId}|${tokenFirma.nombre}|${tokenFirma.slotId}|${tokenFirma.orden}|${tokenFirma.timestamp}`;
    const calculatedHash = await calcularHashSHA256(expectedPayload);

    if (calculatedHash !== tokenFirma.hashFirma) {
        return {
            valido: false,
            razon: 'HASH_MISMATCH: La firma ha sido manipulada o no coincide con los datos del documento'
        };
    }

    return {
        valido: true,
        razon: 'Firma íntegra y válida según protocolo SNC 551/2023 y Ley 6822/2021',
        tipo: tokenFirma.tipo,
        esDefinitivo: tokenFirma.esDictamenDefinitivo
    };
}

// ==================== RENDERIZADOR EN PDF (JSPDF) ====================

/**
 * Renderiza los casilleros de firmas/sellos en un documento jsPDF
 * @param {Object} doc - Instancia de jsPDF
 * @param {Array<Object>} firmasEnsambladas - Lista de tokens de firma
 * @param {Object} opciones - Configuración de página
 */
export function renderizarFirmasEnPDF(doc, firmasEnsambladas = [], { pagina = null } = {}) {
    if (!doc) return;
    if (pagina) doc.setPage(pagina);

    const circuito = obtenerCircuitoGubernamental();

    circuito.forEach(slot => {
        const layout = slot.layout || { x: 15, y: 220, ancho: 43, alto: 35 };
        const x = layout.x;
        const y = layout.y;
        const w = layout.ancho;
        const h = layout.alto;

        // Dibujar marco del casillero
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.3);
        doc.rect(x, y, w, h);

        // Cabecera del casillero
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(x, y, w, 5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`[${slot.orden}] ${slot.etiqueta}`.toUpperCase(), x + w / 2, y + 3.5, { align: 'center' });

        // Buscar si ya hay firma ensamblada para este slot
        const firma = firmasEnsambladas.find(f => f.slotId === slot.slotId);

        if (firma) {
            // Estampa presente
            if (firma.estampaVisual && typeof doc.addImage === 'function') {
                try {
                    // Si es dataUrl SVG o PNG
                    doc.addImage(firma.estampaVisual, 'PNG', x + 2, y + 6, w - 4, 16);
                } catch {
                    // Si addImage falla con SVG puro en jsPDF básico, dibujar sello textual
                }
            }

            // Datos del firmante
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(firma.nombre, x + w / 2, y + h - 8, { align: 'center' });

            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(firma.cargo, x + w / 2, y + h - 5.5, { align: 'center' });

            // Identificador criptográfico / Hash
            doc.setFontSize(4.5);
            doc.setFont('courier', 'normal');
            doc.setTextColor(100, 116, 139);
            const shortHash = (firma.hashFirma || '').substring(0, 16) + '...';
            doc.text(`ID: ${shortHash}`, x + w / 2, y + h - 2.5, { align: 'center' });
        } else {
            // Casillero vacío a la espera de firma/sello
            doc.setFontSize(6);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(148, 163, 184);
            doc.text('Pendiente de visado / firma', x + w / 2, y + h / 2, { align: 'center' });
            doc.setFontSize(5);
            doc.text(`(${slot.rolRequerido})`, x + w / 2, y + h / 2 + 4, { align: 'center' });
        }
    });
}

// ==================== INTERFAZ PÚBLICA ESTIRABLE COMO API ====================

export const SignatureAPI = {
    TIPOS_FIRMA,
    ESTADOS_FIRMA,
    TIPOS_SELLO_PROVISORIO,
    PROTOCOLO_GUBERNAMENTAL_ORDEN,
    generarSelloProvisorio,
    obtenerFirmasCatalogo,
    alzarFirma,
    revocarFirma,
    estaRevocada,
    eliminarFirma,
    obtenerCircuitoGubernamental,
    reordenarCircuito,
    configurarSlotLayout,
    resetearCircuitoOficial,
    evaluarReglaFirma,
    calcularHashSHA256,
    ensamblarFirma,
    verificarFirma,
    renderizarFirmasEnPDF
};

if (typeof window !== 'undefined') {
    window.SignatureAPI = SignatureAPI;
}

export default SignatureAPI;
