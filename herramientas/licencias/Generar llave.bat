@echo off
chcp 65001 >nul
title ReciclaCat_Gest - Generar llave
cd /d "%~dp0"
node generar-llave.mjs
echo.
pause
