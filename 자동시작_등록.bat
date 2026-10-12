@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MarketLens 자동 시작 등록
echo.
echo  Windows 로그인 후 MarketLens가 자동으로 켜지도록 등록합니다.
echo  (로그인 90초 후 — Docker Desktop 기동 시간 확보)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-autostart.ps1"
echo.
pause
