@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MarketLens (Production)
echo.
echo  Production: npm run build then start (faster page loads)
echo  For dev with hot reload use: start dashboard launcher (Dev bat)
echo.
call "%~dp0start.bat" -Prod %*
if errorlevel 1 pause
exit /b %errorlevel%
