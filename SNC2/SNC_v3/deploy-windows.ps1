<#
.SYNOPSIS
SNC_v3 Deployment Script for Windows + WSL.
Deploys to Firebase project snc511.

.DESCRIPTION
Handles login, promotion gate (via WSL), preview channel, production deploy,
manual verification, and rollback instructions.

.PARAMETER SkipGate
Skip promotion_gate.sh validation.

.PARAMETER SkipPreview
Skip preview channel deployment.

.EXAMPLE
.\deploy-windows.ps1
.\deploy-windows.ps1 -SkipGate
.\deploy-windows.ps1 -SkipPreview

.NOTES
Requires Firebase CLI installed globally in Windows.
Requires WSL available for bash scripts.
If blocked by execution policy:
  powershell -ExecutionPolicy Bypass -File .\deploy-windows.ps1
#>

param(
    [switch]$SkipGate,
    [switch]$SkipPreview
)

$ErrorActionPreference = 'Stop'

# Paths
$projectRoot = 'C:\Users\HP 250 G10\Documents\GITHUT\SNC2\SNC_v3'
$wslProjectRoot = '/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3'
$firebaseProject = 'snc511'

function Write-Step($msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-Status($msg, $type = 'Info') {
    $color = switch ($type) {
        'OK' { 'Green' }
        'FAIL' { 'Red' }
        'WARN' { 'Yellow' }
        default { 'White' }
    }
    Write-Host "[$type] $msg" -ForegroundColor $color
}

function Confirm-Continue($prompt = 'Presiona ENTER para continuar o Ctrl+C para abortar') {
    Write-Host $prompt -ForegroundColor Yellow
    Read-Host | Out-Null
}

# Validate project directory
if (-not (Test-Path "$projectRoot\package.json")) {
    Write-Status "ERROR: No se encontro package.json en $projectRoot" 'FAIL'
    Write-Status "Ajusta la variable `$projectRoot dentro del script si es necesario." 'WARN'
    exit 1
}
Set-Location $projectRoot
Write-Status "Directorio del proyecto: $(Get-Location)"

# =============================================================================
# PASO 1: Prerequisitos
# =============================================================================
Write-Step "Paso 1/6: Prerequisitos"

$required = @('node', 'npm', 'firebase', 'wsl')
foreach ($cmd in $required) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Status "Falta comando requerido: $cmd" 'FAIL'
        exit 1
    }
}

Write-Status "node  : $(node --version)"
Write-Status "npm   : $(npm --version)"
Write-Status "firebase: $(firebase --version 2>&1)"
Write-Status "wsl   : disponible"
Write-Status "Prerequisitos OK" 'OK'

# =============================================================================
# PASO 2: Firebase Login y proyecto
# =============================================================================
Write-Step "Paso 2/6: Firebase Login y selección de proyecto"

try {
    firebase projects:list 2>&1 | Out-Null
    Write-Status "Firebase CLI autenticado" 'OK'
} catch {
    Write-Status "No autenticado. Abriendo flujo de login..." 'WARN'
    firebase login
}

# Seleccionar proyecto snc511
Write-Status "Configurando proyecto por defecto: $firebaseProject"
firebase use --add $firebaseProject | Out-Host

# =============================================================================
# PASO 3: Gate pre-promoción (WSL)
# =============================================================================
if (-not $SkipGate) {
    Write-Step "Paso 3/6: Gate pre-promoción (WSL)"
    Write-Status "Ejecutando scripts/promotion_gate.sh via WSL..." 'WARN'
    Write-Status "Esto valida tests, secrets, HSTS/CSP, debug pages y rewrites." 'WARN'

    $wslCmd = "cd '$wslProjectRoot' && bash scripts/promotion_gate.sh"
    $gateOutput = wsl bash -c $wslCmd 2>&1

    Write-Host $gateOutput

    if ($LASTEXITCODE -ne 0) {
        Write-Status "Gate rechazado. Corrige los errores antes de continuar." 'FAIL'
        exit 1
    }
    Write-Status "Gate aprobado" 'OK'
} else {
    Write-Status "Gate salteado por parametro -SkipGate" 'WARN'
}

# =============================================================================
# PASO 4: Preview
# =============================================================================
if (-not $SkipPreview) {
    Write-Step "Paso 4/6: Deploy Preview"
    Write-Status "Desplegando canal preview de Firebase Hosting..." 'WARN'
    
    firebase hosting:channel:deploy preview
    
    Write-Status "Preview deploy finalizado" 'OK'
} else {
    Write-Status "Preview salteado por parametro -SkipPreview" 'WARN'
}

# Validacion manual del preview
Write-Status "`nValidación manual del preview:" -ForegroundColor Cyan
$previewChecks = @(
    '/ y /index.html cargan sin errores JS críticos',
    '/members.html accesible',
    '/admin.html protegido (no accesible sin login admin)',
    '/api/health responde OK',
    '/api/plans expone catálogo público',
    'Login/register operativos si aplica',
    'Exportación y validación accesibles desde UI',
    'HSTS y CSP activos en respuestas'
)
$i = 1
foreach ($check in $previewChecks) {
    Write-Host ("  {0}. [ ] {1}" -f $i, $check)
    $i++
}

Confirm-Continue "`nAbre la URL de preview y verifica lo listado arriba. Luego presiona ENTER."

# =============================================================================
# PASO 5: Deploy a Producción
# =============================================================================
Write-Step "Paso 5/6: Deploy a Producción"
Write-Status "Desplegando hosting + functions a proyecto: $firebaseProject" 'WARN'

firebase deploy --only hosting,functions

Write-Status "Deploy a producción finalizado" 'OK'

# =============================================================================
# PASO 6: Verificación post-deploy
# =============================================================================
Write-Step "Paso 6/6: Verificación post-deploy"

Write-Status "Hosting URLs:" -ForegroundColor Cyan
Write-Status "  https://snc511.web.app"
Write-Status "  https://snc511.firebaseapp.com"

Write-Status "`nChecks post-deploy:" -ForegroundColor Cyan
$postChecks = @(
    'Página principal carga sin errores JS críticos',
    '/api/health responde OK',
    '/api/plans expone catálogo público',
    'Login/register operativos si aplica',
    'Exportación y validación accesibles desde UI',
    '/admin.html protegido (solo accesible con login admin)',
    'HSTS y CSP activos en respuestas',
    'Cloud Functions desplegadas y responden'
)
$i = 1
foreach ($check in $postChecks) {
    Write-Host ("  {0}. [ ] {1}" -f $i, $check)
    $i++
}

Confirm-Continue "`nVerifica lo anterior. Presiona ENTER para continuar."

# =============================================================================
# Rollback
# =============================================================================
Write-Step "Rollback"
Write-Status "Opciones de rollback:" -ForegroundColor Cyan
Write-Status ""
Write-Status "=== Opción A: Firebase Console (rápido) ===" -ForegroundColor Cyan
Write-Status "1. Ir a https://console.firebase.google.com/project/snc511/hosting"
Write-Status "2. Releases > Seleccionar versión anterior > Rollback"
Write-Status ""
Write-Status "=== Opción B: Git revert + redeploy ===" -ForegroundColor Cyan
Write-Status "  cd $projectRoot"
Write-Status "  git revert HEAD"
Write-Status "  git push"
Write-Status "  .\deploy-windows.ps1 -SkipGate -SkipPreview"
Write-Status ""
Write-Status "=== Opción C: Restaurar backup ===" -ForegroundColor Cyan
Write-Status "  wsl bash scripts/restore_sqlite.sh"
Write-Status ""
Write-Status "=== Limpiar canal preview ===" -ForegroundColor Cyan
Write-Status "  firebase hosting:channel:delete preview"

Write-Status "`nProceso finalizado." 'OK'
