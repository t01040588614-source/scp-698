/** 호스트만 있을 때 https:// 붙이기 (Render STOCK_API_PROXY) */
function normalizeHttpOrigin(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Render fromService.host 는 내부 이름(예: marketlens-api-h3h9)만 준다 → 공개 주소로 변환
  if (/^[a-z0-9-]+$/i.test(trimmed) && trimmed !== "localhost") {
    return `https://${trimmed}.onrender.com`;
  }
  return `https://${trimmed}`;
}

/** Render Blueprint: marketlens-web ↔ marketlens-api */
function resolveRenderApiOrigin(pageHost: string): string | null {
  if (!pageHost.endsWith(".onrender.com")) return null;

  const wsEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsEnv) {
    const hostOnly = wsEnv.replace(/^\/\//, "").split("/")[0];
    if (hostOnly) return normalizeHttpOrigin(hostOnly);
  }

  const apiEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiEnv?.startsWith("http")) {
    return apiEnv.replace(/\/api\/v1\/?$/, "");
  }

  if (pageHost.includes("-web")) {
    return `https://${pageHost.replace("-web", "-api")}`;
  }
  return null;
}

/** SSR·서버 컴포넌트용 백엔드 직접 URL */
export function getServerApiBaseUrl(): string {
  const proxy = process.env.STOCK_API_PROXY?.replace(/\/$/, "");
  if (proxy) {
    const origin = normalizeHttpOrigin(proxy);
    if (origin) {
      return origin.endsWith("/api/v1") ? origin : `${origin}/api/v1`;
    }
  }
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env?.startsWith("http")) {
    return env.endsWith("/api/v1") ? env : `${env}/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
}

/**
 * 브라우저: 로컬은 Next rewrites(`/api/v1`). Render는 API 서비스 직접(CORS 허용).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    const localDev =
      (pageHost === "localhost" || pageHost === "127.0.0.1") &&
      (window.location.port === "3000" || window.location.port === "");

    if (!localDev) {
      const renderOrigin = resolveRenderApiOrigin(pageHost);
      if (renderOrigin) {
        return `${renderOrigin}/api/v1`;
      }
    }
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

/** WebSocket — Render: API 호스트 직접 / Caddy: same-origin */
export function getWsStocksUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    const localDev =
      (pageHost === "localhost" || pageHost === "127.0.0.1") &&
      window.location.port === "3000";
    const pageProto = window.location.protocol as "http:" | "https:";

    if (!localDev) {
      const renderOrigin = resolveRenderApiOrigin(pageHost);
      if (renderOrigin) {
        const u = new URL(renderOrigin);
        return `wss://${u.host}/api/v1/ws/stocks`;
      }
    }

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
