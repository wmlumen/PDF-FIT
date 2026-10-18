/**
 * Configuración Global del Sistema
 * Resolución SNC N° 551/2023 - Paraguay
 */

// Códigos EPSG y proyecciones
export const EPSG_32720 = 'EPSG:32720';
export const EPSG_32721 = 'EPSG:32721';

// Cadena Proj4js para WGS84 UTM Zona 20 Sur
export const PROJ_32720 = '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs';
// Cadena Proj4js para WGS84 UTM Zona 21 Sur
export const PROJ_32721 = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';

// Cadena WKT completa para archivo .prj del Shapefile
export const WKT_32721 = 'PROJCS["WGS_1984_UTM_Zone_21S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-57.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';

// Rangos de longitud para las zonas UTM (aproximados para Paraguay)
export const UTM_ZONE_RANGES = {
    'EPSG:32721': { minLng: -60, maxLng: -54, name: 'UTM 21S' }, // Paraguay Oriental
    'EPSG:32720': { minLng: -66, maxLng: -60, name: 'UTM 20S' }  // Paraguay Occidental (Chaco)
};

// Tolerancias de área según Res. 551/2023
export const TOLERANCIAS = {
    URBANO: 0.05,   // ±5% para zonas urbanas
    RURAL: 0.10     // ±10% para zonas rurales
};

// Campos obligatorios exigidos por la Resolución SNC N° 551/2023
// Alineados con la documentación y exportación oficial
export const CAMPOS_REQUERIDOS = [
    'CODIGO',
    'PROPIETARIO',
    'USO_TIERRA',
    'SUP_TITULO',
    'DEPARTAMEN',
    'DISTRITO',
    'PADRON',
    'ZONA',
    'MANZANA',
    'LOTE',
    'SUP_SIG_M',
    'SUP_LEGAL',
    'REG_PROF',
    'FINCA',
    'MATRICULA',
    'COLONIA'
];

// Especificación oficial de campos del Anexo SNC 551/2023
export const ESPECIFICACION_CAMPOS_SNC = {
    CODIGO: { tipo: 'texto', longitud: 20 },
    PROPIETARIO: { tipo: 'texto', longitud: 50 },
    USO_TIERRA: { tipo: 'texto', longitud: 10 },
    SUP_TITULO: { tipo: 'decimal', longitud: 18, decimales: 2 },
    DEPARTAMEN: { tipo: 'texto', longitud: 30 },
    DISTRITO: { tipo: 'texto', longitud: 30 },
    PADRON: { tipo: 'texto', longitud: 20 },
    ZONA: { tipo: 'texto', longitud: 10 },
    MANZANA: { tipo: 'texto', longitud: 10 },
    LOTE: { tipo: 'texto', longitud: 10 },
    SUP_SIG_M: { tipo: 'decimal', longitud: 18, decimales: 4 },
    SUP_LEGAL: { tipo: 'decimal', longitud: 18, decimales: 2 },
    REG_PROF: { tipo: 'texto', longitud: 30 },
    FINCA: { tipo: 'texto', longitud: 10 },
    MATRICULA: { tipo: 'texto', longitud: 10 },
    COLONIA: { tipo: 'texto', longitud: 30 }
};

export const CAMPOS_URBANOS = [];
export const CAMPOS_RURALES = [];

// Metadatos geodésicos obligatorios por SNC (vinculación a Red Geodésica Nacional / CORS)
export const METADATOS_GEODESICOS = [
    'PUNTO_CONTROL_TIPO',      // 'CORS_ACTIVA', 'MARCO_PASIVO_IGN', 'BASE_PROPIA'
    'ESTACION_CORS_NOMBRE',    // Ej: 'PYAR' (Asunción), 'PYCN' (Cnel. Oviedo)
    'METODO_POSICIONAMIENTO',  // 'RTK_NTRIP', 'POST_PROCESO_ESTATICO'
    'PRECISION_HORIZONTAL_M',  // Precisión horizontal en metros
    'FECHA_RASTREO',           // Fecha del levantamiento GNSS
    'OPERADOR_GNSS',           // Nombre/matrícula del operador
    'EQUIPO_GNSS'              // Modelo del receptor GNSS utilizado
];

// Configuración Municipal (Ley Orgánica Municipal Nº 3966/2010)
export const CONFIG_MUNICIPAL = {
    frenteMinimo: 12.0,              // Metros (mínimo legal para lotes urbanos)
    superficieMinima: 360.0,         // m² (mínimo legal para lotes urbanos)
    porcentajeCallesMin: 0.16,       // 16% cesión vial obligatoria
    porcentajePlazasMin: 0.05,       // 5% mínimo espacios verdes/edificios públicos
    porcentajePlazasMax: 0.07,       // 7% máximo
    franjaHidricaMinima: 30.0,       // Metros (Ley 3239/2007 - servidumbre hídrica)
    retiroFondoMinimo: 3.0,          // Metros (retiro de fondo típico)
    retiroLateralMinimo: 1.5         // Metros (retiro lateral típico)
};

// Umbral para simplificación de geometrías (Douglas-Peucker)
export const SIMPLIFY_THRESHOLD = 0.001;  // metros (UTM)
export const MAX_VERTICES_BEFORE_SIMPLIFY = 15000;

// ============================================
// CONFIGURACIÓN DEL MAPA - CORREGIDA
// ============================================
export const MAP_CONFIG = {
    // Centro de Paraguay (coordenadas CORRECTAS)
    // Asunción: -25.2637, -57.5759
    center: [-25.2637, -57.5759],  // ¡Corregido! Antes estaba en [-23, -58]
    zoom: 13,                        // Zoom más cercano para ver Asunción
    minZoom: 5,
    maxZoom: 19
};

// Estados de uso de tierra
export const USOS_TIERRA = ['URBANO', 'RURAL'];

// Mensajes del sistema
export const MENSAJES = {
    NO_GEOJSON: 'No hay geometrías cargadas',
    NO_DATOS: 'No hay datos tabulares cargados',
    VALIDACION_OK: 'Validación exitosa. Puede exportar el Shapefile.',
    VALIDACION_ERROR: 'Se encontraron errores. Revise el reporte.',
    EXPORT_OK: 'Exportación completada exitosamente',
    SIN_CAMBIOS: 'No hay cambios pendientes',
    CARGA_EXITO: 'Archivo cargado correctamente',
    CARGA_ERROR: 'Error al cargar el archivo'
};
