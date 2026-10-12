# DOCX 완전판 — 실행·경로 매핑

원문: [spec-from-docx-full.txt](./spec-from-docx-full.txt)

## Docker (DOCX §2)

```powershell
copy .env.example .env
docker compose up --build
```

| 서비스 | URL |
|--------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000/docs |
| Postgres | localhost:5432 (krstock/krstockpass) |

로컬만 DB: `docker compose up -d db` 후 `주식대시보드_실행.bat`

## ETL (DOCX §5)

PostgreSQL 필수:

```powershell
cd stock-backend
.\venv\Scripts\python.exe scripts\ingest_docx_all.py
```

| DOCX 스크립트 | 본 프로젝트 |
|---------------|-------------|
| ingest-stocks.ts | `app/data_ingest/ingest_stocks.py` |
| ingest-quotes.ts | `app/data_ingest/ingest_quotes.py` |
| ingest-fundamentals.ts | `app/data_ingest/ingest_fundamentals.py` |
| (일괄) | `scripts/ingest_docx_all.py` |

DB 테이블: `kr_stocks`, `kr_stock_quotes`, `kr_fundamental_snapshots`, `kr_stock_news`, `kr_consensus`, `user_screeners`, `user_accounts`, …

## 프론트 경로 (DOCX §4·§5)

| DOCX | URL |
|------|-----|
| /stocks | http://localhost:3000/stocks |
| /stocks/[code] | http://localhost:3000/stocks/005930 |
| /stocks/[code]/chart | http://localhost:3000/stocks/005930/chart |
| /accounts?ownerId=user1 | http://localhost:3000/accounts?ownerId=user1 |
| /accounts/new | http://localhost:3000/accounts/new |
| /accounts/1/trades/new | … |

## API 프록시

- `/api/stocks/*` → FastAPI `/api/v1/stocks/*`
- `/api/accounts/*` → FastAPI `/api/v1/accounts/*`

## NestJS → FastAPI

DOCX의 NestJS/TypeORM monorepo는 **구현하지 않고**, 동일 REST 계약을 FastAPI + SQLAlchemy로 제공합니다. 상세: [DOCX_SPEC_MAPPING.md](./DOCX_SPEC_MAPPING.md)
