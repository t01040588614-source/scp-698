# MarketLens (주식 프로젝트)

한국·미국 시세, WebSocket 실시간(캐시 기반), 포트폴리오·관심목록을 제공하는 **MarketLens** 웹 앱입니다.

## 빠른 실행

| 파일 | 설명 |
|------|------|
| **`주식대시보드_실행.bat`** | **더블클릭 한 번** — Docker Postgres·계좌·DOCX DB, 백(8000)·프론트(3000), API키 허브, ETL(최초 1회), 점검 후 브라우저 |
| **`주식대시보드_Docker.bat`** | **Docker Desktop** — Postgres+API+Next를 **컨테이너**로 한 번에 빌드·기동 (`docker compose up --build`) |
| **`stop-dev.bat`** | 8000·3000 리스닝 프로세스 종료 |
| **`자동시작_등록.bat`** | **PC 켜고 로그인하면** 90초 후 MarketLens 자동 기동 (작업 스케줄러) |
| **`자동시작_해제.bat`** | 위 자동 기동 등록 해제 |
| **`scripts/verify-stack.ps1`** | health · cache · API · 프록시 · `/korea` 점검 |

### PC 재부팅 후 자동 실행

1. **최초 1회** `주식대시보드_실행.bat`으로 Next.js 빌드까지 완료해 두세요. (이후 자동 기동은 빌드가 있으면 `npm run start`만 사용)
2. **`자동시작_등록.bat`** 더블클릭 → Windows **작업 스케줄러**에 `MarketLens-AutoStart` 등록
3. **Docker Desktop** → *Settings → General* → **Start Docker Desktop when you sign in** 켜기 (PostgreSQL·전체 기능용)
4. 재부팅 후 **로그인 약 90초 뒤** 백엔드(8000)·프론트(3000)가 켜지고, 준비되면 브라우저가 열립니다.
5. 문제 시 로그: `%LOCALAPPDATA%\MarketLens\autostart.log` · 수동 점검: `주식대시보드_실행.bat`

브라우저 자동 열기를 끄려면:  
`powershell -File scripts\install-autostart.ps1 -NoBrowser`

CSS가 꼬였을 때: `stop-dev.bat` 후 `주식대시보드_실행.bat` (기본으로 `.next` 삭제). 빠른 재기동만: `start.bat -SkipClean`.

**시세:** Yahoo `fast_info` 현재가 → 백엔드 캐시(장중 ~1초 fast·구독 종목) → WebSocket 1초 푸시. 표·티커·지수는 같은 캐시 기준입니다.

**차트:** 종목·지수는 Yahoo 분·시간봉 우선(429 시 `download` 재시도). 지수는 FDR 일봉 폴백, **1일** 탭은 Yahoo 복구 시 **5m 등 당일 봉**으로 표시됩니다.

## 구조

| 폴더 | 역할 |
|------|------|
| `stock-backend/` | FastAPI, FDR/Yahoo 시세, WebSocket, PostgreSQL |
| `my-frontend/` | Next.js 14, `/api/v1` 프록시, MarketWebSocketProvider |
| `docs/` | [DOCX 완전판 추출](./docs/spec-from-docx-full.txt), [구현 상태](./docs/SPEC_STATUS.md) |

## 명세·점검 (1·2·3)

1. **명세** — [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md), [docs/SPEC_STATUS.md](./docs/SPEC_STATUS.md)  
2. **실행 검증** — 서버 기동 후 `powershell -File scripts/verify-stack.ps1`  
3. **우선 기능** — 실시간 WS·차트·포트폴리오·`/search` (체크리스트 참고)

## 환경

- Python 3.11+ (`stock-backend/venv`)
- Node 18+ (`my-frontend`)
- 프론트 `.env.local`: `STOCK_API_PROXY=http://127.0.0.1:8000`

### Render 무료 클라우드 배포 (팀 공유 URL, PC 불필요)

루트 **`render.yaml`** Blueprint → [docs/DEPLOY_RENDER.md](./docs/DEPLOY_RENDER.md)

1. Render → **New → Blueprint** → 이 GitHub repo 연결 → **Apply**
2. 팀에게 **`marketlens-web` HTTPS URL**만 공유

### DOCX 완전판 (PostgreSQL + Docker)

```powershell
copy .env.example .env
docker compose up --build
```

또는 DB만: `docker compose up -d db` + [DOCX_COMPLETE.md](./docs/DOCX_COMPLETE.md)

- ETL: `stock-backend\venv\Scripts\python.exe scripts\ingest_docx_all.py`
- `/stocks`, `/accounts`, Lightweight Charts — [SPEC_STATUS.md](./docs/SPEC_STATUS.md)

실행 bat은 **Docker 있으면 SQLite → Postgres 자동 전환** (전 기능). 시세만 원하면 `stock-backend/.use_sqlite` 빈 파일 생성.

### API 키만 넣으면 연동

1. **UI:** [http://localhost:3000/tools/integrations](http://localhost:3000/tools/integrations) 에서 저장 (개발 모드 기본 허용)  
2. **또는** `stock-backend/.env` / `stock-backend/data/integration_keys.json` (예시: `data/integration_keys.json.example`)

| 키 | 효과 |
|----|------|
| `KIS_APP_KEY` + `KIS_APP_SECRET` | 한국 시세 **KIS 우선** |
| `FINNHUB_API_KEY` / `US_STOCK_API_KEY` | 미국 시세 Finnhub 우선 |
| `ALPHA_VANTAGE_API_KEY` | 미국 시세 (Finnhub 없을 때) |
| `GOOGLE_*` / `KAKAO_*` | 로그인 페이지 소셜 버튼 |
| `NEWS_API_KEY` | `/api/v1/news` NewsAPI 헤드라인 |
| `FCM_SERVER_KEY` | `POST /api/v1/integrations/fcm/test` |

OAuth 콜백 URL은 Google/Kakao 콘솔에  
`{OAUTH_BACKEND_BASE}/api/v1/auth/oauth/google/callback` 등으로 등록하세요.

자세한 내용: [my-frontend/README.md](./my-frontend/README.md), [stock-backend/README.md](./stock-backend/README.md).
