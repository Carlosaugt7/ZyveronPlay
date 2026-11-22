# ====================================================
# ZYVERON PLAY - SCRIPT DE EMPACOTAMENTO ROKU (POWERSHELL)
# ====================================================
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   ZYVERON PLAY - EMPACOTAMENTO NATIVO ROKU TV      " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$RokuDir = Split-Path -Parent $PSScriptRoot
Set-Location $RokuDir

node scripts/package-roku.cjs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCESSO] Pacote gerado com sucesso em: $RokuDir\ZyveronPlay_Roku_2.0.0.zip" -ForegroundColor Green
} else {
    Write-Host "`n[ERRO] Falha ao empacotar aplicativo Roku." -ForegroundColor Red
}
