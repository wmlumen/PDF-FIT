import { logger } from './logger.js';
 // paraguayRef.js - Referencia de Códigos Oficiales Paraguay
 // Simple in-memory cache for loaded layers
 const _LAYERS_CACHE = {};
// Fuente: INE (Instituto Nacional de Estadística - datos.gov.py)
// Resolución SNC N° 551/2023

/**
 * Códigos oficiales de Departamentos (DPTO)
 * Formato: 2 dígitos
 */
const DEPARTAMENTOS_PY = {
    '01': 'CONCEPCIÓN',
    '02': 'SAN PEDRO',
    '03': 'CORDILLERA',
    '04': 'GUAIRÁ',
    '05': 'CAAGUAZÚ',
    '06': 'CAAZAPÁ',
    '07': 'ITAPÚA',
    '08': 'MISIONES',
    '09': 'PARAGUARÍ',
    '10': 'ALTO PARANÁ',
    '11': 'CENTRAL',
    '12': 'ÑEEMBUCÚ',
    '13': 'AMAMBAY',
    '14': 'CANINDEYÚ',
    '15': 'PRESIDENTE HAYES',
    '16': 'BOQUERÓN',
    '17': 'ALTO PARAGUAY',
    '18': 'ASUNCIÓN (Capital)'
};

/**
 * Códigos oficiales de Distritos (DIST)
 * Formato: 2 dígitos (relativo al departamento)
 * Clave completa: DPTO + DIST (ej: "0301" = Caacupé, Cordillera)
 */
const DISTRITOS_PY = {
    // 01 - CONCEPCIÓN
    '0101': 'CONCEPCIÓN',
    '0102': 'HORQUETA',
    '0103': 'YBY YAU',
    '0104': 'SAN LORENZO',
    '0105': 'BELÉN',
    '0106': 'SAN CARLOS',
    '0107': 'SAN ALBERTO',
    '0108': 'TENIENTE ESTEBAN MARTÍNEZ',
    '0109': 'SANTA ROSA DEL AGUARAY',
    '0110': 'SAN ANTONIO',
    '0111': 'CAMPO ACEVAL',
    '0112': 'LA LOMA (SAN ISIDRO)',
    '0113': 'PASO BARRETO',
    '0114': 'VILLAOLIVA',

    // 02 - SAN PEDRO
    '0201': 'SAN PEDRO DEL YCUAMANDYYÚ',
    '0202': 'SANTA ROSA DEL AGUARAY',
    '0203': 'SAN JOAQUÍN',
    '0204': 'ITACURUBÍ DEL ROSARIO',
    '0205': 'CHORE',
    '0206': 'SANTA ROSA DEL MBUTEY',
    '0207': 'YRYBUCURÚ',
    '0208': 'LIMA',
    '0209': 'GENERAL ISIDORO RESQUÍN',
    '0210': 'CAPIÍBARY',
    '0211': 'TACUATI',
    '0212': 'UNIÓN',
    '0213': 'YHU',
    '0214': 'SAN PABLO',
    '0215': 'SAN COSME Y DAMIÁN',
    '0216': 'ANTEQUERA',
    '0217': 'VEINTICINCO DE DICIEMBRE',
    '0218': 'TRES DE MAYO',
    '0219': 'NUEVE DE JULIO',
    '0220': 'LIBERTAD',

    // 03 - CORDILLERA
    '0301': 'CAACUPÉ',
    '0302': 'ALTOS',
    '0303': 'ARROYOS Y ESTEROS',
    '0304': 'ATYRÁ',
    '0305': 'CARAGUATAY',
    '0306': 'EMBOSCADA',
    '0307': 'EUSEBIO AYALA',
    '0308': 'ISLA PUCÚ',
    '0309': 'ITACURUBÍ DE LA CORDILLERA',
    '0310': 'JUAN DE MENA',
    '0311': 'LOMA GRANDE',
    '0312': 'MBOCAYATY DEL YHAGUY',
    '0313': 'NUEVA COLOMBIA',
    '0314': 'PIRIBEBUY',
    '0315': 'PRIMERO DE MARZO',
    '0316': 'SAN BERNARDINO',
    '0317': 'SANTA ELENA',
    '0318': 'TOBATÍ',
    '0319': 'VALENZUELA',
    '0320': 'SAN JOSÉ OBRERO',

    // 04 - GUAIRÁ
    '0401': 'VILLARRICA',
    '0402': 'CORONEL OVIEDO',
    '0403': 'MBOCAYATY',
    '0404': 'CAAGUAZÚ',
    '0405': 'SANTA ROSA DEL MIRACLE',
    '0406': 'ITAPE',
    '0407': 'SAN SALVADOR',
    '0408': 'YATAITY',
    '0409': 'FELIX PEREIRA',
    '0410': 'SANTIAGO',
    '0411': 'MBORORÉ',
    '0412': 'SAN JOSÉ DE LOS ARROYOS',
    '0413': 'INDIANAPOLIS',
    '0414': 'BORJA',

    // 05 - CAAGUAZÚ
    '0501': 'CORONEL OVIEDO',
    '0502': 'DR. JUAN MANUEL FRUTOS',
    '0503': 'SAN JOSÉ DE LOS ARROYOS',
    '0504': 'SANTA ROSA DEL MIRACLE',
    '0505': 'ITACURUBÍ DE LA CORDILLERA',
    '0506': 'R. I. T. 3 CORRALES',
    '0507': 'SAN ALFREDO',
    '0508': 'SANTA HELENA',
    '0509': 'YHU',
    '0510': 'SAN PATRICIO',
    '0511': 'MARISCAL FRANCISCO SOLANO LÓPEZ',
    '0512': 'SANTA ROSA DEL MBUTEY',
    '0513': 'NUEVA LONDRES',
    '0514': 'SANTA FE DEL PARANÁ',
    '0515': 'CHORE',

    // 06 - CAAZAPÁ
    '0601': 'CAAZAPÁ',
    '0602': 'YUTY',
    '0603': 'SAN JUAN NEPOMUCENO',
    '0604': 'MACIEL',
    '0605': 'TAVAÍ',
    '0606': 'BUENA VISTA',
    '0607': 'SANTA ANA',
    '0608': 'GENERAL HIGINIO MORÍNIGO',
    '0609': 'SANTA ROSA',
    '0610': 'SAN MIGUEL',

    // 07 - ITAPÚA
    '0701': 'ENCARNACIÓN',
    '0702': 'CAMPO GRANDE',
    '0703': 'CARMEN DEL PARANÁ',
    '0704': 'CAPITÁN MIRANDA',
    '0705': 'CARLOS ANTONIO LÓPEZ',
    '0706': 'CORONEL BOGADO',
    '0707': 'GENERAL ARTIGAS',
    '0708': 'GENERAL DELGADO',
    '0709': 'ITAPÚA POTY',
    '0710': 'JESÚS',
    '0711': 'LA PAZ',
    '0712': 'MARÍA AUXILIADORA',
    '0713': 'MAYOR OTAÑO',
    '0714': 'NATALICIO TALAVERA',
    '0715': 'OBLIGADO',
    '0716': 'PISTARA',
    '0717': 'SAN PEDRO DEL PARANÁ',
    '0718': 'TOMÁS ROMERO PEREIRA',
    '0719': 'TRINIDAD',
    '0720': 'ALTO VERA',
    '0721': 'BELLA VISTA',
    '0722': 'SAN COSME Y DAMIÁN',

    // 08 - MISIONES
    '0801': 'SAN JUAN BAUTISTA',
    '0802': 'SAN MIGUEL',
    '0803': 'SAN PATRICIO',
    '0804': 'SAN PEDRO',
    '0805': 'SAN PABLO',
    '0806': 'SANTA ROSA',
    '0807': 'SANTA MARÍA',
    '0808': 'SANTO DOMINGO',
    '0809': 'SAN IGNACIO GUAZÚ',
    '0810': 'SANTA CATALINA',
    '0811': 'YABEBIRY',
    '0812': 'VILLETA',

    // 09 - PARAGUARÍ
    '0901': 'PARAGUARÍ',
    '0902': 'CARAPEQUÁ',
    '0903': 'SAN ROQUE GONZÁLEZ',
    '0904': 'ACHA',
    '0905': 'CAAPUCÚ',
    '0906': 'ESPINILLO',
    '0907': 'GENERAL BERNARDINO CABALLERO',
    '0908': 'ISLA UMBÚ',
    '0909': 'ITÁ',
    '0910': 'LA COLMENA',
    '0911': 'MBURACAYÁ',
    '0912': 'PIRAYÚ',
    '0913': 'QUIIBYRY',
    '0914': 'QUINDY',
    '0915': 'SAN MIGUEL',
    '0916': 'SAPUCAY',
    '0917': 'TEBICUARYMI',
    '0918': 'YAGUARÓN',
    '0919': 'YBYTIRAMÕ',

    // 10 - ALTO PARANÁ
    '1001': 'CIUDAD DEL ESTE',
    '1002': 'DOMINGO MARTÍNEZ DE IRALA',
    '1003': 'HERNANDARIAS',
    '1004': 'IRUÑA',
    '1005': 'JUAN E. OLEARY',
    '1006': 'LOS CEDRALES',
    '1007': 'MINGA GUAZÚ',
    '1008': 'MINGA PORA',
    '1009': 'NUEVA ALBORADA',
    '1010': 'PRESIDENTE FRANCO',
    '1011': 'SAN ALBERTO',
    '1012': 'SAN CRISTÓBAL',
    '1013': 'SANTA FE DEL PARANÁ',
    '1014': 'SANTA RITA',
    '1015': 'SANTO DOMINGO',
    '1016': 'TATUYTÉ',

    // 11 - CENTRAL
    '1101': 'AREGUÁ',
    '1102': 'CAPIATÁ',
    '1103': 'FERNANDO DE LA MORA',
    '1104': 'GUARAMBARÉ',
    '1105': 'ITÁ',
    '1106': 'ITAUGUÁ',
    '1107': 'J. AUGUSTO SALDÍVAR',
    '1108': 'LAMBARÉ',
    '1109': 'LIMPIO',
    '1110': 'LUQUE',
    '1111': 'MARIANO ROQUE ALONSO',
    '1112': 'NUEVA ITALIA',
    '1113': 'ÑEMBY',
    '1114': 'SAN ANTONIO',
    '1115': 'SAN LORENZO',
    '1116': 'VILLA ELISA',
    '1117': 'VILLETA',
    '1118': 'YPACARAÍ',
    '1119': 'YPANÉ',
    '1121': 'VILLA YPANÉ',

    // 12 - ÑEEMBUCÚ
    '1201': 'PILAR',
    '1202': 'ALBERDI',
    '1203': 'CERRO LEÓN',
    '1204': 'DESMAYADO',
    '1205': 'GENERAL DÍAZ',
    '1206': 'HUMAITÁ',
    '1207': 'ISLA UMBÚ',
    '1208': 'LAURELES',
    '1209': 'MAYOR JOSÉ VILLALBA',
    '1210': 'PASO DE PATRIA',
    '1211': 'SAN JUAN BAUTISTA DE ÑEEMBUCÚ',
    '1212': 'SAN JOSÉ',
    '1213': 'TACUARAS',
    '1214': 'VILLA FRANCA',
    '1215': 'VILLA OLIVA',
    '1216': 'VITICI',

    // 13 - AMAMBAY
    '1301': 'PEDRO JUAN CABALLERO',
    '1302': 'BELLA VISTA',
    '1303': 'CAPITÁN BADO',
    '1304': 'CAROLINA',
    '1305': 'GENERAL FRANCISCO CABALLERO ÁLVAREZ',
    '1306': 'HERNANDARIAS',
    '1307': 'JUAN EMILIO OLEARY',
    '1308': 'MARA CAPETIAGUÁ',
    '1309': 'TENIENTE 1º MANUEL IRALA',
    '1310': 'ZANJA PYTÁ',

    // 14 - CANINDEYÚ
    '1401': 'SALTO DEL GUAIRÁ',
    '1402': 'CURUGUATY',
    '1403': 'VILLA YGUAZÚ',
    '1404': 'CORONEL CÁCERES',
    '1405': 'GENERAL FRANCISCO CABALLERO ÁLVAREZ',
    '1406': 'LA PALOMA',
    '1407': 'LIC. EUSEBIO AYALA',
    '1408': 'MAYOR JULIO CÉSAR MARTÍNEZ',
    '1409': 'NUEVA ESPERANZA',
    '1410': 'SAN ALFREDO',
    '1411': 'SAN CARLOS',
    '1412': 'SANTA ROSA',
    '1413': 'YRYBUCURÚ',
    '1414': 'YPEHU',

    // 15 - PRESIDENTE HAYES
    '1501': 'POZO COLORADO',
    '1502': 'BENJAMÍN ACEVAL',
    '1503': 'NANAWA',
    '1504': 'PUERTO MILITAR',
    '1505': 'TENIENTE 1º MANUEL IRALA',
    '1506': 'VILLA HAYES',
    '1507': 'GENERAL BERNARDINO CABALLERO',
    '1508': 'MONTELÍBANO',

    // 16 - BOQUERÓN
    '1601': 'FILADELFIA',
    '1602': 'LOMA PLATA',
    '1603': 'MARIANO ROQUE ALONSO',
    '1604': 'PUERTO CASADO',
    '1605': 'PUERTO PINASCO',

    // 17 - ALTO PARAGUAY
    '1701': 'FUERTE OLIMPO',
    '1702': 'PUERTO EL DESEO',
    '1703': 'SAN CARLOS',
    '1704': 'CERRO CHOVORECA',

    // 18 - ASUNCIÓN (Capital)
    '1801': 'ASUNCIÓN'
};

/**
 * Valida si un código de departamento es válido
 * @param {string} codigo - Código de 2 dígitos
 * @returns {boolean}
 */
function validarDPTO(codigo) {
    return DEPARTAMENTOS_PY[codigo] !== undefined;
}

/**
 * Valida si un código de distrito es válido
 * @param {string} codigo - Código de 4 dígitos (DPTO+DIST)
 * @returns {boolean}
 */
function validarDIST(codigo) {
    return DISTRITOS_PY[codigo] !== undefined;
}

/**
 * Obtiene el nombre del departamento por código
 * @param {string} codigo - Código de 2 dígitos
 * @returns {string|null}
 */
function getDepartamento(codigo) {
    return DEPARTAMENTOS_PY[codigo] || null;
}

/**
 * Obtiene el nombre del distrito por código (4 dígitos)
 * @param {string} codigo - Código de 4 dígitos
 * @returns {string|null}
 */
function getDistrito(codigo) {
    return DISTRITOS_PY[codigo] || null;
}

/**
 * Obtiene todos los distritos de un departamento
 * @param {string} dptoCodigo - Código de 2 dígitos del departamento
 * @returns {Object} Diccionario de distritos
 */
function getDistritosPorDepartamento(dptoCodigo) {
    const prefijo = dptoCodigo.substring(0, 2);
    let resultado = {};
    for (let codigo in DISTRITOS_PY) {
        if (codigo.startsWith(prefijo)) {
            resultado[codigo] = DISTRITOS_PY[codigo];
        }
    }
    return resultado;
}

/**
 * Valida la clave completa (formato: DPTO+DIST = 4 dígitos)
 * @param {string} clave - Clave de 4 dígitos
 * @returns {Object} {valido: boolean, dpto: string, dist: string, error: string}
 */
function validarClave(clave) {
    if (!clave || clave.length !== 4) {
        return { valido: false, error: 'La clave debe tener 4 dígitos (DPTO+DIST)' };
    }

    const dpto = clave.substring(0, 2);
    const dist = clave.substring(2, 4);

    if (!validarDPTO(dpto)) {
        return { valido: false, dpto, dist, error: `Departamento ${dpto} no válido` };
    }

    if (!validarDIST(clave)) {
        return { valido: false, dpto, dist, error: `Distrito ${dist} no válido para el departamento ${dpto}` };
    }

    return {
        valido: true,
        dpto: DEPARTAMENTOS_PY[dpto],
        dist: DISTRITOS_PY[clave]
    };
}

/**
 * Carga una capa de referencia (departamentos o distritos)
 * @param {string} layer - 'deptos' o 'distritos'
 * @returns {Promise<Object|null>} GeoJSON de la capa
 */
async function loadLayer(layer) {
    // Cache the raw GeoJSON for all districts first
    if (!_LAYERS_CACHE.allDistritos) {
        try {
            logger.debug('🔄 Iniciando carga de capa geográfica (DISTRITOS_PY_CNPV2022.geojson)...');
            
            // Intentar con ruta relativa a la raíz del proyecto para asegurar que funcione desde subcarpetas
            let url = 'data/DISTRITOS_PY_CNPV2022.geojson';
            let response = await fetch(url);
            
            if (!response.ok) {
                logger.warn(`⚠️ Archivo local no encontrado en ${url}, intentando ruta alternativa...`);
                url = './data/DISTRITOS_PY_CNPV2022.geojson';
                response = await fetch(url);
            }
            
            if (!response.ok) {
                logger.warn(`⚠️ Tampoco encontrado en ${url}, intentando GitHub...`);
                url = 'https://raw.githubusercontent.com/deividaranda/paraguay-geojson/master/paraguay.json';
                response = await fetch(url);
            }
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }
            
            logger.debug(`⏳ Descargando y parseando JSON desde: ${url} (Puede tomar unos segundos debido al tamaño)...`);
            const rawText = await response.text();
            try {
                _LAYERS_CACHE.allDistritos = JSON.parse(rawText);
            } catch (parseError) {
                // Algunos paquetes locales incluyen dos líneas de cabecera
                // (nombre del archivo + llave contenedora) antes del GeoJSON.
                const repairedText = rawText
                    .replace(/^\uFEFF?DISTRITOS_PY_CNPV2022\.geojson\s*/i, '')
                    .replace(/^\s*\{\s*(?=\{\s*"type"\s*:)/, '');
                _LAYERS_CACHE.allDistritos = JSON.parse(repairedText);
                logger.warn('La cabecera no JSON de la capa distrital fue reparada de forma determinista.');
            }
            logger.debug(`✅ Datos de referencia cargados exitosamente.`);
            
        } catch (error) {
            logger.error(`❌ Error Crítico en loadLayer: No se pudieron cargar los datos de distritos. Validación geográfica desactivada.`, error);
            if (typeof showToast !== 'undefined') {
                showToast('Error cargando capa de distritos (46MB). Validación geográfica desactivada.', 'error');
            }
            return null;
        }
    }

    const allDistritosGeoJSON = _LAYERS_CACHE.allDistritos;

    if (layer === 'deptos') {
        if (_LAYERS_CACHE.deptosProcessed) {
            return _LAYERS_CACHE.deptosProcessed;
        }
        // Process departments: dissolve and simplify
        if (typeof turf === 'undefined') {
            logger.error('Turf.js no está disponible para procesar departamentos.');
            return null;
        }
        let deptosGeoJSON = turf.dissolve(allDistritosGeoJSON, { propertyName: 'DPTO_DESC' });
        deptosGeoJSON = turf.simplify(deptosGeoJSON, { tolerance: 0.001, highQuality: false });
        _LAYERS_CACHE.deptosProcessed = deptosGeoJSON;
        logger.debug(`✅ Capa de Departamentos procesada.`);
        return deptosGeoJSON;

    } else if (layer === 'distritos') {
        if (_LAYERS_CACHE.distritosRaw) {
            return _LAYERS_CACHE.distritosRaw;
        }
        // For districts, return the raw data
        _LAYERS_CACHE.distritosRaw = allDistritosGeoJSON;
        logger.debug(`✅ Capa de Distritos lista.`);
        return allDistritosGeoJSON;

    } else if (layer === 'barrios') {
        if (_LAYERS_CACHE.barrios) {
            return _LAYERS_CACHE.barrios;
        }
        try {
            logger.debug('🔄 Cargando capa de barrios (barrios_asuncion_central_light.geojson)...');
            const resp = await fetch('data/barrios_asuncion_central_light.geojson');
            if (resp.ok) {
                _LAYERS_CACHE.barrios = await resp.json();
                logger.debug('✅ Capa de Barrios lista.');
                return _LAYERS_CACHE.barrios;
            }
        } catch (e) {
            logger.error('Error cargando capa de barrios:', e);
        }
        return null;
    } else if (layer === 'manzanas') {
        if (_LAYERS_CACHE.manzanas) {
            return _LAYERS_CACHE.manzanas;
        }
        try {
            logger.debug('🔄 Cargando capa de manzanas (manzanas_asuncion_light.geojson)...');
            const resp = await fetch('data/manzanas_asuncion_light.geojson');
            if (resp.ok) {
                _LAYERS_CACHE.manzanas = await resp.json();
                logger.debug('✅ Capa de Manzanas lista.');
                return _LAYERS_CACHE.manzanas;
            }
        } catch (e) {
            logger.error('Error cargando capa de manzanas:', e);
        }
        return null;
    } else if (layer === 'casco_urbano' || layer === 'ejido_urbano') {
        if (_LAYERS_CACHE.cascoUrbano) {
            return _LAYERS_CACHE.cascoUrbano;
        }
        try {
            logger.debug('🔄 Cargando capa de cascos y ejidos urbanos (casco_urbano_snc.geojson)...');
            const resp = await fetch('data/casco_urbano_snc.geojson');
            if (resp.ok) {
                _LAYERS_CACHE.cascoUrbano = await resp.json();
                logger.debug('✅ Capa de Cascos Urbanos SNC lista.');
                return _LAYERS_CACHE.cascoUrbano;
            }
        } catch (e) {
            logger.error('Error cargando capa de cascos urbanos:', e);
        }
        return null;
    } else if (layer === 'all') { // Added for MapEngine to get the raw data
        return allDistritosGeoJSON;
    }
    else {
        logger.warn(`Capa desconocida solicitada: ${layer}`);
        return null;
    }
}

/**
 * Extrae departamento y distrito basado en coordenadas
 * @param {Array} coords - [lng, lat]
 * @param {Object} deptosGeoJSON - GeoJSON de departamentos
 * @param {Object} distritosGeoJSON - GeoJSON de distritos
 * @returns {Object} { departamento: string, distrito: string }
 */
function extractDeptAndDistrict(coords, deptosGeoJSON, distritosGeoJSON) {
    const result = { departamento: null, distrito: null };
    
    if (!coords || coords.length < 2) return result;
    const [lng, lat] = coords;
    
    try {
        // Buscar departamento (punto dentro de polígono)
        if (deptosGeoJSON?.features) {
            for (const feature of deptosGeoJSON.features) {
                try {
                    const point = turf.point([lng, lat]);
                    const isInside = turf.booleanPointInPolygon(point, feature);
                    if (isInside) {
                        result.departamento = feature.properties?.DPTO_DESC || 
                                            feature.properties?.DEPARTAMEN || 
                                            feature.properties?.NOMBRE || null;
                        break;
                    }
                } catch (e) {
                    // Continuar con siguiente feature
                }
            }
        }
        
        // Buscar distrito
        if (distritosGeoJSON?.features) {
            for (const feature of distritosGeoJSON.features) {
                try {
                    const point = turf.point([lng, lat]);
                    const isInside = turf.booleanPointInPolygon(point, feature);
                    if (isInside) {
                        result.distrito = feature.properties?.DIST_DESC_ || 
                                          feature.properties?.DISTRITO || 
                                          feature.properties?.NOMBRE || null;
                        break;
                    }
                } catch (e) {
                    // Continuar con siguiente feature
                }
            }
        }
        
    } catch (error) {
        logger.error('Error en extractDeptAndDistrict:', error);
    }
    
    return result;
}

// Exportar para uso en módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEPARTAMENTOS_PY,
        DISTRITOS_PY,
        validarDPTO,
        validarDIST,
        getDepartamento,
        getDistrito,
        getDistritosPorDepartamento,
        validarClave,
        loadLayer,           // ✅ AGREGADO
        extractDeptAndDistrict  // ✅ AGREGADO
    };
}

// Exportar para módulos ES6 (import)
export {
    DEPARTAMENTOS_PY,
    DISTRITOS_PY,
    validarDPTO,
    validarDIST,
    getDepartamento,
    getDistrito,
    getDistritosPorDepartamento,
    validarClave,
    loadLayer,           // ✅ AGREGADO
    extractDeptAndDistrict  // ✅ AGREGADO
};

// Exponer a window para uso global
if (typeof window !== "undefined") window.ParaguayRef = {
    DEPARTAMENTOS_PY,
    DISTRITOS_PY,
    validarDPTO,
    validarDIST,
    getDepartamento,
    getDistrito,
    getDistritosPorDepartamento,
    validarClave,
    loadLayer,
    extractDeptAndDistrict
};
