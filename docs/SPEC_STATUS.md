# 구현 상태 (DOCX 명세 반영)

원본: [spec-from-docx-full.txt](./spec-from-docx-full.txt) (Downloads DOCX 완전판), [spec-from-docx.txt](./spec-from-docx.txt)  
매핑: [DOCX_SPEC_MAPPING.md](./DOCX_SPEC_MAPPING.md)

| ID | DOCX 항목 | 상태 | 구현 |
|----|-----------|------|------|
| S1 | GET /stocks 필터·정렬 | ✅ | `GET /api/v1/kr/stocks` |
| S2 | 종목 상세+재무 | ✅ | `GET /api/v1/kr/stocks/{code}` |
| S3 | 일봉 quotes | ✅ | `GET /api/v1/kr/stocks/{code}/quotes` |
| S4 | 뉴스 | ✅ | `GET /api/v1/kr/stocks/{code}/news` |
| S5 | 컨센서스 | ✅ | `GET /api/v1/kr/stocks/{code}/consensus` |
| S6 | 스크리너 CRUD | ✅ | `/api/v1/kr/screeners` (+ 로컬 저장) |
| S7 | /stocks UI | ✅ | `/korea` 스크리너 + `/stocks` redirect |
| S8 | 상세 UI 차트·재무·뉴스 | ✅ | `/quote/korea/…` + `KrQuoteExtras` |
| S9 | ingest ETL | ✅ | `scripts/ingest_kr_analytics.py` + startup seed |
| S10 | PostgreSQL 16 krstock | ✅ | `docker-compose.yml` + `.env.example` |
| S11 | DOCX `/api/v1/stocks` 경로 | ✅ | `stocks_docx_compat.py` |
| E1 | 원클릭 bat | ✅ | `주식대시보드_실행.bat` |
| R1 | WS 실시간 | ✅ | 기존 주식대시 |
| M1 | NestJS monorepo | — | **FastAPI** 로 동일 API 계약 |
| M2 | KIS HTS 틱 | ❌ | FDR 일봉 + 캐시 WS |
| A1 | 계좌 CRUD | ✅ | `GET/POST/PATCH/DELETE /api/v1/accounts` |
| A2 | 보유·매매·현금·포지션 재계산 | ✅ | `recalculate_all` + BUY 잔고 검증 |
| A3 | 매매 수정/삭제 | ✅ | `PATCH/DELETE .../trades/:id` |
| A4 | 일별 스냅샷·자산 차트 | ✅ | `scripts/daily_snapshot_job.py` + Lightweight |
| A5 | 포트폴리오·계좌 UI | ✅ | `/portfolio#docx-accounts` + `/accounts/*` |
| A6 | Next `/api/accounts` 프록시 | ✅ | `next.config.mjs` |
| D1 | docker-compose db+api+web | ✅ | `docker-compose.yml`, Dockerfiles |
| D2 | Stock + StockQuote DB | ✅ | `kr_stock_catalog.py` + ingest |
| D3 | ingest 3종 + 일괄 | ✅ | `ingest_docx_all.py --max-codes 0`, `daily-docx.ps1` |
| D4 | `/stocks` 보드·상세·chart | ✅ | Lightweight Charts |
| D5 | 뉴스 sentiment·컨센 고/저 | ✅ | `KrQuoteExtras` |
| D6 | 스크리너 sector/PBR/배당 | ✅ | `KoreaScreenerPanel` |
| D7 | `.env.example` (루트) | ✅ | Docker env |
| I1 | API 키 연동 허브 | ✅ | `/tools/integrations`, `PUT /integrations/keys` |
| I2 | KIS·Finnhub·Alpha 시세 | ✅ | 키 시 `market_data` 소스 전환 |
| I3 | Google/Kakao OAuth | ✅ | 키 시 `/auth/oauth/*` |
| I4 | NewsAPI·FCM | ✅ | `NEWS_API_KEY`, `POST .../fcm/test` |

**범례:** ✅ 완료 · ⏳ 선택 · ❌ 미구현
