"""
Runner del microservicio público del votante (Render / local).
Uso:
    python server.py                       # 8000
    python server.py --port 8010           # puerto propio
    python server.py --port $PORT --host 0.0.0.0   # Render
"""
import argparse
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser(description="DIA D MASTER — Microservicio del votante")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8010")))
    ap.add_argument("--log-level", default="info", choices=["debug", "info", "warning", "error"])
    args = ap.parse_args()

    db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database", "public_votante.db")
    if not os.path.exists(db):
        print("[ERROR] Falta la DB pública. Ejecutá: python build_public_db.py")
        sys.exit(1)

    import uvicorn

    uvicorn.run("server:app", host=args.host, port=args.port,
                log_level=args.log_level, access_log=True)


if __name__ == "__main__":
    main()
