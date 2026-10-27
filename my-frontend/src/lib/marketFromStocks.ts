import type { KoreaStock, USStock, MarketIndexQuote } from "@/types/stock";
import type { MarketRow, TickerItem } from "@/data/mockData";
import { mockTickerData } from "@/data/mockData";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import { normalizeQuoteStatus } from "@/lib/format";
import { mergeIndexStripWithWs, sortIndexStripItems } from "@/lib/indexStrip";

function directionFromChange(change: number): "up" | "down" | "flat" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}

export function mapKoreaStockToMarketRow(stock: KoreaStock): MarketRow {
  return {
    id: `kr-${stock.symbol}`,
    name: stock.name,
    symbol: stock.symbol,
    market: stock.market,
    price: stock.price,
    change: stock.change,
    changeRate: stock.changePercent,
    high: stock.high,
    low: stock.low,
    volume: formatVolume(stock.volume),
    direction: directionFromChange(stock.change),
    status: "live",
    updatedAt: "—",
  };
}

export function mapUSStockToMarketRow(stock: USStock): MarketRow {
  return {
    id: `us-${stock.symbol}`,
    name: stock.name,
    symbol: stock.symbol,
    market: stock.exchange,
    price: stock.price,
    change: stock.change,
    changeRate: stock.changePercent,
    high: stock.high,
    low: stock.low,
    volume: formatVolume(stock.volume),
    direction: directionFromChange(stock.change),
    status: "live",
    updatedAt: "—",
  };
}

export function mapToTicker(item: {
  id: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  direction: "up" | "down" | "flat";
  status: "live" | "delayed";
}): TickerItem {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    change: item.change,
    changeRate: item.changeRate,
    direction: item.direction,
    status: item.status,
  };
}

export function mapApiIndexToTicker(idx: {
  id: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  status?: string;
}): TickerItem {
  return {
    id: idx.id,
    name: idx.name,
    price: idx.price,
    change: idx.change,
    changeRate: idx.changePercent,
    direction: directionFromChange(idx.change),
    status: normalizeQuoteStatus(idx.status),
  };
}

const KOREA_INDEX_IDS = ["kospi", "kosdaq", "usd-krw"] as const;
const US_INDEX_IDS = ["nasdaq", "sp500", "dow", "us-tech100"] as const;

function indexStripFromSeeds(ids: readonly string[]): TickerItem[] {
  return ids.map((id) => {
    const q = seedHubIndexQuote(id);
    return mapApiIndexToTicker({
      id: q.id,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      status: q.status,
    });
  });
}

export function filterIndexTickers(
  indices: { id: string; name: string; price: number; change: number; changePercent: number; status?: string }[],
  market: "korea" | "us"
): TickerItem[] {
  const ids = market === "korea" ? KOREA_INDEX_IDS : US_INDEX_IDS;
  return indices.filter((i) => (ids as readonly string[]).includes(i.id)).map(mapApiIndexToTicker);
}

/** 레거시: 종목 행 기반 티커 (지수 API 실패 시 mock) */
export function buildIndexTickers(rows: MarketRow[]): TickerItem[] {
  void rows;
  return mockTickerData.map((t) => ({ ...t }));
}

export function koreaIndexStrip(): TickerItem[] {
  return indexStripFromSeeds(KOREA_INDEX_IDS);
}

export function usIndexStrip(): TickerItem[] {
  return indexStripFromSeeds(US_INDEX_IDS);
}

/** 보드 상단 지수 스트립 — API 대기 중에도 참고 시세 표시 */
export function buildBoardIndexStripItems(
  market: "korea" | "us",
  apiItems: TickerItem[] | undefined,
  wsIndices: MarketIndexQuote[],
  streamConnected = false
): TickerItem[] {
  const fallback = market === "korea" ? koreaIndexStrip() : usIndexStrip();
  const base = apiItems?.length ? sortIndexStripItems(apiItems) : fallback;
  const merged = mergeIndexStripWithWs(base, wsIndices, streamConnected);
  return merged.length > 0 ? merged : fallback;
}

export { KOREA_INDEX_IDS, US_INDEX_IDS };
