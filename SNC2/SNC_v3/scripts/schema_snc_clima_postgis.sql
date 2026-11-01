-- ============================================================================
-- SISTEMA NACIONAL DE CATASTRO (SNC) • LEY Nº 551/2023 & LEY Nº 3966/2010
-- SNC-CLIMA: ARQUITECTURA POSTGRESQL + POSTGIS (GEMELO DIGITAL CLIMÁTICO)
-- Versión: 4.0.0 (CIHT / Digital Twin Paraguay)
-- ============================================================================

-- Habilitación de extensiones geoespaciales
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ----------------------------------------------------------------------------
-- 0. CREACIÓN DE LOS 12 ESQUEMAS MODULARES
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS catastro;
CREATE SCHEMA IF NOT EXISTS hidro;
CREATE SCHEMA IF NOT EXISTS clima;
CREATE SCHEMA IF NOT EXISTS ambiente;
CREATE SCHEMA IF NOT EXISTS infraestructura;
CREATE SCHEMA IF NOT EXISTS riesgos;
CREATE SCHEMA IF NOT EXISTS simulacion;
CREATE SCHEMA IF NOT EXISTS indicadores;
CREATE SCHEMA IF NOT EXISTS ia;
CREATE SCHEMA IF NOT EXISTS historico;

-- ----------------------------------------------------------------------------
-- 1. SCHEMA ADMIN (División Político-Administrativa del Paraguay)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.departamentos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    superficie_km2 NUMERIC(10,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_deptos_geom ON admin.departamentos USING GIST (geom);

CREATE TABLE IF NOT EXISTS admin.distritos (
    id BIGSERIAL PRIMARY KEY,
    depto_id INTEGER REFERENCES admin.departamentos(id) ON DELETE CASCADE,
    codigo_dnit VARCHAR(10),
    nombre VARCHAR(120) NOT NULL,
    poblacion INTEGER DEFAULT 0,
    superficie_km2 NUMERIC(10,2),
    cota_media_m NUMERIC(6,2),
    ranking_vulnerabilidad INTEGER,
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_distritos_geom ON admin.distritos USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_admin_distritos_nom ON admin.distritos (nombre);

CREATE TABLE IF NOT EXISTS admin.barrios (
    id BIGSERIAL PRIMARY KEY,
    distrito_id BIGINT REFERENCES admin.distritos(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(30) DEFAULT 'URBANO', -- URBANO, RURAL, COMUNIDAD_INDIGENA
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_barrios_geom ON admin.barrios USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 2. SCHEMA CATASTRO (Unidad Fundamental: Parcela y Construcciones 3D)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catastro.parcelas (
    id BIGSERIAL PRIMARY KEY,
    cuenta_ctral VARCHAR(50) UNIQUE NOT NULL, -- Código CCC o Padrón
    distrito_id BIGINT REFERENCES admin.distritos(id),
    padron VARCHAR(30),
    finca VARCHAR(30),
    superficie_m2 NUMERIC(12,2) NOT NULL,
    valor_fiscal_dnit NUMERIC(15,2),
    uso_suelo VARCHAR(50) DEFAULT 'RESIDENCIAL',
    cota_media NUMERIC(6,2),
    pendiente_pct NUMERIC(5,2),
    distancia_cauce_m NUMERIC(8,2),
    dentro_franja_proteccion BOOLEAN GENERATED ALWAYS AS (distancia_cauce_m < 40.0) STORED,
    resiliencia_score NUMERIC(5,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catastro_parcelas_geom ON catastro.parcelas USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_catastro_parcelas_ccc ON catastro.parcelas (cuenta_ctral);

CREATE TABLE IF NOT EXISTS catastro.edificaciones (
    id BIGSERIAL PRIMARY KEY,
    parcela_id BIGINT REFERENCES catastro.parcelas(id) ON DELETE SET NULL,
    osm_id BIGINT,
    tipo VARCHAR(50) DEFAULT 'edificio',
    pisos INTEGER DEFAULT 1,
    altura NUMERIC(5,2) DEFAULT 3.0,
    material VARCHAR(50),
    ocupantes_est INTEGER DEFAULT 4,
    cota_piso_m NUMERIC(6,2),
    cota_techo_m NUMERIC(6,2),
    geom GEOMETRY(POLYGONZ, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catastro_edif_geom ON catastro.edificaciones USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 3. SCHEMA HIDRO (Red Fluvial, Cuencas y Monitoreo Telemétrico)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hidro.cuencas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    area_km2 NUMERIC(10,2),
    tiempo_concentracion_horas NUMERIC(5,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hidro_cuencas_geom ON hidro.cuencas USING GIST (geom);

CREATE TABLE IF NOT EXISTS hidro.rios (
    id BIGSERIAL PRIMARY KEY,
    cuenca_id BIGINT REFERENCES hidro.cuencas(id),
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(30) DEFAULT 'PERMANENTE', -- PERMANENTE, TEMPORAL
    caudal_m3s NUMERIC(10,2),
    cota_desborde_alerta NUMERIC(6,2),
    geom GEOMETRY(MULTILINESTRING, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hidro_rios_geom ON hidro.rios USING GIST (geom);

CREATE TABLE IF NOT EXISTS hidro.arroyos (
    id BIGSERIAL PRIMARY KEY,
    cuenca_id BIGINT REFERENCES hidro.cuencas(id),
    nombre VARCHAR(120) NOT NULL,
    longitud_km NUMERIC(8,2),
    geom GEOMETRY(MULTILINESTRING, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hidro_arroyos_geom ON hidro.arroyos USING GIST (geom);

CREATE TABLE IF NOT EXISTS hidro.humedales (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150),
    tipo VARCHAR(50) DEFAULT 'ESTERALE_PALUDICO',
    area_ha NUMERIC(10,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hidro_humedales_geom ON hidro.humedales USING GIST (geom);

CREATE TABLE IF NOT EXISTS hidro.sensores_nivel (
    id BIGSERIAL PRIMARY KEY,
    codigo_estacion VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    rio_id BIGINT REFERENCES hidro.rios(id),
    lat NUMERIC(9,6) NOT NULL,
    lon NUMERIC(9,6) NOT NULL,
    cota_cero_sensor NUMERIC(6,2) NOT NULL,
    nivel_alerta_amarilla NUMERIC(5,2),
    nivel_alerta_naranja NUMERIC(5,2),
    nivel_evacuacion_roja NUMERIC(5,2),
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hidro_sensores_geom ON hidro.sensores_nivel USING GIST (geom);

-- Serie Temporal Particionada de Niveles de Río
CREATE TABLE IF NOT EXISTS hidro.nivel_rio_tiempo (
    id BIGSERIAL,
    sensor_id BIGINT REFERENCES hidro.sensores_nivel(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    nivel_m NUMERIC(6,3) NOT NULL,
    caudal_m3s NUMERIC(10,2),
    PRIMARY KEY (id, fecha)
) PARTITION BY RANGE (fecha);

CREATE TABLE IF NOT EXISTS hidro.nivel_rio_2024 PARTITION OF hidro.nivel_rio_tiempo
    FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS hidro.nivel_rio_2025 PARTITION OF hidro.nivel_rio_tiempo
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS hidro.nivel_rio_2026 PARTITION OF hidro.nivel_rio_tiempo
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE INDEX IF NOT EXISTS idx_hidro_tiempo_sensor_fecha ON hidro.nivel_rio_tiempo (sensor_id, fecha DESC);

-- ----------------------------------------------------------------------------
-- 4. SCHEMA CLIMA (Estaciones Meteorológicas y Redes de Radar)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clima.estaciones (
    id BIGSERIAL PRIMARY KEY,
    codigo_wmo VARCHAR(30),
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'AUTOMATICA_DINAC',
    cota_msnm NUMERIC(6,2),
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clima_estaciones_geom ON clima.estaciones USING GIST (geom);

CREATE TABLE IF NOT EXISTS clima.observaciones (
    id BIGSERIAL,
    estacion_id BIGINT REFERENCES clima.estaciones(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    temperatura_c NUMERIC(4,1),
    humedad_pct NUMERIC(4,1),
    lluvia_mm NUMERIC(6,2),
    viento_ms NUMERIC(4,1),
    presion_hpa NUMERIC(6,1),
    PRIMARY KEY (id, fecha)
) PARTITION BY RANGE (fecha);

CREATE TABLE IF NOT EXISTS clima.observaciones_2026 PARTITION OF clima.observaciones
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE INDEX IF NOT EXISTS idx_clima_obs_estacion_fecha ON clima.observaciones (estacion_id, fecha DESC);

CREATE TABLE IF NOT EXISTS clima.radar_lluvia (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    intensidad_mm_h NUMERIC(6,2) NOT NULL,
    geom GEOMETRY(POLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clima_radar_geom ON clima.radar_lluvia USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 5. SCHEMA AMBIENTE (Coberturas, Incendios Satelitales y Carbono)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ambiente.cobertura_suelo (
    id BIGSERIAL PRIMARY KEY,
    clase VARCHAR(50) NOT NULL, -- BOSQUE, PASTURA, CULTIVO, AGUA, URBANO
    fuente VARCHAR(50) DEFAULT 'INFONA_MAPBIOMAS',
    anio INTEGER DEFAULT 2024,
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ambiente_cobertura_geom ON ambiente.cobertura_suelo USING GIST (geom);

CREATE TABLE IF NOT EXISTS ambiente.incendios (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    frp_mw NUMERIC(7,2) NOT NULL,
    brillo_kelvin NUMERIC(6,2),
    confianza VARCHAR(20),
    satelite VARCHAR(50) NOT NULL,
    distrito_id BIGINT REFERENCES admin.distritos(id),
    area_estimada_ha NUMERIC(8,2),
    evento_historico VARCHAR(150),
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ambiente_incendios_geom ON ambiente.incendios USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ambiente_incendios_fecha ON ambiente.incendios (fecha DESC);

CREATE TABLE IF NOT EXISTS ambiente.carbono (
    id BIGSERIAL PRIMARY KEY,
    parcela_id BIGINT UNIQUE REFERENCES catastro.parcelas(id) ON DELETE CASCADE,
    captura_ton NUMERIC(8,2) DEFAULT 0,
    emision_ton NUMERIC(8,2) DEFAULT 0,
    balance_ton NUMERIC(8,2) GENERATED ALWAYS AS (captura_ton - emision_ton) STORED,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. SCHEMA INFRAESTRUCTURA (Equipamientos Críticos y Resiliencia Ley 3966)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infraestructura.hospitales (
    id BIGSERIAL PRIMARY KEY,
    distrito_id BIGINT REFERENCES admin.distritos(id),
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50),
    camas INTEGER DEFAULT 0,
    cota_terreno NUMERIC(6,2),
    generador_emergencia BOOLEAN DEFAULT FALSE,
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_infra_hospitales_geom ON infraestructura.hospitales USING GIST (geom);

CREATE TABLE IF NOT EXISTS infraestructura.escuelas (
    id BIGSERIAL PRIMARY KEY,
    distrito_id BIGINT REFERENCES admin.distritos(id),
    codigo_mec VARCHAR(30),
    nombre VARCHAR(150) NOT NULL,
    zona VARCHAR(20) DEFAULT 'URBANA',
    alumnos INTEGER DEFAULT 0,
    apto_albergue BOOLEAN DEFAULT TRUE,
    capacidad_albergue INTEGER DEFAULT 100,
    cota_terreno NUMERIC(6,2),
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_infra_escuelas_geom ON infraestructura.escuelas USING GIST (geom);

CREATE TABLE IF NOT EXISTS infraestructura.refugios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    capacidad_personas INTEGER NOT NULL,
    ocupacion_actual INTEGER DEFAULT 0,
    cota_segura NUMERIC(6,2) NOT NULL,
    tiene_agua_potable BOOLEAN DEFAULT TRUE,
    tiene_energia_respaldo BOOLEAN DEFAULT TRUE,
    geom GEOMETRY(POINT, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_infra_refugios_geom ON infraestructura.refugios USING GIST (geom);

CREATE TABLE IF NOT EXISTS infraestructura.puentes (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ruta VARCHAR(50),
    estado VARCHAR(30) DEFAULT 'TRANSITABLE', -- TRANSITABLE, PRECAUCION, CORTADO
    cota_inundacion NUMERIC(6,2) NOT NULL,
    cota_rasante NUMERIC(6,2) NOT NULL,
    geom GEOMETRY(LINESTRING, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_infra_puentes_geom ON infraestructura.puentes USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 7. SCHEMA RIESGOS (Zonificación de Amenaza y Vulnerabilidad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS riesgos.zonas_inundacion (
    id BIGSERIAL PRIMARY KEY,
    escenario VARCHAR(100) NOT NULL, -- TR10, TR50, TR100, ROTURA_DEFENSA
    retorno_anios INTEGER,
    cota_agua_msnm NUMERIC(6,2) NOT NULL,
    profundidad_media_m NUMERIC(5,2),
    velocidad_ms NUMERIC(4,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_riesgos_inund_geom ON riesgos.zonas_inundacion USING GIST (geom);

CREATE TABLE IF NOT EXISTS riesgos.zonas_sequia (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    indice_spei NUMERIC(4,2),
    nivel_estres VARCHAR(30), -- LEVE, MODERADO, SEVERO, EXTREMO
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_riesgos_sequia_geom ON riesgos.zonas_sequia USING GIST (geom);

CREATE TABLE IF NOT EXISTS riesgos.zonas_incendio (
    id BIGSERIAL PRIMARY KEY,
    nivel_riesgo VARCHAR(30) NOT NULL, -- BAJO, MEDIO, ALTO, EXTREMO
    combustible_tn_ha NUMERIC(6,2),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_riesgos_incendio_geom ON riesgos.zonas_incendio USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 8. SCHEMA SIMULACION (Gemelo Digital Dinámico 4D)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulacion.escenarios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo VARCHAR(50) NOT NULL, -- LLUVIA_TORRENCIAL, CRECIDA_FLUVIAL, RUPTURA_INFRAESTRUCTURA
    precipitacion_mm NUMERIC(6,2),
    duracion_horas INTEGER
);

CREATE TABLE IF NOT EXISTS simulacion.simulacion_hidrica (
    id BIGSERIAL PRIMARY KEY,
    escenario_id BIGINT REFERENCES simulacion.escenarios(id) ON DELETE CASCADE,
    paso_hora INTEGER NOT NULL,
    nivel_agua_m NUMERIC(6,2) NOT NULL,
    personas_afectadas INTEGER DEFAULT 0,
    parcelas_afectadas INTEGER DEFAULT 0,
    edificaciones_afectadas INTEGER DEFAULT 0,
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sim_hidrica_geom ON simulacion.simulacion_hidrica USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 9. SCHEMA INDICADORES (Cota Segura ICST e IRCT 10 Dimensiones)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS indicadores.icst (
    parcela_id BIGINT PRIMARY KEY REFERENCES catastro.parcelas(id) ON DELETE CASCADE,
    cota_terreno NUMERIC(6,2) NOT NULL,
    cota_crecida_diseno NUMERIC(6,2) NOT NULL,
    cota_segura_minima NUMERIC(6,2) GENERATED ALWAYS AS (cota_crecida_diseno + 1.50) STORED,
    margen_seguridad_m NUMERIC(6,2) GENERATED ALWAYS AS (cota_terreno - (cota_crecida_diseno + 1.50)) STORED,
    indice_seguridad INTEGER NOT NULL,
    estado_legal VARCHAR(50) NOT NULL, -- APTO_SEGURO, CONDICIONADO, NO_APTO_RESTRINGIDO
    dictamen_ley3966 TEXT NOT NULL,
    fecha_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_indicadores_icst_estado ON indicadores.icst (estado_legal);

CREATE TABLE IF NOT EXISTS indicadores.irct_parcela (
    parcela_id BIGINT PRIMARY KEY REFERENCES catastro.parcelas(id) ON DELETE CASCADE,
    resiliencia_hidrica NUMERIC(5,2) NOT NULL,
    resiliencia_sequia NUMERIC(5,2) NOT NULL,
    resiliencia_incendio NUMERIC(5,2) NOT NULL,
    biodiversidad_cobertura NUMERIC(5,2) NOT NULL,
    infraestructura_acceso NUMERIC(5,2) NOT NULL,
    vulnerabilidad_social NUMERIC(5,2) NOT NULL,
    seguridad_hospitalaria NUMERIC(5,2) NOT NULL,
    red_educativa_refugios NUMERIC(5,2) NOT NULL,
    regulacion_pout NUMERIC(5,2) NOT NULL,
    captura_carbono NUMERIC(5,2) NOT NULL,
    irct_total NUMERIC(5,2) NOT NULL,
    clasificacion VARCHAR(50) NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_indicadores_irct_total ON indicadores.irct_parcela (irct_total);

-- ----------------------------------------------------------------------------
-- 10. VISTAS ANALÍTICAS DECISION INTELLIGENCE (SNC-DI)
-- ----------------------------------------------------------------------------

-- Vista Ejecutiva de Resiliencia y Riesgo Distrital
CREATE OR REPLACE VIEW indicadores.v_resumen_distrital_ciht AS
SELECT 
    d.id AS distrito_id,
    d.nombre AS distrito,
    dept.nombre AS departamento,
    d.cota_media_m,
    COUNT(p.id) AS total_parcelas,
    COUNT(CASE WHEN p.dentro_franja_proteccion THEN 1 END) AS parcelas_en_franja_hidrica_40m,
    COUNT(CASE WHEN ic.estado_legal = 'APTO_SEGURO' THEN 1 END) AS parcelas_icst_seguras,
    COUNT(CASE WHEN ic.estado_legal = 'CONDICIONADO' THEN 1 END) AS parcelas_icst_condicionadas,
    COUNT(CASE WHEN ic.estado_legal = 'NO_APTO_RESTRINGIDO' THEN 1 END) AS parcelas_icst_inundables,
    ROUND(AVG(COALESCE(ir.irct_total, 50)), 1) AS promedio_irct_distrital,
    COUNT(h.id) AS total_hospitales,
    COUNT(e.id) AS total_escuelas_albergues
FROM admin.distritos d
JOIN admin.departamentos dept ON d.depto_id = dept.id
LEFT JOIN catastro.parcelas p ON ST_Intersects(d.geom, p.geom)
LEFT JOIN indicadores.icst ic ON p.id = ic.parcela_id
LEFT JOIN indicadores.irct_parcela ir ON p.id = ir.parcela_id
LEFT JOIN infraestructura.hospitales h ON ST_Intersects(d.geom, h.geom)
LEFT JOIN infraestructura.escuelas e ON ST_Intersects(d.geom, e.geom)
GROUP BY d.id, d.nombre, dept.nombre, d.cota_media_m;

-- Comentario formal de auditoría
COMMENT ON SCHEMA indicadores IS 'Índices de Inteligencia Territorial SNC-DI (ICST Ley 3966 Art 235 e IRCT 10 dimensiones)';
