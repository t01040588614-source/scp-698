@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MarketLens
echo.
echo  ========================================
echo   MarketLens - double-click to start
echo  ========================================
echo   [Auto start]
echo   - Docker PostgreSQL 16 (accounts, screener, DOCX DB)
echo   - FastAPI :8000 + Next.js :3000 (dev mode, hot reload)
echo   - WebSocket quotes
echo   [First run background]
echo   - DOCX ETL (seed, max 40 symbols)
echo   [Browser]
echo   - http://127.0.0.1:3000/markets
echo   [Quotes only without Docker]
echo   - Create file: stock-backend\.use_sqlite
echo   [Stop] stop-dev.bat
echo.
echo  NOTE: If Korean text looks garbled, that was a console encoding bug.
echo        This launcher now uses English log lines in start-servers.ps1.
echo.
call "%~dp0start.bat" -Dev -SkipClean %*
if errorlevel 1 (
    echo.
    echo  [FAILED] See messages above. Common fix: start Docker Desktop, then retry.
    pause
    exit /b 1
)
echo.
echo  Servers run in minimized cmd windows (Stock Backend / Stock Frontend).
echo  You can close this window. Auto-close in 5s...
timeout /t 5 /nobreak >nul
exit /b 0
