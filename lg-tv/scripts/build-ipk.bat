@echo off
chcp 65001 > nul
echo ====================================================
echo   ZYVERON PLAY - BUILD LG SMART TV (webOS)
echo ====================================================
echo.

cd /d "%~dp0\.."

echo [1/2] Compilando aplicação React para LG webOS 4.0+...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha na compilação do TypeScript/Vite!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Gerando pacote com.zyveron.play_2.0.0_all.ipk...
node scripts/package-ipk.cjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao empacotar o .ipk!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo   BUILD CONCLUÍDO! O arquivo .ipk da LG está pronto!
echo ====================================================
pause
