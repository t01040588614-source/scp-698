# DOCX 명세 ↔ 주식대시 구현 매핑

원본: `docs/spec-from-docx-full.txt` (완전판), `docs/spec-from-docx.txt` (초판)

| DOCX (NestJS/monorepo) | 본 프로젝트 (FastAPI + Next.js) |
|------------------------|----------------------------------|
| `apps/web` Next.js 14 | `my-frontend/` |
| `apps/api` NestJS + TypeORM | `stock-backend/` FastAPI + SQLAlchemy |
| `GET /stocks` 필터·정렬 | **`GET /api/v1/stocks`** (+ `/api/v1/kr/stocks`) |
| `GET /stocks/:code` | **`GET /api/v1/stocks/{code}`** (6자리) |
| `GET /stocks/:code/quotes` | `GET /api/v1/stocks/{code}/quotes` |
| `GET /stocks/:code/news` | `GET /api/v1/stocks/{code}/news` |
| `GET /stocks/:code/consensus` | `GET /api/v1/stocks/{code}/consensus` |
| `POST/GET/DELETE screeners` | **`/api/v1/stocks/screeners`** |
| Next rewrite `/api/stocks` | `next.config.mjs` → `:8000/api/v1/stocks` |
| `/stocks` UI | `/korea` + `/stocks` → redirect |
| `/stocks/[code]` | `/quote/korea/[code]` + redirect |
| ingest-stocks/quotes/fundamentals | `scripts/ingest_kr_analytics.py` + startup seed |
| docker-compose Postgres 16 | `docker-compose.yml` (DB만, 선택) |
| entities 6종 | `app/models/kr_analytics.py` + 기존 User |

| DOCX Accounts | 본 프로젝트 |
|---------------|-------------|
| `GET/POST /accounts` | **`/api/v1/accounts`** (+ `/api/accounts` rewrite) |
| positions / trades / snapshots | 동일 경로, `ownerId` 쿼리 (기본 `user1`) |
| 매매 PATCH/DELETE | 구현 + 포지션 재계산 |
| `/accounts/...` 페이지 | Investing 톤 UI |

## 미적용 / 차이

- NestJS → **FastAPI** (동일 REST 계약, prefix `/api/v1/kr`)
- 실시간 WS·미국 시장·포트폴리오는 기존 **주식대시** 기능 유지
- KIS HTS급 틱·유료 재무 API는 **시드 + FDR/Yahoo 캐시**로 대체
- 계좌 기능은 **PostgreSQL** 필요 (SQLite만이면 시세·로컬 스크리너만)
