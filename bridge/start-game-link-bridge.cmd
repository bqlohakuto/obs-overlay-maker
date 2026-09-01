@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0game-link-bridge.ps1"
if errorlevel 1 pause
