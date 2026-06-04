@echo off
chcp 65001 >nul
title PDF-FIT - Servidor Local
cls

echo ╔══════════════════════════════════════════════════╗
echo ║         PDF-FIT - Herramientas PDF               ║
echo ║         Iniciando servidor local...              ║
echo ╚══════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

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
python -c "import flask, fitz" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Instalando dependencias...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo [3/3] Iniciando servidor Flask...
echo.
echo ----------------------------------------
echo  URL: http://127.0.0.1:5000
echo  Presiona Ctrl+C para detener
echo ----------------------------------------
echo.

REM Abrir navegador en segundo plano
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5000"

REM Iniciar servidor
python app.py

pause
