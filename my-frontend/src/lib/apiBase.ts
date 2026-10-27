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

function resolvePublicWsUrl(env: string, pageProto: "http:" | "https:"): string | null {
  try {
    const wsProto = pageProto === "https:" ? "wss:" : "ws:";
    let wsUrl = env;
    if (!/^wss?:\/\//i.test(wsUrl)) {
      wsUrl = `${wsProto}//${wsUrl.replace(/^\/\//, "")}`;
    }
    const parsed = new URL(wsUrl);
    if (!parsed.pathname.includes("/ws/")) {
      parsed.pathname = "/api/v1/ws/stocks";
    }
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** WebSocket — Caddy 단일 포트: same-origin / Render: NEXT_PUBLIC_WS_URL → API 호스트 */
export function getWsStocksUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    const localDev =
      (pageHost === "localhost" || pageHost === "127.0.0.1") &&
      window.location.port === "3000";
    const pageProto = window.location.protocol as "http:" | "https:";

    if (env && !localDev) {
      const crossHost = resolvePublicWsUrl(env, pageProto);
      if (crossHost) {
        return crossHost;
      }
    }

    if (!localDev) {
      const proto = pageProto === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}/api/v1/ws/stocks`;
    }

    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    const proto = pageProto === "https:" ? "wss:" : "ws:";
    if (env) {
      const local = resolvePublicWsUrl(env, pageProto);
      if (local) {
        return local;
      }
    }
    return `${proto}//127.0.0.1:${port}/api/v1/ws/stocks`;
  }
  if (env) {
    return env.startsWith("ws") ? env : `ws://${env}/api/v1/ws/stocks`;
  }
  return "ws://127.0.0.1:8000/api/v1/ws/stocks";
}
