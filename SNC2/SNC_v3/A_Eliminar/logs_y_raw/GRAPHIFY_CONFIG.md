# Archivo de configuración principal para SNC_v3 con Graphify
# Define los comandos y entornos de ejecución para el conocimiento del grafo Graphify

# ==========================================================================
# MISCELANEA / NOTAS INTERNAS DEL AUTORES (no son necesarias para la ejecución)
# ==========================================================================

# Este archivo realiza dos tareas principales:
#   1) Proporciona una lista concisa de las plantillas/scripts Python más importantes
#      que apoyan las características principales de SNC_v3 (simbología de mapas,更新更新, etc.).
#   2) Define los tiempos de ejecución de Graphify (un script de actualización incremental) y un breve
#      bloque para verificar el entorno.
#
# NO DEBERÍAN MODIFICAR ESTE ARCHIVO A MENOS QUE SEA ABSOLUTAMENTE NECESARIO.
# Las rutas están hardcodeadas al workspace actual del proyecto (/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3)
# para garantizar estabilidad dentro del contenedor.
#
# Para configuraciones más avanzadas (por ejemplo, Graphify en CI/CD, modes de visualización) editar el skill original
# (~/.hermes/skills/software-development/graphify-setup) o crear una copia específica del proyecto en otro lugar.

# ==========================================================================
# DIRECTORIOS Y ARCHIVOS CLAVE DEL REPOSITORIO (para referencia rápida)
# ==========================================================================

# Root del repositorio SNC_v3 actual (donde reside este archivo .md)
REPO_ROOT = /mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3

# Directorio de salida del grafo generado por Graphify (generado por el agente)
GRAPHIFY_OUT_DIR = graphify-out

# Archivo principal de configuración de Graphify (YAML)
GRAPHIFY_CONFIG = graphify.yaml

# Ruta al archivo principal del agente Hermes Graphify
GRAPHIFY_SKILL_PATH = .hermes/skills/software-development/graphify-setup/SKILL.md

# ==========================================================================
# SCRIPTS Y HERRAMIENTAS ÚTILES PARA SNC_v3
# ==========================================================================

# ---- Herramientas Python (usadas directamente por el agente o por scripts de administración externos) ----

# Herramienta principal del panel de simbología de mapas (agrega la simbología por categoría a HTML)
MAP_SYMBOLOGY_TOOL = data/symbology_tool.py

# Script para agregar un panel de simbología a todos los HTML (fácil de ejecutar)
ADD_SYMBOLOGY_SCRIPT = data/add_symbology.py

# Script principal de Graphify (para actualizar/construir el grafo)
GRAPHIFY_MAIN_SCRIPT = graphify_main.py

# Script de Graphify para cron (envuelve graphify_main.py, para ejecución programada)
GRAPHIFY_UPDATE_SCRIPT = graphify_update.sh

# Archivo de markdown de ayuda del equipo del proyecto (contiene un bloque de inicio rápido)
GRAPHIFY_README = README_GRAPHIFY.md

# ---- Archivos de configuración (lectura solo por Graphify) ----

# Configuración de Graphify (YAML) para SNC_v3 (excluye data/Paraguay, data/Prueba, data/piribebuy, etc.)
GRAPHIFY_CONFIG_FILE = graphify.yaml

# Configuración alternativa (JSON) para Graphify (puede ser generado por graphify-out/.graphify_analysis.json)
GRAPHIFY_JSON_FILE = graphify.json

# ==========================================================================
# PATRONES DE EJECUCIÓN DE Graphify (para ser ejecutados por el agente Hermes)
# ==========================================================================

# Construcción inicial del grafo (solo código, local, 0 tokens LLM)
GRAPHIFY_BUILD_CMD = [
  "python3",
  "/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/graphify_main.py"
]

# Actualización incremental (solo extrae archivos cambiados)
GRAPHIFY_UPDATE_CMD = [
  "python3",
  "/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/graphify_main.py"
]

# Ejecución del watcher (actualización continua)
GRAPHIFY_WATCH_CMD = [
  "/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/.venvs/graphify/bin/graphify",
  "watch",
  "/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3",
  "--code-only"
]

# ==========================================================================
# RESUMEN DEL REPOSITORIO (para mensajes de log del agente)
# ==========================================================================

REPOSITORIO_DE_GRAPHIFY_DE_SNC3 = """
Este repo contiene el entorno de Graphify (knowledge graph local con tree-sitter) para SNC_v3.
Sirve como "fuente de información" principal para el agente Hermes cuando navega SNC_v3.

Archivos clave:
- graphify.yaml     -> configuración para Graphify (excluye data/Paraguay, data/Prueba, data/piribebuy)
- graphify_main.py -> script para construir/actualizar el grafo
- graphify_update.sh -> script programado con cron para actualizaciones automáticas
- data/symbology_tool.py -> herramienta para agregar el panel de simbología de mapas a HTML
- data/add_symbology.py -> script para agregar simbología a todas las páginas HTML
- README_GRAPHIFY.md -> guía de inicio rápido

Como usar:
1) Asegurar que el entorno virtual de Graphify (~/.venvs/graphify) está instalado.
2) Ejecutar graphify_main.py para construir/actualizar el grafo:
   python3 graphify_main.py
   (O directamente: ~/.venvs/graphify/bin/graphify . --update --no-viz --code-only)
3) El agente usará el grafo (graphify-out/graph.json) para responder queries en lenguaje natural.
4) Para agregar el panel de simbología de mapas:
   python3 data/symbology_tool.py  (o data/add_symbology.py)
5) Para monitorear cambios (actualización continua):
   ~/.venvs/graphify/bin/graphify . --watch --code-only
"""
