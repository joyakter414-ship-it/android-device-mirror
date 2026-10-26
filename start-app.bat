@echo off
title Device Mirror Control Center
cd /d "%~dp0"

echo ============================================================
echo    LAUNCHING DEVICE MIRROR CONTROL CENTER
echo ============================================================
echo Opening dashboard in browser...
start "" "http://localhost:3333"
node server/index.js
pause
