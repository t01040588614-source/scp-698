# Stock API Backend (MarketLens)

한국(FDR KRX 우선) · 미국(Yahoo 일괄) 시세, WebSocket 캐시 푸시, 포트폴리오 API.

## 시작하기

```bash
pip install -r requirements.txt
cp .env.example .env
# DATABASE_URL, CORS_ORIGINS (http://127.0.0.1:3000 포함)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

첫 한국 종목 로드(FDR)는 **20~30초** 걸릴 수 있습니다.

## API 문서

http://127.0.0.1:8000/docs

## 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/health/` | 서버 상태 |
| GET | `/api/v1/stocks/korea` | 한국 종목 |
| GET | `/api/v1/stocks/us` | 미국 종목 |
| GET | `/api/v1/stocks/search?q=` | 검색 |
| GET | `/api/v1/stocks/history` | 차트용 시계열 |
| GET | `/api/v1/market/indices` | 지수 |
| GET | `/api/v1/market/sectors` | 섹터 |
| GET | `/api/v1/market/cache-status` | 캐시·소스(fdr/yahoo/seed) |
| POST | `/api/v1/market/refresh` | 백그라운드 갱신 트리거 |
| WS | `/ws/stocks` | quotes · ticks · indices (1초, 캐시 기반) |
| * | `/api/v1/portfolio` | CRUD (JWT) |

## 데이터 소스

- **한국:** `finance-datareader` (KRX), Yahoo fallback, 빈 응답 시 `seed_stocks`
- **미국:** Yahoo batch (429 시 seed)
- Yahoo 429 시에도 UI는 seed/캐시로 동작; `POST /market/refresh`로 재시도

## 테스트

```bash
.\venv\Scripts\python.exe -m pytest
```
