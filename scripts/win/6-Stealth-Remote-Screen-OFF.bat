@echo off
title Hector Stealth Remote Control (Physical Screen OFF)
cd /d "%~dp0..\.."

echo ============================================================
echo    HECTOR STEALTH REMOTE CONTROL (PHYSICAL SCREEN OFF)
echo ============================================================
echo Phone Location : Remote (4G/5G / Wi-Fi)
echo Physical Screen: 100% OFF / DARK (No backlight, looks asleep)
echo PC Display     : Live 60 FPS + Mouse and Keyboard
echo ============================================================
echo.

set TOKEN=sk_phone_bridge_8f3a9d2c1e7b45
set WORKER_URL=wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc^&token=%TOKEN%

echo 1. Starting local Cloudflare bridge on port 5556...
start /b "" bin\websocat-win.exe -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "%WORKER_URL%"
timeout /t 2 >nul

echo 2. Connecting ADB to remote endpoint 127.0.0.1:5556...
adb.exe connect 127.0.0.1:5556

echo 3. Launching stealth mirror (Physical screen remains OFF)...
scrcpy.exe -s 127.0.0.1:5556 --turn-screen-off --stay-awake --power-off-on-close --window-title "Remote Phone (STEALTH - Physical Screen OFF)"

echo.
echo Session ended. Remote phone safely locked and sleeping.
pause
