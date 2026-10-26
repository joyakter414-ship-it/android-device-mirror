@echo off
title 4. Offline Storage Backup
cd /d "%~dp0..\.."

echo Pulling entire /sdcard/ to C:\PhoneBackup...
mkdir C:\PhoneBackup 2>nul
adb.exe pull /sdcard/ C:\PhoneBackup
echo.
echo ^>^>^> BACKUP FINISHED! Saved in C:\PhoneBackup ^<^<^<
pause
