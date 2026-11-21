@echo off
chcp 65001 > nul
echo ====================================================
echo   ZYVERON PLAY - BUILD SAMSUNG SMART TV (TIZEN OS)
echo ====================================================
echo.

cd /d "%~dp0\.."

echo [1/2] Compilando aplicação React para Tizen 4.0+...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha na compilação do TypeScript/Vite!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Gerando pacote ZyveronPlay.wgt...
node scripts/package-wgt.cjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao empacotar o .wgt!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo   BUILD CONCLUÍDO! O arquivo ZyveronPlay.wgt está pronto!
echo ====================================================
pause
