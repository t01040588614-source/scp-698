@echo off
chcp 65001 >nul
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo 서버 종료 완료 (8000, 3000)
pause
