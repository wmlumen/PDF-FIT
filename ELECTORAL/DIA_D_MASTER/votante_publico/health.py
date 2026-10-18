from datetime import datetime, timezone
from enum import Enum

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

class PerformanceLevel(str, Enum):
    excelente = "excelente"
    bueno = "bueno"
    aceptable = "aceptable"
    deficiente = "deficiente"

@app.get("/")
async def root():
    return {"message": "DIA D MASTER — Healthcheck del Endpoint del Votante", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/health")
async def health(request: Request):
    # Extraer IP y token de la request para al menos registrar por qué endpoints son más activos.
    client_host = request.client.host if request.client else "?"
    # Inicializar los datos del backend (estos serían actualizados por las tareas de fondo).
    backend_stats = {
        "total_registered": 1743,
        "active_today": 957,
        "pending": 132,
        "failed": 8,
        "performance_level": PerformanceLevel.bueno,
    }
    return JSONResponse(
        {
            "status": "healthy",
            "backend_stats": backend_stats,
            "client_ip": client_host,
            "server_timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
