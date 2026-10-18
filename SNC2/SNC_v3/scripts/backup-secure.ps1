$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'backup\secure'))
if (-not $backupRoot.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'La carpeta de respaldo quedó fuera del proyecto.'
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivePath = Join-Path $backupRoot "SNC_v3_codigo_html_$timestamp.zip"

$sourcePaths = @()
$sourcePaths += Get-ChildItem -LiteralPath $projectRoot -File -Filter '*.html' | ForEach-Object FullName
foreach ($relative in @('js', 'css', 'docs', 'tests', 'img', 'scripts', 'package.json', 'package-lock.json', 'server-api.js', 'db.cjs', 'firebase.json', 'firebase.scripts.json', '.firebaserc', '.gitignore', 'DEPLOY.md')) {
    $candidate = Join-Path $projectRoot $relative
    if (Test-Path -LiteralPath $candidate) { $sourcePaths += $candidate }
}
if (-not $sourcePaths.Count) { throw 'No se encontraron archivos de código para respaldar.' }
Compress-Archive -LiteralPath $sourcePaths -DestinationPath $archivePath -CompressionLevel Optimal -Force

$entropy = [System.Text.Encoding]::UTF8.GetBytes('SNC_v3|local-secure-backup|v1')
$secretResults = @()
foreach ($secretName in @('.env', 'serviceAccountKey.json')) {
    $secretPath = Join-Path $projectRoot $secretName
    if (-not (Test-Path -LiteralPath $secretPath -PathType Leaf)) { continue }
    $plainBytes = [System.IO.File]::ReadAllBytes($secretPath)
    $cipherBytes = [System.Security.Cryptography.ProtectedData]::Protect(
        $plainBytes,
        $entropy,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $cipherPath = Join-Path $backupRoot "$secretName.$timestamp.dpapi"
    [System.IO.File]::WriteAllBytes($cipherPath, $cipherBytes)
    $secretResults += [ordered]@{
        source = $secretName
        encrypted_file = [System.IO.Path]::GetFileName($cipherPath)
        source_sha256 = (Get-FileHash -LiteralPath $secretPath -Algorithm SHA256).Hash
        protection = 'Windows DPAPI CurrentUser'
    }
}

$manifest = [ordered]@{
    created_at = (Get-Date).ToString('o')
    project_root = $projectRoot
    code_archive = [System.IO.Path]::GetFileName($archivePath)
    code_archive_sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
    secrets = $secretResults
    excluded_external_html = 'C:\Users\HP 250 G10\Documents\GITHUT\index.html (SECCIONAL 40; proyecto ajeno)'
}
$manifestPath = Join-Path $backupRoot "manifest_$timestamp.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

[pscustomobject]@{
    Archive = $archivePath
    Manifest = $manifestPath
    EncryptedSecrets = $secretResults.Count
}
