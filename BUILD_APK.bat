@echo off
echo ========================================
echo ZYVERON PLAY v2.9.0 - BUILD APK
echo ========================================
echo.
echo Este script vai compilar o APK melhorado.
echo Tempo estimado: 5-10 minutos
echo.
pause

cd android-tv

echo.
echo [1/3] Limpando build anterior...
call gradlew.bat clean

echo.
echo [2/3] Compilando APK Release (pode demorar)...
call gradlew.bat assembleRelease

echo.
echo [3/3] Verificando APK gerado...
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ========================================
    echo BUILD CONCLUIDO COM SUCESSO!
    echo ========================================
    echo.
    echo APK localizado em:
    echo %CD%\app\build\outputs\apk\release\app-release.apk
    echo.
    dir "app\build\outputs\apk\release\app-release.apk"
    echo.
    echo Proximo passo: Testar o APK em um dispositivo
    echo Comando: adb install -r app\build\outputs\apk\release\app-release.apk
    echo.
) else (
    echo.
    echo ERRO: APK nao foi gerado!
    echo Verifique os erros acima.
    echo.
)

pause
