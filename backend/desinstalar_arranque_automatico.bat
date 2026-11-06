@echo off
title Desactivar Inicio Automatico del POS Backend
echo ========================================================
echo  Desactivando inicio automatico del Backend con Windows
echo ========================================================
echo.

set STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\iniciar_backend_pos.vbs

if exist "%STARTUP_VBS%" (
    del "%STARTUP_VBS%"
    echo [EXITO] Se ha eliminado el inicio automatico.
) else (
    echo [INFO] No habia ningun script de inicio configurado.
)

echo.
pause
