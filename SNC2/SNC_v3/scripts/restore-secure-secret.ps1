param(
    [Parameter(Mandatory = $true)][string]$EncryptedFile,
    [Parameter(Mandatory = $true)][ValidateSet('.env', 'serviceAccountKey.json')][string]$DestinationName
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'backup\secure'))
$sourcePath = [System.IO.Path]::GetFullPath($EncryptedFile)
if (-not $sourcePath.StartsWith($backupRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'El archivo cifrado debe estar dentro de backup\secure.'
}
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw 'No existe el archivo cifrado.' }
$destinationPath = Join-Path $projectRoot $DestinationName
if (Test-Path -LiteralPath $destinationPath) { throw "El destino ya existe: $destinationPath. No se sobrescribió." }
$entropy = [System.Text.Encoding]::UTF8.GetBytes('SNC_v3|local-secure-backup|v1')
$plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
    [System.IO.File]::ReadAllBytes($sourcePath),
    $entropy,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[System.IO.File]::WriteAllBytes($destinationPath, $plainBytes)
Write-Output "Restaurado de forma local: $destinationPath"
