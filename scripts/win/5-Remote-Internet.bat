@echo off
title 5. Remote Internet Control (Cloudflare)
cd /d "%~dp0..\.."

set TOKEN=sk_phone_bridge_8f3a9d2c1e7b45
set WORKER_URL=wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc^&token=%TOKEN%

echo Starting local bridge on 127.0.0.1:5556...
start /b "" bin\websocat-win.exe -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "%WORKER_URL%"
timeout /t 2 >nul

echo Connecting ADB to 127.0.0.1:5556...
adb.exe connect 127.0.0.1:5556

echo Launching Scrcpy over remote internet tunnel...
scrcpy.exe -s 127.0.0.1:5556 --stay-awake --window-title "Phone (Remote Internet Bridge)"
