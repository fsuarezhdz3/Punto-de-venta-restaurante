@echo off
title Configurar Inicio Automatico del POS Backend
echo ========================================================
echo  Configurando inicio automatico del Backend con Windows
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\iniciar_backend_pos.vbs

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%SCRIPT_DIR%"
echo WshShell.Run "node src/server.js", 0, False
) > "%STARTUP_VBS%"

if exist "%STARTUP_VBS%" (
    echo [EXITO] El backend arrancara solo e invisible cada vez que enciendas la PC.
    echo Archivo generado en:
    echo "%STARTUP_VBS%"
) else (
    echo [ERROR] No se pudo crear el archivo en la carpeta de Inicio.
)

echo.
pause
