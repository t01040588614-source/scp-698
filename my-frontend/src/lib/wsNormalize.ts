import type { MarketIndexQuote } from "@/types/stock";

export type LiveStockTick = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

export function normalizeWsIndex(raw: Record<string, unknown>): MarketIndexQuote {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.id ?? ""),
    country: String(raw.country ?? ""),
    category: raw.category ? String(raw.category) : undefined,
    price: Number(raw.price ?? 0),
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? raw.change_percent ?? 0),
    status: raw.status === "closed" ? "closed" : "live",
  };
}

/** WS all_stocks / REST row → tick */
export function stockRowToTick(raw: Record<string, unknown>): LiveStockTick | null {
  const symbol = String(raw.symbol ?? "");
  if (!symbol) return null;
  const price = Number(raw.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    symbol,
    price,
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? raw.change_percent ?? 0),
    volume: Number(raw.volume ?? 0),
  };
}

export function mergeTicksIntoMaps(
  rows: Record<string, unknown>[],
  ticks: Record<string, LiveStockTick>,
  quotes: Record<string, number>
) {
  for (const raw of rows) {
    const tick = stockRowToTick(raw);
    if (!tick) continue;
    ticks[tick.symbol] = tick;
    quotes[tick.symbol] = tick.price;
  }
}

export function normalizeWsTick(raw: Record<string, unknown>): LiveStockTick | null {
  const symbol = String(raw.symbol ?? "");
  if (!symbol) return null;
  return {
    symbol,
    price: Number(raw.price ?? 0),
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? raw.change_percent ?? 0),
    volume: Number(raw.volume ?? 0),
  };
}
