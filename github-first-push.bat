@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "GH=%ProgramFiles%\GitHub CLI\gh.exe"
if not exist "%GH%" (
  echo GitHub CLI ^(gh^) 가 없습니다. winget install GitHub.cli 후 다시 실행하세요.
  pause
  exit /b 1
)

echo === GitHub 로그인 확인 ===
"%GH%" auth status
if errorlevel 1 (
  echo.
  echo gh 로그인이 필요합니다. 브라우저에서 device code 승인까지 완료하세요.
  "%GH%" auth login -h github.com -p https -w
  if errorlevel 1 (
    echo 로그인 실패
    pause
    exit /b 1
  )
)

echo.
echo === 저장소 생성 및 push ^(private: marketlens-krstock^) ===
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  "%GH%" repo create marketlens-krstock --private --source=. --remote=origin --push
) else (
  echo origin 이미 있음 — push 만 시도합니다.
  git push -u origin main
)

if errorlevel 1 (
  echo.
  echo 실패. 저장소 이름이 이미 있으면 GitHub에서 삭제하거나 docs\GITHUB_UPLOAD.md 를 참고하세요.
  pause
  exit /b 1
)

echo.
echo 완료. GitHub에서 repo URL 을 확인하세요:
"%GH%" repo view --web
pause
