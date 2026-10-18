@echo off
title Campus Virtual Centuria - Servidor
echo ============================================
echo   CAMPUS VIRTUAL CENTURIA
echo   Instituto Superior Centuria
echo ============================================
echo.

:: Verificar PHP
php -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PHP no encontrado en PATH
    echo Instala PHP o agrega al PATH
    pause
    exit /b 1
)

:: Matar PHP anterior si existe
taskkill /F /IM php.exe >nul 2>&1

echo [OK] PHP encontrado
echo [OK] Iniciando servidor en http://127.0.0.1:8080
echo.
echo ============================================
echo   Abre en tu navegador:
echo   http://127.0.0.1:8080
echo.
echo   Para detener: cierra esta ventana
echo ============================================
echo.

php -S 0.0.0.0:8080 -t . index.php

pause
