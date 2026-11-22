# Script de Compilação e Empacotamento Zyveron Play para LG Smart TV (webOS)
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "    ZYVERON PLAY - BUILD LG SMART TV (webOS)        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

Write-Host "[1/2] Compilando aplicação React para LG webOS 4.0+..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "[2/2] Gerando pacote com.zyveron.play_2.0.0_all.ipk..." -ForegroundColor Yellow
node scripts/package-ipk.cjs

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  BUILD CONCLUÍDO COM SUCESSO!                      " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
