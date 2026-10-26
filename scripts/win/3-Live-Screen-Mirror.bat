@echo off
title 3. Live Screen Mirror (60 FPS)
cd /d "%~dp0..\.."

scrcpy.exe --stay-awake --window-title "Phone Live Screen (60 FPS)"
