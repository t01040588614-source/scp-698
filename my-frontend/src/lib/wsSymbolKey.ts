import { normalizeKoreaCode } from "@/lib/stockLogoUrl";
import type { LiveStockTick } from "@/lib/wsNormalize";

/** WS·캐시 조회용 심볼 키 (한국 종목 6자리 통일) */
export function wsSymbolKey(symbol: string): string {
  const trimmed = symbol.trim();
  return normalizeKoreaCode(trimmed) ?? trimmed;
}

export function wsLookupKeys(symbol: string): string[] {
  const trimmed = symbol.trim();
  const key = wsSymbolKey(trimmed);
  if (key !== trimmed) return [key, trimmed];
  return [key];
}

export function pickWsQuote(
  symbol: string,
  quotes: Record<string, number>
): number | undefined {
  for (const k of wsLookupKeys(symbol)) {
    const q = quotes[k];
    if (q !== undefined && Number.isFinite(q)) return q;
  }
  return undefined;
}

export function pickWsTick(
  symbol: string,
  ticks: Record<string, LiveStockTick>
): LiveStockTick | undefined {
  for (const k of wsLookupKeys(symbol)) {
    const t = ticks[k];
    if (t) return t;
  }
  return undefined;
}

/** 수신 틱·시세를 조회 가능한 모든 키에 기록 */
export function indexWsQuoteMaps(
  symbol: string,
  price: number,
  tick: LiveStockTick,
  ticks: Record<string, LiveStockTick>,
  quotes: Record<string, number>
) {
  for (const k of wsLookupKeys(symbol)) {
    quotes[k] = price;
    ticks[k] = { ...tick, symbol: tick.symbol || symbol };
  }
}
