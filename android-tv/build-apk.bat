@echo off
echo ========================================================
echo        Zyveron Play TV - Compilador de APK
echo ========================================================
echo.
echo Selecione o tipo de build:
echo [1] APK Debug (Para testes rapidos via pendrive/ADB)
echo [2] APK Release (Otimizado com Proguard para distribuicao)
echo.
set /p opt="Digite sua opcao (1 ou 2): "

if "%opt%"=="1" (
    echo.
    echo Compilando APK Debug...
    call gradlew assembleDebug
    echo.
    echo APK gerado em: app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo Compilando APK Release...
    call gradlew assembleRelease
    echo.
    echo APK gerado em: app\build\outputs\apk\release\app-release-unsigned.apk
)

echo.
pause

