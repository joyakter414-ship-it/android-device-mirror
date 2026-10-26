@echo off
title 1. Blind-Tap USB Debugging Helper
cd /d "%~dp0..\.."

echo ============================================================
echo       BLIND-TAP USB DEBUGGING AUTHORIZATION LISTENER
echo ============================================================
echo Phone Display: BLACK / BROKEN
echo Instructions:
echo  1. Wake the screen (press Power or touch fingerprint sensor).
echo  2. Unplug and re-insert the USB cable.
echo  3. Tap 3-4 times in the lower-middle right quadrant (~4-6 cm up).
echo ============================================================
echo.
echo Listening for USB Authorization...

:loop
for /f "tokens=1,2" %%A in ('adb.exe devices ^| findstr /v "List"') do (
    if "%%B"=="device" (
        echo.
        echo ^>^>^> SUCCESS: PHONE AUTHORIZED! ^<^<^<
        echo Device ID: %%A
        goto done
    )
    if "%%B"=="unauthorized" (
        echo Dialog active on screen! TAP LOWER-RIGHT QUADRANT NOW...
    )
)
timeout /t 1 >nul
goto loop

:done
echo.
echo Next step: Run 2-Switch-Wireless-WiFi.bat
pause
