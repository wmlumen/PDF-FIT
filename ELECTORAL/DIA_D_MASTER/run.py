"""
DIA Mesas DB - Runner rápido (desarrollo)
"""
import uvicorn
from database import init_db

if __name__ == "__main__":
    init_db()
    print("=" * 50)
    print(" DIA Mesas DB - Servidor Electoral")
    print("=" * 50)
    print(" Iniciando servidor en http://localhost:8000")
    print(" Documentación API: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
