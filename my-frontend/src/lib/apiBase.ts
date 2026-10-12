/** SSR·서버 컴포넌트용 백엔드 직접 URL */
export function getServerApiBaseUrl(): string {
  const proxy = process.env.STOCK_API_PROXY?.replace(/\/$/, "");
  if (proxy?.startsWith("http")) {
    return proxy.endsWith("/api/v1") ? proxy : `${proxy}/api/v1`;
  }
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env?.startsWith("http")) {
    return env.endsWith("/api/v1") ? env : `${env}/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
}

/**
 * 브라우저: Next rewrites(`/api/v1` → 백엔드) — localhost/127.0.0.1 CORS 문제 없음
 * 서버: 127.0.0.1:8000 직접 호출
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return getServerApiBaseUrl();
}

/** WebSocket — 페이지 호스트와 동일 hostname 사용 (localhost ↔ 127.0.0.1 혼용 방지) */
export function getWsStocksUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    return `ws://${host}:${port}/api/v1/ws/stocks`;
  }
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  return "ws://127.0.0.1:8000/api/v1/ws/stocks";
}
