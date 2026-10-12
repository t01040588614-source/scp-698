# MarketLens (반응형 금융 UI)

DOCX 명세 기준 **웹·모바일 반응형** 금융·시장 데이터 프론트엔드입니다.

## 실행 (권장: 원클릭)

프로젝트 루트에서 **`주식대시보드_실행.bat`** 또는 **`start.bat`** 더블클릭:

- 8000/3000 포트 정리 → `.next` 삭제 후 백·프론트 기동 (빠른 재시작: `-SkipClean`)
- CSS 200 확인 후 **브라우저에서 http://127.0.0.1:3000/korea 자동 오픈**

스택 점검 (서버 실행 중): 프로젝트 루트에서  
`powershell -ExecutionPolicy Bypass -File scripts/verify-stack.ps1`

수동 실행:

```bash
npm install
npm run dev
```

### CSS가 깨져 보일 때 (레이아웃/스타일 미적용)

`/_next/static/css/...` 가 **404**이면 `.next` 캐시가 꼬인 상태입니다. (헤더·메뉴 중복, 검은 배경만 보임)

**원인:** `npm run dev` 실행 중 `npm run build`를 돌리거나, dev 서버를 재시작하지 않고 `.next`만 바뀐 경우.

**권장:** `주식대시보드_실행.bat`으로 다시 시작 (포트 정리 + `.next` 삭제 + 브라우저 자동 오픈).

`layout.tsx`에 **인라인 critical CSS**가 있어 CSS 404 시에도 최소 레이아웃은 유지됩니다.

```bash
cd my-frontend
Remove-Item -Recurse -Force .next   # PowerShell
npm run dev
```

브라우저에서 **강력 새로고침**(Ctrl+Shift+R) 후 확인하세요.

## 빌드

```bash
npm run build
npm start
```

## 환경 변수

- `STOCK_API_PROXY` — Next rewrite 대상 (기본: `http://127.0.0.1:8000`). 브라우저는 **`/api/v1`** 로 호출 (CORS 회피).
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` — SSR·WebSocket용 (로컬: `127.0.0.1:8000`)

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 (2단 대시보드 + 실시간 종목) |
| `/markets` | 시장 현황 |
| `/news` | 뉴스 |
| `/analysis` | 분석 (mock) |
| `/charts` | 차트 |
| `/calendar` | 경제 캘린더 |
| `/tools` | 도구 |
| `/watchlist` | 관심목록 패널 |
| `/korea`, `/us` | API 종목 목록 + WS 플래시 |
| `/search?q=` | 종목 검색 결과 |
| `/quote/[market]/[symbol]` | 종목 상세 |
| `/portfolio` | 포트폴리오 CRUD + WS |
| `/login`, `/register` | 인증 |

## 구현 범위 (명세 반영)

- 데스크톱 헤더 / 모바일 헤더 / 상단 네비 / 하단 고정 네비
- 시장 티커, 시장 테이블(모바일 열 축소 + 카드), 뉴스, 차트, 캘린더, 관심목록
- 로딩·빈·오류 상태, `:focus-visible`, `prefers-reduced-motion`
- **다크 모드** (`ThemeToggle`, `data-theme`, localStorage)
- mock + 서비스 계층, SEO 메타(`createPageMetadata`)
- 공통: `Button`, `Badge`, `Modal`, `ThemeToggle`
- 기존 한국/미국 주식 API·WebSocket·포트폴리오·로그인 **유지**

## mock / API

- `src/data/mockData.ts`
- `src/services/marketApi.ts`, `newsApi.ts`, `calendarApi.ts`, `analysisApi.ts`, `toolsApi.ts`, `searchApi.ts`

## 중간점검 설정

- `src/config/uiConfig.ts`
- `src/styles/variables.css`

## 스타일

- `src/styles/variables.css`, `reset.css`, `layout.css`, `responsive.css`
- `src/app/globals.css`

## API 연동 상태

| 영역 | 상태 |
|------|------|
| 한국/미국 종목, 검색, 포트폴리오, WebSocket | 백엔드 `stock-backend` (`:8000`) |
| 시장 티커·시장 현황 | `stockApi` 데이터로 변환 (`marketApi.ts`) |
| 차트 시계열 | `GET /stocks/history` (Yahoo, 실패 시 시세 기반 추정) |
| 뉴스·캘린더 | `GET /news`, `GET /calendar` (백엔드) · mock fallback |
| 분석·도구 | mock (`analysisApi`, `toolsApi`) |

## 로컬 실행 (백엔드 + 프론트)

```bash
# 터미널 1
cd stock-backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 터미널 2
cd my-frontend
npm run dev
```

- 프론트: http://localhost:3000  
- API 문서: http://127.0.0.1:8000/docs  

## 남은 TODO (추가보완)

- `metadataBase` 실제 도메인 (`src/lib/seo.ts`)
- 한국 장중 HTS급 틱 (KIS 등) — 현재 FDR 일봉 + 캐시 WS
- 공식 PDF/DOCX를 `docs/`에 넣고 [SPEC_STATUS.md](../docs/SPEC_STATUS.md) 대조
