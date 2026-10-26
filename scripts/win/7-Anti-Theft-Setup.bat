@echo off
title Hector Anti-Theft & Auto-Boot Setup
cd /d "%~dp0..\.."

echo ============================================================
echo      HECTOR ANTI-THEFT & REBOOT AUTO-CONNECT SETUP
echo ============================================================
echo Ensures phone reconnects to Cloudflare after being turned off
echo ============================================================
echo.

adb.exe devices
echo.
echo For Rooted phones: installs /data/adb/service.d/hector_boot.sh
echo For Non-Rooted phones: Termux:Boot or Device Owner MDM
pause
