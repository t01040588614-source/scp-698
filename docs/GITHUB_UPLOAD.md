# GitHub에 올리기

로컬 저장소: `MarketLens-krstock-team-share` (이 폴더가 Git 루트입니다.)

**올라가지 않는 것:** `.env`, API 키, `venv/`, `node_modules/`, `.next/` (`.gitignore` 처리)

## 1. GitHub 로그인 (최초 1회)

PowerShell:

```powershell
gh auth login
```

브라우저에서 GitHub 계정으로 승인합니다.

## 2. 새 저장소 만들고 푸시

```powershell
cd $env:USERPROFILE\Desktop\MarketLens-krstock-team-share
gh repo create marketlens-krstock --private --source=. --remote=origin --push
```

공개 저장소로 만들려면 `--public` 로 바꿉니다.

이미 GitHub에 빈 저장소를 만들어 두었다면:

```powershell
git remote add origin https://github.com/<YOUR_USER>/marketlens-krstock.git
git push -u origin main
```

## 3. 다른 PC에서 받기

```powershell
git clone https://github.com/<YOUR_USER>/marketlens-krstock.git
cd marketlens-krstock
copy stock-backend\.env.example stock-backend\.env
copy .env.example .env
# README의 주식대시보드_실행.bat 참고
```

`email-share` 폴더는 Gmail 배포용 복사본이라 **이 repo 하나(team-share)만** 관리하면 됩니다.
