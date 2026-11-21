# Script de Compilação e Empacotamento Zyveron Play para Samsung Tizen OS
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  ZYVERON PLAY - BUILD SAMSUNG SMART TV (TIZEN OS)  " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

Write-Host "[1/2] Compilando aplicação React para Tizen 4.0+..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "[2/2] Gerando pacote ZyveronPlay.wgt..." -ForegroundColor Yellow
node scripts/package-wgt.cjs

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  BUILD CONCLUÍDO COM SUCESSO!                      " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
