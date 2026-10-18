# Campus Virtual Centuria - Iniciar Servidor
# Doble clic para iniciar

Write-Host "============================================"
Write-Host "  CAMPUS VIRTUAL CENTURIA"
Write-Host "  Instituto Superior Centuria"
Write-Host "============================================"

# Verificar PHP
try {
    $phpVersion = php -v 2>&1 | Select-Object -First 1
    Write-Host "[OK] $phpVersion"
} catch {
    Write-Host "[ERROR] PHP no encontrado en PATH"
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Matar PHP anterior si existe
$old = Get-Process php -ErrorAction SilentlyContinue
if ($old) {
    $old | Stop-Process -Force
    Start-Sleep -Seconds 1
    Write-Host "[OK] PHP anterior detenido"
}

Write-Host "[OK] Iniciando servidor..."
Write-Host ""
Write-Host "  Abre en tu navegador:"
Write-Host "  http://127.0.0.1:8080" -ForegroundColor Green
Write-Host ""
Write-Host "  Para detener: cierra esta ventana"
Write-Host "============================================"
Write-Host ""

Set-Location "$PSScriptRoot"
php -S 0.0.0.0:8080 -t . index.php
