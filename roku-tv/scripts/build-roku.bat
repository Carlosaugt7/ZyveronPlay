@echo off
REM ====================================================
REM  ZYVERON PLAY - SCRIPT DE EMPACOTAMENTO ROKU (1-CLIQUE)
REM ====================================================

echo ====================================================
echo   Iniciando empacotamento Zyveron Play para Roku TV
echo ====================================================

cd /d "%~dp0\.."
node scripts/package-roku.cjs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCESSO] Pacote ZyveronPlay_Roku_2.0.0.zip gerado com sucesso!
) else (
    echo.
    echo [ERRO] Ocorreu uma falha no empacotamento.
)

pause
