@echo off
title Hector Silent Spectator (Kids Live Monitoring)
cd /d "%~dp0..\.."

echo ============================================================
echo     HECTOR SILENT SPECTATOR (KIDS LIVE MONITORING)
echo ============================================================
echo Phone Display : Normal in kid's hand (No alert, No icon)
echo PC Display    : Live 60 FPS View-Only + Auto Recording
echo ============================================================
echo.

set TOKEN=sk_phone_bridge_8f3a9d2c1e7b45
set WORKER_URL=wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc^&token=%TOKEN%

start /b "" bin\websocat-win.exe -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "%WORKER_URL%"
timeout /t 2 >nul

adb.exe connect 127.0.0.1:5556

scrcpy.exe -s 127.0.0.1:5556 --no-control --window-title "Live Monitoring (Silent Spectator - No Notice on Phone)"
pause
