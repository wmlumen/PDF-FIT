#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3"
LOG="$PROJECT_DIR/.server.log"
URL="http://localhost:5556"

cd "$PROJECT_DIR"

# Asegurar dependencias
if [ ! -d node_modules ]; then
  echo "Instalando dependencias..."
  npm install
fi

# Matar instancia anterior si existe
pkill -f "node server-api.js" 2>/dev/null || true
sleep 1

# Iniciar servidor en background
echo "Iniciando servidor SNC..."
node server-api.js > "$LOG" 2>&1 &
SERVER_PID=$!

# Esperar hasta 12s por health check
OK=0
for i in 1 2 3 4 5 6; do
  sleep 2
  if curl -sf "$URL/api/health" >/dev/null 2>&1; then
    OK=1
    break
  fi
done

if [ "$OK" -eq 1 ]; then
  echo "Servidor listo en $URL"
  echo "Log: $LOG"
  # Abrir en Windows (desde WSL)
  /mnt/c/Windows/System32/cmd.exe /c start "" "$URL" >/dev/null 2>&1 || true
  echo "Abriendo navegador..."
else
  echo "Servidor no respondió en $URL"
  echo "Últimas líneas del log:"
  tail -40 "$LOG" || true
  echo ""
  echo "PID del proceso node: $SERVER_PID"
  ps aux | grep "node server-api.js" | grep -v grep || true
  exit 1
fi
