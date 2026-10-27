# 모바일 실기기 뷰포트 스크린 체크리스트

자동 캡처: `npm run test:e2e:mobile-checklist`  
출력: `e2e/mobile-checklist-captures/` (`{viewport}-{route}-top.png`, `-scrolled.png`)

## 뷰포트

| ID | 기기 참고 | Width × Height |
| --- | --- | --- |
| `iphone-se` | iPhone SE | 375 × 667 |
| `iphone-14` | iPhone 14 | 390 × 844 |
| `iphone-14-pro-max` | iPhone 14 Pro Max | 430 × 932 |
| `galaxy-s23` | Galaxy S23 | 360 × 780 |
| `pixel-7` | Pixel 7 | 412 × 915 |

## 공통 확인 (각 캡처)

- [ ] `mobile-header`가 상단에 고정되고 가려지지 않음
- [ ] `app-market-chrome-sticky` — 시장 세션·빠른 이동(또는 KR/US 하위 탭)이 헤더 바로 아래 정렬
- [ ] **top** — 티커가 있는 페이지(`/markets`, `/watchlist`)에서 티커가 크롬 스택 안에 보임
- [ ] **scrolled** — `.is-pinned` 시 티커·안내 바가 접히고 빠른 이동/하위 탭이 뷰포트 안에 남음
- [ ] 하단 `BottomNavigation`이 본문을 가리지 않음 (`safe-area` 포함)
- [ ] 가로 pill 스크롤(빠른 이동)이 끊기지 않고 터치 스크롤 가능

## 라우트별

### `/markets` (`markets`)

- [ ] 빠른 이동 4개(한국·미국·시장 개요·캘린더) 노출
- [ ] 티커 카드 가로 스크롤·그라데이션 fade

### `/korea` (`korea`)

- [ ] 하위 탭(개요·랭킹 등) sticky 스택에 포함
- [ ] 티커 **미표시** (의도된 hideTicker)

### `/watchlist` (`watchlist`)

- [ ] 티커 + 빠른 이동 동시 노출
- [ ] 스크롤 후 pinned에서 «관심» 본문이 헤더 아래부터 시작

## 회귀 E2E

`npm run test:e2e -- e2e/market-chrome-sticky.spec.ts` — 스크롤 후 빠른 이동 노출 자동 검증.
