"""
DIA Mesas DB - Servidor de Despliegue
======================================
Servidor de producción para el Sistema de Control Electoral.
Uso:
  python server.py                    # Puerto 8000, 0.0.0.0
  python server.py --port 3000        # Puerto personalizado
  python server.py --host 127.0.0.1   # Solo localhost
  python server.py --no-reload        # Sin hot-reload (producción)
"""
import argparse
import sys
import os
import time

# Asegurar que estamos en el directorio correcto
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def banner(host, port, debug=False):
    mode = "DEBUG" if debug else "PRODUCCIÓN"
    display_host = "localhost" if host in ("0.0.0.0", "127.0.0.1") else host
    url = f"http://{display_host}:{port}"
    docs = f"{url}/docs"
    print()
    print("=" * 60)
    print("  DIA D MASTER - Sistema Electoral Unificado")
    print(f"  Modo: {mode}")
    print("=" * 60)
    print(f"  Panel Principal:     {url}")
    print(f"  Calculadora D'Hondt: {url}/dhondt")
    print(f"  Ranking Dirigentes:  {url}/ranking")
    print(f"  Descargas APK:       {url}/descargas")
    print(f"  Admin General:       {url}/admin_general")
    print(f"  API Docs:            {docs}")
    print("=" * 60)
    print()

def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    missing = []
    for pkg, imp in [("fastapi", "fastapi"), ("uvicorn", "uvicorn")]:
        try:
            __import__(imp)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[ERROR] Faltan dependencias: {', '.join(missing)}")
        print(f"  Ejecutá: pip install -r requirements.txt")
        sys.exit(1)

def init_database():
    """Inicializa la base de datos con seed completo"""
    from database import init_db
    print("[DB] Inicializando base de datos...")
    init_db()
    print("[DB] Base de datos lista.")

def main():
    parser = argparse.ArgumentParser(description="DIA Mesas DB - Servidor Electoral")
    parser.add_argument("--host", default="0.0.0.0", help="Host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Puerto (default: 8000)")
    parser.add_argument("--reload", action="store_true", default=False, help="Hot-reload (desarrollo)")
    parser.add_argument("--workers", type=int, default=1, help="Workers uvicorn (default: 1)")
    parser.add_argument("--log-level", default="info", choices=["debug","info","warning","error"])
    args = parser.parse_args()

    check_dependencies()
    init_database()
    banner(args.host, args.port, debug=args.reload)

    import uvicorn
    uvicorn.run(
        "app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers,
        log_level=args.log_level,
        access_log=True,
    )

if __name__ == "__main__":
    main()
