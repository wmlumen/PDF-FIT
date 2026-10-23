#!/bin/bash
# Script cron para Graphify — wrapper del agente Hermes que ejecuta graphify_main.py
# Permite navegar código con graphify (conocido como grafo local) dentro del agente Hermes.
# Funciona con el graphify Hermes skill (~/.hermes/skills/software-development/graphify-setup).
# Colocar este script en ~/.hermes/scripts/graphify_update.sh y programarlo con cron.
# Configurar para ejecución diaria (o cada X horas).

set -euo pipefail

# Ruta al script principal
SCRIPT_PATH="/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/graphify_main.py"

# Ruta al comando de graphify (usado por el agente Hermes)
GRAPHIFY_BIN="$HOME/.venvs/graphify/bin/graphify"

# Falla si el comando graphify no existe
if [[ ! -x "$GRAPHIFY_BIN" ]]; then
  echo "[cron] ERROR: graphify no encontrado en $GRAPHIFY_BIN" >&2
  exit 1
fi

# Asegurar que el script es ejecutable
chmod +x "$SCRIPT_PATH"

# Ejecutar el script principal (debe manejar sus propios errores)
cd "/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3" || exit 1

# Ejecutar usando python del venv para evitar problemas de Python 3.14 + PEP 668
"$HOME/.venvs/graphify/bin/python" "$SCRIPT_PATH"
