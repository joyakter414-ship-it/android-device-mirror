@echo off
title 2. Switch to Wireless Wi-Fi
cd /d "%~dp0..\.."

echo Switching to TCP/IP port 5555...
adb.exe tcpip 5555
timeout /t 2 >nul

set /p PHONE_IP="Enter Phone Wi-Fi IP (e.g. 192.168.1.100): "

echo Connecting to %PHONE_IP%:5555...
adb.exe connect %PHONE_IP%:5555

echo Applying keep-awake settings...
adb.exe -s %PHONE_IP%:5555 shell settings put global stay_on_while_plugged_in 7
adb.exe -s %PHONE_IP%:5555 shell settings put system screen_off_timeout 1800000

echo.
echo ^>^>^> CONNECTED! You can unplug the USB cable now. ^<^<^<
echo Launching scrcpy...
scrcpy.exe -s %PHONE_IP%:5555 --stay-awake --window-title "Phone (Local Wi-Fi)"
pause
