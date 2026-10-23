#!/usr/bin/env python3
"""
Graphify automation script — construye y mantiene el knowledge graph para SNC_v3.
Ejecutar con python (o como script cron) para generar/actualizar el grafo de forma incremental.
"""

import os
import subprocess
import sys
from pathlib import Path

# ------------------------------------------------------------
# Configuración
# ------------------------------------------------------------
REPO_ROOT = Path("/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3")
GRAPHIFY_OUT = REPO_ROOT / "graphify-out"
CONFIG_YAML = REPO_ROOT / "graphify.yaml"
VENV_PYTHON = Path.home() / ".venvs" / "graphify" / "bin" / "python"
GRAPHIFY_CLI = Path.home() / ".venvs" / "graphify" / "bin" / "graphify"

# ------------------------------------------------------------
# Función principal: ejecutar graphify
# ------------------------------------------------------------
def run_graphify(args):
    cmd = [str(VENV_PYTHON), "-m", "graphifyy", *args]
    print(f"[graphify] {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[ERROR] graphify falló:\n{result.stderr}")
        return False
    print(result.stdout)
    return True

# ------------------------------------------------------------
# Obtener configuración desde graphify.yaml (simple, YAML sin dependencias externas)
# ------------------------------------------------------------
def load_yaml():
    import yaml
    return yaml.safe_load(CONFIG_YAML.read_text())

# ------------------------------------------------------------
# Construir el grafo desde cero (o con actualización incremental)
# ------------------------------------------------------------
def build_graph():
    print("[graphify] Construyendo grafo SNC_v3...")
    # Usar solo código para mantenerlo local y sin tokens de LLM
    ok = run_graphify([".", "--no-viz", "--code-only", "--update"])
    if ok:
        print("[graphify] Grafo construido exitosamente")
        return True
    print("[graphify] Construcción falló")
    return False

# ------------------------------------------------------------
# Exportar el grafo (opcional)
# ------------------------------------------------------------
def export_graph():
    print("[graphify] Exportando grafo...")
    ok = run_graphify([".", "--update", "--export"])
    if ok:
        print("[graphify] Exportación completada")
        return True
    print("[graphify] Exportación falló")
    return False

# ------------------------------------------------------------
# Tarea de mantenimiento: limpiar entradas obsoletas del grafo
# ------------------------------------------------------------
def cleanup_graph():
    print("[graphify] Limpiando entradas obsoletas...")
    # Graphify puede hacer esto via --cleanup si está habilitado en la config
    ok = run_graphify([".", "--cleanup"])
    if ok:
        print("[graphify] Limpieza completada")
        return True
    print("[graphify] Limpieza falló")
    return False

# ------------------------------------------------------------
# Función principal del script
# ------------------------------------------------------------
def main():
    # Asegurar que el grafo existe
    if not (GRAPHIFY_OUT / "graph.json").exists():
        print("[graphify] graph.json no existe, construyendo...")
        if not build_graph():
            sys.exit(1)
    else:
        print("[graphify] graph.json existe, actualización incremental...")
        if not build_graph():
            sys.exit(1)

    # Opcional: exportar el grafo (cuando hay cambios)
    export_graph()

    # Opcional: limpiar entradas obsoletas
    cleanup_graph()

    print("[graphify] Tareas completadas")

# ------------------------------------------------------------
# Punto de entrada del script
# ------------------------------------------------------------
if __name__ == "__main__":
    main()