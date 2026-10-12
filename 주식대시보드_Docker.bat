@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MarketLens (Docker)
echo.
echo  ========================================
echo   MarketLens - Docker full stack
echo  ========================================
echo   Requires Docker Desktop running
echo   Services: Postgres + API :8000 + Web :3000
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\docker-compose-up.ps1" -Build
if errorlevel 1 (
    echo.
    echo  [FAILED] Start Docker Desktop and run again.
    pause
    exit /b 1
)
echo.
echo  Done. Close this window or run: docker compose down
timeout /t 8 /nobreak >nul
exit /b 0
