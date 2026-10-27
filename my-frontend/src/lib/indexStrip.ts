import type { TickerItem } from "@/data/mockData";
import type { MarketIndexQuote } from "@/types/stock";
import { normalizeQuoteStatus } from "@/lib/format";

function wsIndexToTicker(idx: MarketIndexQuote): TickerItem {
  const change = idx.change;
  return {
    id: idx.id,
    name: idx.name,
    price: idx.price,
    change,
    changeRate: idx.changePercent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    status: normalizeQuoteStatus(idx.status),
  };
}

/** 상단 지수 스트립·티커 표시 순서 */
export const INDEX_STRIP_DISPLAY_ORDER: readonly string[] = [
  "kospi",
  "kospi200",
  "kosdaq",
  "nasdaq",
  "us-tech100",
  "sp500",
  "dow",
  "dax",
  "nikkei",
  "usd-krw",
  "usd-index",
  "eur-krw",
  "jpy-krw",
  "gold",
  "oil",
];

export function indexMarketsHref(indexId: string): string {
  return `/markets/indices/${encodeURIComponent(indexId)}`;
}

/** 지수 Investing 스트림 차트 — market·거래소 라벨 */
export function indexChartStreamMeta(
  indexId: string,
  opts?: { category?: string; country?: string }
): { market: "korea" | "us"; venueLabel: string } {
  const category = opts?.category;
  const country = opts?.country;
  if (category === "forex") return { market: "korea", venueLabel: "FX" };
  if (category === "commodity") return { market: "korea", venueLabel: "원자재" };
  if (country === "KR" || indexId === "kospi" || indexId === "kospi200" || indexId === "kosdaq") {
    return { market: "korea", venueLabel: "서울" };
  }
  if (country === "JP" || indexId === "nikkei") return { market: "us", venueLabel: "도쿄" };
  if (country === "DE" || indexId === "dax") return { market: "us", venueLabel: "Frankfurt" };
  return { market: "us", venueLabel: "NASDAQ" };
}

function orderRank(id: string): number {
  const i = INDEX_STRIP_DISPLAY_ORDER.indexOf(id);
  return i >= 0 ? i : 999;
}

export function sortIndexStripItems(items: TickerItem[]): TickerItem[] {
  return [...items].sort((a, b) => {
    const d = orderRank(a.id) - orderRank(b.id);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "ko");
  });
}

function dedupeById(items: TickerItem[]): TickerItem[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/** REST·캐시 시세 + WebSocket 지수 틱 병합 (id별 최신 WS 우선) */
export function mergeIndexStripWithWs(
  base: TickerItem[],
  wsIndices: MarketIndexQuote[],
  streamConnected: boolean
): TickerItem[] {
  const wsById = new Map(wsIndices.map((i) => [i.id, wsIndexToTicker(i)]));
  const baseIds = new Set(base.map((t) => t.id));

  const merged: TickerItem[] = base.map((t) => {
    const live = wsById.get(t.id);
    if (!live) return t;
    return {
      ...live,
      status: streamConnected || live.status === "live" ? "live" : t.status,
    };
  });

  wsById.forEach((live, id) => {
    if (baseIds.has(id)) return;
    merged.push({
      ...live,
      status: streamConnected || live.status === "live" ? "live" : live.status,
    });
  });

  return sortIndexStripItems(dedupeById(merged));
}
