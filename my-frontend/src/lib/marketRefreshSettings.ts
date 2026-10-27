/** 브라우저·환경 변수 기준 자동 시세(REST) 폴링 프리셋 — 가격은 WS 우선 */

export type QuoteRefreshPreset = "live" | "balanced" | "eco";

const STORAGE_KEY = "stock-dashboard-quote-refresh";
const AUTO_THROTTLE_EVENT = "quote-refresh-auto-throttle";

let autoYahooThrottle = false;

const PRESET_META: Record<
  QuoteRefreshPreset,
  { label: string; description: string; scale: number; minMs: number; autoWarmup: boolean }
> = {
  live: {
    label: "실시간",
    description: "WS 서브초 푸시 + 장중 캐시·REST 최대 속도 (가격은 WS 기준)",
    scale: 0.32,
    minMs: 750,
    autoWarmup: true,
  },
  balanced: {
    label: "균형",
    description: "WebSocket + 기본 폴링 (권장)",
    scale: 1,
    minMs: 1_000,
    autoWarmup: true,
  },
  eco: {
    label: "절약",
    description: "폴링 간격 확대 · API 부담 감소",
    scale: 1.75,
    minMs: 1_500,
    autoWarmup: true,
  },
};

export const QUOTE_REFRESH_PRESETS = (Object.keys(PRESET_META) as QuoteRefreshPreset[]).map(
  (id) => ({ id, ...PRESET_META[id] })
);

function envPreset(): QuoteRefreshPreset | null {
  const raw = process.env.NEXT_PUBLIC_QUOTE_REFRESH_PRESET?.trim().toLowerCase();
  if (raw === "live" || raw === "balanced" || raw === "eco") return raw;
  return null;
}

export function isQuoteRefreshPreset(value: string): value is QuoteRefreshPreset {
  return value === "live" || value === "balanced" || value === "eco";
}

export function isAutoYahooThrottleActive(): boolean {
  return autoYahooThrottle;
}

/** Yahoo 429·타임아웃 시 절약 프리셋 자동 적용 (localStorage 사용자 선택은 유지) */
export function setAutoYahooThrottle(active: boolean): void {
  if (typeof window === "undefined") return;
  if (autoYahooThrottle === active) return;
  autoYahooThrottle = active;
  window.dispatchEvent(new CustomEvent(AUTO_THROTTLE_EVENT, { detail: active }));
}

/** SSR·하이드레이션 초기값 (localStorage 미사용) */
export function defaultQuoteRefreshPreset(): QuoteRefreshPreset {
  return envPreset() ?? "live";
}

export function readQuoteRefreshPreset(): QuoteRefreshPreset {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && isQuoteRefreshPreset(raw)) return raw;
    } catch {
      /* ignore */
    }
  }
  return defaultQuoteRefreshPreset();
}

export function writeQuoteRefreshPreset(preset: QuoteRefreshPreset): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, preset);
    window.dispatchEvent(new CustomEvent("quote-refresh-preset", { detail: preset }));
  } catch {
    /* ignore */
  }
}

/** UI·폴링에 쓰는 실제 프리셋 (Yahoo 제한 시 eco) */
export function effectiveQuoteRefreshPreset(explicit?: QuoteRefreshPreset): QuoteRefreshPreset {
  if (explicit) return explicit;
  if (autoYahooThrottle) return "eco";
  return readQuoteRefreshPreset();
}

export function refreshScaleForPreset(preset: QuoteRefreshPreset): number {
  return PRESET_META[preset].scale;
}

export function scaleRefreshMs(ms: number | false, preset?: QuoteRefreshPreset): number | false {
  if (ms === false) return false;
  const id = effectiveQuoteRefreshPreset(preset);
  const scale = refreshScaleForPreset(id);
  const floor = PRESET_META[id].minMs;
  return Math.max(floor, Math.round(ms * scale));
}

export function isAutoCacheWarmupEnabled(preset?: QuoteRefreshPreset): boolean {
  return PRESET_META[effectiveQuoteRefreshPreset(preset)].autoWarmup;
}

/** 종목 상세·차트 헤더 — WS 연결 시 가격은 틱, REST는 거래량·메타 동기화 */
export function quoteDetailRefetchMs(wsConnected: boolean, preset?: QuoteRefreshPreset): number {
  const base = wsConnected ? 2_000 : 3_000;
  return scaleRefreshMs(base, preset) as number;
}

/** 차트 패널 보조 시세(지수·메타) */
export function chartAuxQuoteRefetchMs(wsConnected: boolean, preset?: QuoteRefreshPreset): number {
  const base = wsConnected ? 8_000 : 15_000;
  return scaleRefreshMs(base, preset) as number;
}

/** 전역 캐시 상태 폴링 (warmup) */
export function cacheWarmupStatusRefetchMs(preset?: QuoteRefreshPreset): number {
  return scaleRefreshMs(2_500, preset) as number;
}

export function cacheWarmupMinGapMs(needsLive: boolean, preset?: QuoteRefreshPreset): number {
  const base = needsLive ? 1_200 : 5_000;
  return scaleRefreshMs(base, preset) as number;
}

export function cacheStaleThresholdSec(preset?: QuoteRefreshPreset): number {
  const id = effectiveQuoteRefreshPreset(preset);
  const scale = refreshScaleForPreset(id);
  const base = id === "live" ? 6 : 10;
  return Math.max(4, Math.round(base * scale));
}
