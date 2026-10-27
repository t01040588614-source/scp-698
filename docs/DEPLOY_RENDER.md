# Render 무료 완전 배포 (24/7 클라우드 URL)

로컬 PC·Cloudflare 터널 없이 **팀이 항상 접속할 URL**을 쓰려면 Render Blueprint를 적용합니다.

## 1. Blueprint 적용 (최초 1회)

1. [Render Dashboard](https://dashboard.render.com) 로그인
2. **New → Blueprint**
3. GitHub 연결 후 저장소 **`t01040588614-source/scp-698`** 선택
4. **Apply** → `marketlens-db`, `marketlens-api`, `marketlens-web` 생성 대기 (빌드 15~25분)

## 2. 팀 공유 주소

| 서비스 | 용도 |
|--------|------|
| **marketlens-web** | 브라우저 접속 — `https://marketlens-web.onrender.com` (이름은 대시보드에 표시된 URL) |
| marketlens-api | API·WebSocket (프론트가 자동 연결) |

**팀에게는 `marketlens-web` URL만 보내면 됩니다.**

## 3. 무료 플랜 한계

- 15분 미접속 시 **슬립** → 첫 로딩 30~60초
- Postgres free DB **90일** 후 만료 가능 → [Render Docs](https://render.com/docs/free) 참고
- Redis 없음 → rate limit 등은 메모리 폴백

## 4. API 키

배포 후 `https://…/tools/integrations` 에서 KIS·Finnhub 등 입력 (선택).

## 5. 재배포

GitHub `main`/`master`에 push하면 Render가 **자동 재빌드** (Auto Deploy 켜진 경우).

## 6. 로컬 Docker와의 차이

| | 로컬 + Caddy 80 / Cloudflare | Render |
|--|------------------------------|--------|
| PC 켜 둘 필요 | 예 | 아니오 |
| 고정 HTTPS URL | 터널/도메인 필요 | web 서비스 URL |
| 완전 상용 | 아님 | 무료 한도 내 **상시 호스팅** |
