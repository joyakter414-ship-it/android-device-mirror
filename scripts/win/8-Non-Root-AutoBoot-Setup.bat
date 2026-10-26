@echo off
title Hector Non-Root Permanent Auto-Boot Setup
cd /d "%~dp0..\.."

echo ============================================================
echo     HECTOR NON-ROOT PERMANENT AUTO-BOOT SETUP
echo ============================================================
echo Goal: Reconnect automatically after reboot WITHOUT ROOT!
echo ============================================================
echo.

adb.exe devices
adb.exe shell "dumpsys deviceidle whitelist +com.termux" 2>nul
adb.exe shell "dumpsys deviceidle whitelist +com.termux.boot" 2>nul

echo Done! Whitelisted Termux from battery saver.
pause
