"""
README de Graphify para SNC_v3

Este repo contiene el setup y script de ejecución de Graphify para SNC_v3 — un knowledge graph local con tree-sitter (0 tokens LLM) para navegar el codebase de SNC_v3 rápidamente.

Graphify convierte cada archivo en nodos, mapea las dependencias (calls, imports) y expone queries en lenguaje natural (BFS traversal, caminos, explicaciones).
Usar Graphify evita que el agente relea archivos enteros repetidamente, reduciendo drásticamente el consumo de tokens.

=== CONFIGURACIÓN RÁPIDA (paso a paso) ===

1) Requisitos del sistema (WSL / bash)
   - python3.11 (recomendado; 3.14 puede fallar con PEP 668)
   - pip o pipx (o uv)

2) Instalar Graphify (Una vez, en el usuario de HP_250_G10)

   # Opción A: usar un venv dedicado (recomendado)
   python3.11 -m venv ~/.venvs/graphify
   ~/.venvs/graphify/bin/pip install graphifyy

   # Opción B: pipx (si está disponible)
   pipx install graphifyy

   # Opción C: --user (si no hay restricciones)
   pip install --user graphifyy

   Verificar:
     $ ~/.venvs/graphify/bin/graphify --version
       graphify 0.9.91   (o similar)

3) Registrar como skill Hermes (global)
   graphify install --platform hermes
   (Crea ~/.hermes/skills/software-development/graphify-setup/SKILL.md)

4) Construir el grafo inicial (una vez)
   cd /mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3
   ~/.venvs/graphify/bin/graphify . --no-viz --code-only
   (Genera graphify-out/graph.json, graphify-out/graph.html, etc.)

5) (Opcional) Configurar actualización automática con cron
   - Edit graphify_update.sh y ajustar los tiempos si es necesario
   - graphify_update.sh usa ~/.venvs/graphify/bin/python para ejecutar graphify_main.py
   - Para instalar el cron job (requiere root o sudo):
     crontab -e
     */2 * * * * /home/hp_250_g10/Documents/GITHUT/SNC2/SNC_v3/graphify_update.sh >> /home/hp_250_g10/Documents/GITHUT/SNC2/SNC_v3/graphify_update.log 2>&1

   - Para verificar el cron:
     crontab -l

=== TAREAS COMUNES ===

Construir / Actualizar el grafo
   ~/.venvs/graphify/bin/graphify . --no-viz --code-only    # Construcción inicial
   ~/.venvs/graphify/bin/graphify . --update --no-viz --code-only    # Incremental

Obtener el grafo actualizado (solo para lectura)
   cat graphify-out/graph.json | jq .nodes | head -20

Consultar el grafo (usando el skill Hermes)
   "Dime qué archivos contienen X"   (o cualquier query en lenguaje natural)
   El agente responderá usando graph.json, sin leer archivos en crudo.

Excluir directorios del grafo
   Editar graphify.yaml -> exclude_paths:
     - "node_modules/"
     - "__pycache__/"
     - "data/Paraguay/*"
     - "data/Prueba/*"
     - "data/piribebuy/*"

=== DEPENDENCIAS DEL PROYECTO (a nivel de código) ===

   - node: express, leaflet, jwt-decode, pg, etc.
   - python: fastapi (si existe), etc.
   - geojson, shapely, pyproj, etc. (si existen)

Graphify (por defecto) solo indexa archivos de código fuente .py/.js/.ts/.tsx/.jsx/.json.
Si necesitás incluir docs/PDFs, asegurarte de tener la variable de entorno del modelo LLM (ej: GEMINI_API_KEY, OPENAI_API_KEY) y quitar --code-only.

=== ARCHIVOS GENERADOS / SALIDA DE Graphify ===

   graphify-out/graph.json            # Grafo completo (nodos, links, comunidades)
   graphify-out/GRAPH_REPORT.md        # Resumen: nodos más importantes, comunidades, conexiones clave
   graphify-out/graph.html            # Visualización HTML interactiva (graphify visualizer)
   graphify-out/.graphify_analysis.json # Análisis interno (opcional)

   (Todos estos archivos están versionados en .gitignore del repo root, excepto graph.json)

=== MANEJAR ERRORES COMUNES ===

   - Python 3.14 + PEP 668: usar venv con python3.11 (instalar python3.11 si es posible)
   - Si Graphify falla al analizar, verificar exclude_paths y max_file_size
   - Si el cron no corre, verificar permissions del script y logs

=== GUÍA DE INICIO RÁPIDO (BLOQUE) ===

   1) Source: git clone ... (si el repo está en git)
    ellipse 2) Instalar Graphify (los pasos arriba)
    ellipse 3) graphify . --no-viz --code-only
    ellipse 4) Probar queries:
        "$ what connects auth to database?"
        "$ show me all files that import leaflet"
        "$ explain RateLimiter"

Graphify funciona con el skill de Hermes en ~/.hermes/skills/software-development/graphify-setup.
El agente detectará automáticamente graph.json en graphify-out/ y lo usará como la principal fuente de conocimiento para SNC_v3.

=== REFERENCIAS ===
   - Documentación de Graphify: https://github.com/Graphify-Labs/graphify
   - Skill de Graphify (instalado): ~/.hermes/skills/software-development/graphify-setup/SKILL.md
