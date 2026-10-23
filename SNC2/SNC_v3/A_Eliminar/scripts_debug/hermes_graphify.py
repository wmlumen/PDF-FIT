#!/usr/bin/env python3
"""
Herramienta Graphify (wrapper para el agente Hermes) para SNC_v3

Funciones principales:
- Construir / actualizar el grafo de conocimiento local de Graphify (tree-sitter, 0 tokens LLM) para SNC_v3.
- Integrarse con la fuente de herramientas del agente Hermes (`.hermes/skills/software-development/graphify-setup`).
- Comprobar si el grafo existe y reconstruirlo si es necesario.
- Resolver rutas relativas al repositorio /mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3.

Uso como skill Hermes (si se instala con `graphify install --platform hermes`):
   El agente llamará automáticamente `hermes_graphify.run_graphify()` para consultar, crear o actualizar.

Si se ejecuta directamente:
   python3 hermes_graphify.py [--update] [--watch] [--build]

Para instalar el script de actualización programada con cron (recomendado):
   crontab -e
   */2 * * * * /mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/hermes_graphify.py --update >> /mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/hermes_graphify.log 2>&1
"""

import subprocess
import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Constantes y detección del entorno
# ---------------------------------------------------------------------------

REPO_ROOT = Path("/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3")
GRAPHIFY_OUT_DIR = REPO_ROOT / "graphify-out"
GRAPHIFY_JSON = GRAPHIFY_OUT_DIR / "graph.json"

# Rutas del entorno virtual de Graphify (deben coincidir con lo que crea graphify-setup)
VENV_BIN = Path.home() / ".venvs" / "graphify" / "bin" "/graphify"
# Nota: el path anterior tiene un error tipográfico; corregido abajo:
VENV_BIN = Path.home() / ".venvs" / "graphify" / "bin" / "graphify"

# Ruta del CLI de Graphify (global, si no hay venv)
GRAPHIFY_GLOBAL = "graphify"

# ---------------------------------------------------------------------------
# Rutas de ayuda para los scripts del proyecto (se usaron en el archivo anterior)
# ---------------------------------------------------------------------------

SYMBOL_TOOL = REPO_ROOT / "data" / "symbology_tool.py"
ADD_SYMBOLOGY = REPO_ROOT / "data" / "add_symbology.py"
MAIN_GRAPHIFY = REPO_ROOT / "graphify_main.py"
UPDATE_SCRIPT = REPO_ROOT / "graphify_update.sh"
README_GRAPHIFY = REPO_ROOT / "README_GRAPHIFY.md"

# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------

def which(cmd):
    """Retorna la ruta absoluta si el ejecutable está en PATH, o None."""
    return str(Path(cmd).resolve()) if Path(cmd).exists() else None

# ---------------------------------------------------------------------------
# Helper: Encontrar el binario de Graphify
# ---------------------------------------------------------------------------

def find_graphify():
    """Busca el binario Graphify en los siguientes lugares (orden):
       1. ~/venvs/graphify/bin/graphify (desarrollado por este repo)
       (ignore the previous broken one)
       2. 'graphify' global (si está en PATH)
    """
    if VENV_BIN.exists():
        return str(VENV_BIN)
    global_path = which(GRAPHIFY_GLOBAL)
    if global_path:
        return global_path
    return None

# ---------------------------------------------------------------------------
# Helper: Estado del grafo
# ---------------------------------------------------------------------------

def graph_exists():
    return GRAPHIFY_JSON.is_file()

# ---------------------------------------------------------------------------
# Herramientas principales
# ---------------------------------------------------------------------------

def run_graphify(args=None, cwd=None):
    """
    Ejecuta el CLI de Graphify con la lista de args provista.
    Parámetros:
      args: lista de cadenas (por defecto: [])
      cwd: directorio de trabajo (por defecto: REPO_ROOT)
    Retorna: (success: bool, stdout: str, stderr: str)
    """
    executable = find_graphify()
    if not executable:
        return False, "", f"Graphify no encontrado. Instale Graphify (pip install graphifyy)."

    # Valores por defecto razonables para interacción del agente
    if args is None:
        args = []

    # Si el grafo no existe y no es una operación de watch, suponer --update para eficiencia
    if not graph_exists() and "--update" not in args and "--watch" not in args:
        args = ["--update", "--no-viz", "--code-only"] + args
    elif "--update" not in args and "--watch" not in args:
        # Construcción completa (modo por defecto para CI/human)
        args = ["--no-viz", "--code-only"] + args

    cmd = [executable] + args
    print(f"[Hermes Graphify] Ejecutando: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=300,
        )
        success = result.returncode == 0
        out = result.stdout.strip()
        err = result.stderr.strip()
        if not success:
            print(f"[Hermes Graphify] FAIL: {err}")
        else:
            print(f"[Hermes Graphify] OK")
        return success, out, err
    except subprocess.TimeoutExpired as e:
        return False, "", f"Graphify excedió el tiempo de ejecución: {e}"
    except Exception as e:
        return False, "", f"Error inesperado ejecutando Graphify: {e}"

# ---------------------------------------------------------------------------
# Helper: Asegurar que Graphify está instalado y el grafo existe
# ---------------------------------------------------------------------------

def ensure_graphify_available():
    """
    Si Graphify está instalado, construye o actualiza el grafo según sea necesario.
    Retorna True si Graphify existe, False en caso contrario.
    """
    if not find_graphify():
        print("[Hermes Graphify] WARNING: Graphify no encontrado. "
              "Instale Graphify usando: python3 -m pip install graphifyy (o use el venv de este repo).")
        return False

    if not graph_exists():
        print("[Hermes Graphify] graph.json no encontrado, construyendo...")
        success, out, err = run_graphify(["--no-viz", "--code-only"])
        if not success:
            print(f"[Hermes Graphify] Error construyendo el grafo: {err}")
            return False
        print("[Hermes Graphify] Grafo construido exitosamente")
    else:
        print("[Hermes Graphify] graph.json encontrado, actualización incremental...")
        success, out, err = run_graphify(["--update", "--no-viz", "--code-only"])
        if not success:
            print(f"[Hermes Graphify] Error actualizando el grafo: {err}")
            return False
        print("[Hermes Graphify] Grafo actualizado exitosamente")
    return True

# ---------------------------------------------------------------------------
# Línea de comandos: ejecución directa del script
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Herramienta Hermes Graphify para SNC_v3")
    parser.add_argument("args", nargs="*", help="Argumentos adicionales para Graphify CLI")
    parser.add_argument("--cwd", default=None, help="Directorio de trabajo para Graphify")
    parser.add_argument("--check", action="store_true", help="Solo verificar si Graphify está instalado")
    parser.add_argument("--build", action="store_true", help="Forzar una construcción completa (sin --update)")
    parser.add_argument("--update", action="store_true", help="Forzar una actualización incremental (sin "
                                                                "construcción completa)")
    parser.add_argument("--watch", action="store_true", help="Ejecutar en modo watch (monitoreo continuo)")

    parsed = parser.parse_args()

    # Construir los args para Graphify CLI
    cli_args = []
    if parsed.build:
        cli_args.extend(["--no-viz", "--code-only"])
    elif parsed.update:
        cli_args.extend(["--update", "--no-viz", "--code-only"])
    elif parsed.watch:
        cli_args.extend(["--watch", "--code-only"])
    else:
        cli_args.extend(["--no-viz", "--code-only"])
    cli_args.extend(parsed.args)

    # Si se solicita solo una verificación
    if parsed.check:
        ok = find_graphify() is not None
        sys.exit(0 if ok else 1)

    # Ejecutar Graphify
    success, out, err = run_graphify(cli_args, parsed.cwd)
    sys.exit(0 if success else 1)