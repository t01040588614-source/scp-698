@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MarketLens 자동 시작 해제
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-autostart.ps1"
echo.
pause
