@echo off
REM run.bat - Unico lanzador del servidor SNC_v3 (reemplaza run-server.bat,
REM run-server.ps1, run-snc.cmd, run-snc-pout.bat, start-server.sh y start_server.sh).
REM Doble clic en Windows: instala dependencias si faltan, libera el puerto 5556
REM si quedo un proceso viejo, levanta server-api.js (AGENTS.md SS1.3: servidor
REM unico e inmutable) y abre el navegador cuando el health check responde.
setlocal enabledelayedexpansion
cd /d "%~dp0"

set PORT=5556
set DB_BACKEND=sqlite
set NODE_ENV=development
set LOG=.server.log

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)

echo Liberando el puerto %PORT% si hay un proceso anterior...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
)

echo Iniciando SNC_v3 (server-api.js) en el puerto %PORT%...
start "SNC_v3" /min cmd /c "npm start > "%LOG%" 2>&1"

set OK=0
for /l %%i in (1,1,10) do (
  ping -n 2 127.0.0.1 >nul
  curl -s -o nul -w "%%{http_code}" http://localhost:%PORT%/api/health > "%TEMP%\snc_health.txt" 2>nul
  set /p CODE=<"%TEMP%\snc_health.txt"
  if "!CODE!"=="200" (
    set OK=1
    goto :ready
  )
)

:ready
if "%OK%"=="1" (
  echo Servidor listo en http://localhost:%PORT%/
  start http://localhost:%PORT%/
) else (
  echo El servidor no respondio a tiempo. Revise %LOG%:
  type "%LOG%" 2>nul
)

endlocal
