@echo off
chcp 65001 >nul
title DIA D MASTER - Sistema Electoral Unificado
cls

echo ╔══════════════════════════════════════════════════════╗
echo ║       DIA D MASTER - Sistema Electoral Unificado       ║
echo ║       Iniciando servidor local...                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Liberar puerto 8000 si estaba ocupado
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

REM Verificar Python
echo [1/3] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en PATH
    echo Descargalo desde: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verificar dependencias
echo [2/3] Verificando dependencias...
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Instalando dependencias...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo [3/3] Iniciando servidor FastAPI...
echo.
echo -------------------------------------------------------
echo   Panel Principal: http://localhost:8000
echo   Admin General:   http://localhost:8000/admin_general
echo   D'Hondt:         http://localhost:8000/dhondt
echo   Ranking:         http://localhost:8000/ranking
echo   Descargas APK:   http://localhost:8000/descargas
echo   API Docs:        http://localhost:8000/docs
echo   Presiona Ctrl+C para detener
echo -------------------------------------------------------
echo.

REM Abrir navegador en segundo plano
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"

REM Iniciar servidor
python server.py --port 8000

pause
