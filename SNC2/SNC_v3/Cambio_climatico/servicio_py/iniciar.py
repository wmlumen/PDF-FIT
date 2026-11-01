"""
Script de inicio para el Microservicio Científico de Cambio Climático (MHC-PY)
Ejecuta FastAPI sobre Uvicorn en el puerto 5557
"""
import sys
import uvicorn

if __name__ == "__main__":
    puerto = 5557
    print(f"==================================================")
    print(f"🌍 SNC v3 — Microservicio Científico Python (MHC-PY)")
    print(f"📡 Iniciando servidor Uvicorn en http://127.0.0.1:{puerto}")
    print(f"📚 Documentación interactiva Swagger en http://127.0.0.1:{puerto}/docs")
    print(f"==================================================")
    uvicorn.run("app:app", host="127.0.0.1", port=puerto, log_level="info", reload=False)
