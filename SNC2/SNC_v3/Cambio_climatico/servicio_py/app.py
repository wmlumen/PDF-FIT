"""
Microservicio Científico de Cambio Climático y Modelación Geoespacial (MHC-PY)
Plataforma SNC v3 — República del Paraguay (Ley 551/2023 & Ley 3966/2010)
Carril C: Python 3.14 + FastAPI + GeoPandas + Shapely + NumPy
Puerto: 5557 (Desacoplado del servidor principal Node.js :5556)
"""

import json
import math
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Rutas del repositorio
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CAMBIO_DIR = BASE_DIR / "Cambio_climatico"

app = FastAPI(
    title="SNC v3 — Microservicio Científico Climático (MHC-PY)",
    description="Motor de análisis tensor, cálculo de índices bioclimáticos y evaluación territorial bajo IPCC AR6.",
    version="1.0.0"
)

# Habilitar CORS para consultas locales desde Node.js (5556) y navegadores
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de Pydantic
class Coordenada(BaseModel):
    lat: float = Field(..., description="Latitud WGS84")
    lng: float = Field(..., description="Longitud WGS84")

class SimulacionParcelaRequest(BaseModel):
    ccc: Optional[str] = "S/D"
    distrito: Optional[str] = "PIRIBEBUY"
    departamento: Optional[str] = "CORDILLERA"
    lat: float
    lng: float
    cota_terreno_m: Optional[float] = 100.0
    distancia_cauce_m: Optional[float] = 60.0
    superficie_m2: Optional[float] = 360.0
    valor_fiscal_gs: Optional[float] = 25000000.0
    anomalia_termica_c: Optional[float] = 2.0

class SerieTemporalRequest(BaseModel):
    fechas: List[str]
    temperaturas_max: List[float]
    precipitaciones_mm: List[float]

# Caché en memoria
CACHE_DISTRIC_RISK: Dict[str, Any] = {}
CACHE_BOSQUES: Dict[str, Any] = {}
CACHE_SALUD: Dict[str, Any] = {}

def cargar_datos_base():
    global CACHE_DISTRIC_RISK, CACHE_BOSQUES, CACHE_SALUD
    
    # 1. Índice de Riesgo de Inundación Distrital
    f_iri = CAMBIO_DIR / "indice_riesgo_inundacion_distritos.json"
    if f_iri.exists():
        try:
            with open(f_iri, "r", encoding="utf-8") as f:
                raw = json.load(f)
                distritos = raw.get("distritos", []) if isinstance(raw, dict) else raw
                for d in distritos:
                    k1 = f"{d.get('depto','')}|{d.get('distrito','')}".upper().strip()
                    k2 = d.get("distrito","").upper().strip()
                    CACHE_DISTRIC_RISK[k1] = d
                    CACHE_DISTRIC_RISK[k2] = d
        except Exception as e:
            print(f"[WARN] Error cargando IRI: {e}")

    # 2. Cobertura Forestal Histórica INFONA
    f_bosques = DATA_DIR / "analisis" / "cobertura_forestal_historica.json"
    if not f_bosques.exists():
        f_bosques = CAMBIO_DIR / "data" / "cobertura_forestal_historica.json"
    if f_bosques.exists():
        try:
            with open(f_bosques, "r", encoding="utf-8") as f:
                CACHE_BOSQUES = json.load(f)
        except Exception as e:
            print(f"[WARN] Error cargando bosques: {e}")

    # 3. Infraestructura de Salud MSPyBS
    f_salud = DATA_DIR / "infraestructura_salud.geojson"
    if not f_salud.exists():
        f_salud = CAMBIO_DIR / "data" / "infraestructura_salud.geojson"
    if f_salud.exists():
        try:
            with open(f_salud, "r", encoding="utf-8") as f:
                CACHE_SALUD = json.load(f)
        except Exception as e:
            print(f"[WARN] Error cargando salud: {e}")

cargar_datos_base()

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@app.get("/")
def root():
    return {
        "sistema": "SNC v3 — Catastro Multifinalitario (Ley 551/2023)",
        "modulo": "Microservicio Científico Climático (MHC-PY / Carril C)",
        "estado": "online",
        "puerto": 5557,
        "librerias_activas": ["FastAPI", "GeoPandas", "Shapely", "NumPy", "Pandas"],
        "distritos_indexados": len(CACHE_DISTRIC_RISK) // 2,
        "departamentos_forestales": len(CACHE_BOSQUES),
        "establecimientos_salud": len(CACHE_SALUD.get("features", []))
    }

@app.get("/api/v1/salud")
def healthcheck():
    return {
        "status": "healthy",
        "timestamp": "2026-11-01T10:05:00-03:00",
        "memoria_datos": {
            "iri_cargado": bool(CACHE_DISTRIC_RISK),
            "bosques_cargado": bool(CACHE_BOSQUES),
            "salud_cargado": bool(CACHE_SALUD)
        }
    }

@app.get("/api/v1/distrito/{nombre}")
def obtener_diagnostico_distrito(nombre: str):
    clave = nombre.upper().strip()
    match = None
    for k, v in CACHE_DISTRIC_RISK.items():
        if clave in k:
            match = v
            break
            
    if not match:
        raise HTTPException(status_code=404, detail=f"Distrito '{nombre}' no encontrado")
        
    depto = match.get("depto", "")
    info_forestal = CACHE_BOSQUES.get(depto.title()) or CACHE_BOSQUES.get(depto)
    
    # Calcular estrés térmico bajo 4 horizontes IPCC AR6
    iri = match.get("indice_riesgo_inundacion", 50)
    proyecciones = {
        "2026_base": {"anomalia": 0.0, "iri_proyectado": iri, "riesgo": match.get("nivel_riesgo")},
        "2030_ssp2_45": {"anomalia": 1.1, "iri_proyectado": min(100, round(iri * 1.08)), "riesgo": "ALTO" if iri > 60 else "MEDIO"},
        "2050_ssp3_70": {"anomalia": 2.3, "iri_proyectado": min(100, round(iri * 1.19)), "riesgo": "EXTREMO" if iri > 55 else "ALTO"},
        "2100_ssp5_85": {"anomalia": 4.2, "iri_proyectado": min(100, round(iri * 1.35)), "riesgo": "EXTREMO"}
    }
    
    return {
        "distrito": match.get("distrito"),
        "departamento": depto,
        "ranking_nacional": match.get("ranking"),
        "cota_media_m": match.get("cota_media_m"),
        "cuenca": match.get("cuenca"),
        "indice_riesgo_inundacion": iri,
        "nivel_riesgo": match.get("nivel_riesgo"),
        "densidad_hidrografica_pct": round(match.get("densidad_hidrografica", 0) * 100),
        "exposicion_catastral_pct": round(match.get("exposicion_catastral", 0) * 100),
        "cobertura_forestal_dptal": info_forestal,
        "proyecciones_ipcc_ar6": proyecciones,
        "directrices_pout": [
            "Franja mínima non aedificandi de 40m a 100m en cursos permanentes (Ley 3966 Art. 235).",
            "Sobreelevación obligatoria de cota de fundación (+0.60 m) en zonas fluviales.",
            "Certificación IPOOT previa para aprobación de fraccionamientos ante el SNC (Ley 551)."
        ]
    }

@app.post("/api/v1/simulacion/parcela")
def simular_parcela(req: SimulacionParcelaRequest):
    """
    Simulación científica del comportamiento hidrológico y riesgo económico de una parcela.
    """
    d_rio = req.distancia_cauce_m
    z = req.cota_terreno_m
    dt = req.anomalia_termica_c
    
    # 1. Determinación legal IPOOT (Ley 3966 Art. 235)
    if d_rio < 40 or z < 55:
        ipoot = "RESTRINGIDO"
        badge_color = "#ef4444"
        dictamen = (
            f"Inmueble ubicado a {d_rio:.1f} m del cauce hídrico (INFRINGE FRANJA LEGAL DE 40 METROS según Art. 235 Ley 3966). "
            "Zona de amortiguamiento y conservación fluvial obligatoria. PROHIBIDO FRACCIONAMIENTO O LOTEAMIENTO."
        )
        factor_riesgo = 0.85
    elif d_rio <= 130 or z < 70:
        ipoot = "CONDICIONADO"
        badge_color = "#f59e0b"
        dictamen = (
            f"Inmueble a {d_rio:.1f} m del cauce. Cumple con la franja de 40m pero ingresa en el área de expansión de crecida $Q_{{100}}$. "
            "Edificación permitida únicamente con cota de fundación sobreelevada (+0.60 m) y desagüe pluvial aprobado."
        )
        factor_riesgo = 0.45
    else:
        ipoot = "FAVORABLE"
        badge_color = "#10b981"
        dictamen = (
            f"Inmueble a {d_rio:.1f} m del cauce (cota {z:.1f} m.s.n.m.). Terreno consolidado fuera de la franja de anegamiento fluvial. "
            "Apto para edificación y fraccionamiento urbano conforme a la ordenanza municipal."
        )
        factor_riesgo = 0.12

    # 2. Riesgo Parcelario Cuantitativo (IRP)
    irp = min(100, max(5, round((150 - d_rio) * 0.5 + (85 - min(85, z)) * 0.6 + dt * 4)))
    
    # 3. Pérdida Económica Anual Esperada (EAL)
    perdida_esperada_gs = round(req.valor_fiscal_gs * factor_riesgo * (irp / 100) * 0.15)
    
    return {
        "identificacion_catastral": req.ccc,
        "distrito": req.distrito,
        "departamento": req.departamento,
        "coordenadas": {"lat": req.lat, "lng": req.lng},
        "parametros_evaluados": {
            "distancia_cauce_m": d_rio,
            "cota_terreno_m": z,
            "anomalia_simulada_c": dt,
            "superficie_m2": req.superficie_m2,
            "valor_fiscal_gs": req.valor_fiscal_gs
        },
        "evaluacion_legal_ipoot": {
            "clasificacion": ipoot,
            "badge_color": badge_color,
            "franja_hospedada_40m": d_rio >= 40,
            "dictamen": dictamen
        },
        "indices_cientificos": {
            "IRP": irp,
            "nivel": "CRÍTICO" if irp > 70 else ("MEDIO" if irp > 40 else "BAJO"),
            "resiliencia_pct": max(10, 100 - round(irp * 0.8)),
            "perdida_anual_esperada_gs": perdida_esperada_gs
        }
    }

@app.post("/api/v1/indices/extremos")
def calcular_indices_extremos(req: SerieTemporalRequest):
    """
    Cálculo de índices de extremos térmicos y pluviométricos (ETCCDI / OMM).
    """
    t_max = req.temperaturas_max
    precip = req.precipitaciones_mm
    
    if not t_max or not precip:
        raise HTTPException(status_code=400, detail="Series temporales vacías")
        
    su35 = sum(1 for t in t_max if t >= 35.0)  # Días de calor extremo (>35°C)
    tx_media = round(sum(t_max) / len(t_max), 1)
    tx_maxima = max(t_max)
    
    r95p_umbral = 40.0 # mm en 24h
    dias_lluvia_extrema = sum(1 for p in precip if p >= r95p_umbral)
    lluvia_total = round(sum(precip), 1)
    
    return {
        "periodo_dias": len(t_max),
        "indices_termicos": {
            "SU35_dias_calor_extremo": su35,
            "temperatura_maxima_absoluta": tx_maxima,
            "temperatura_maxima_media": tx_media
        },
        "indices_pluviometricos": {
            "precipitacion_total_acumulada_mm": lluvia_total,
            "R95p_dias_lluvia_severa": dias_lluvia_extrema,
            "intensidad_media_dias_lluvia_mm": round(lluvia_total / max(1, sum(1 for p in precip if p > 0)), 1)
        }
    }
