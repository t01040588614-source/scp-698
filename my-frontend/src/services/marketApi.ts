import { mockMarketOverview, mockTickerData } from "@/data/mockData";
import { stockApi } from "@/lib/api";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import {
  buildIndexTickers,
  filterIndexTickers,
  koreaIndexStrip,
  mapApiIndexToTicker,
  usIndexStrip,
} from "@/lib/marketFromStocks";
import { mapKoreaStockToMarketRow, mapUSStockToMarketRow } from "@/lib/marketFromStocks";
import type { MarketRow } from "@/data/mockData";
import type { MarketIndexQuote } from "@/types/stock";

/** API·WS 실패 시에도 UI에 쓸 참고 지수 목록 */
export function seedMarketIndexCatalog(): MarketIndexQuote[] {
  return ALL_WS_INDEX_IDS.map((id) => seedHubIndexQuote(id));
}

export type MarketIndicesFetchResult = {
  rows: MarketIndexQuote[];
  live: boolean;
};

export async function fetchMarketIndicesResilient(
  ids?: string,
  category?: string
): Promise<MarketIndicesFetchResult> {
  try {
    const res = await stockApi.getMarketIndices(ids, category);
    const rows = res.data ?? [];
    if (rows.length > 0) return { rows, live: true };
  } catch {
    /* 참고 시세로 대체 */
  }

  let seeds = seedMarketIndexCatalog();
  if (ids) {
    const allowed = new Set(
      ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    seeds = seeds.filter((r) => allowed.has(r.id));
  }
  if (category) {
    seeds = seeds.filter((r) => r.category === category);
  }
  const rows = seeds.length > 0 ? seeds : seedMarketIndexCatalog();
  return { rows, live: false };
}

async function fetchLiveMarketRows(): Promise<MarketRow[]> {
  const [koreaRes, usRes] = await Promise.all([
    stockApi.getKoreaStocks(),
    stockApi.getUSStocks(),
  ]);
  const korea = (koreaRes.data || []).map(mapKoreaStockToMarketRow);
  const us = (usRes.data || []).map(mapUSStockToMarketRow);
  return [...korea, ...us];
}

export async function getMarketOverview(params: Record<string, unknown> = {}) {
  try {
    const rows = await fetchLiveMarketRows();
    if (rows.length === 0) throw new Error("empty");

    const tab = String(params.tab || "indices");
    let data = rows;
    if (tab === "stocks") {
      data = rows.filter((r) => r.market === "KOSPI" || r.market === "KOSDAQ" || r.symbol.length <= 6);
    } else if (tab === "forex") {
      data = rows.filter((r) => r.name.includes("USD") || r.symbol.includes("USD"));
    } else if (tab === "indices") {
      data = rows.slice(0, 8);
    }

    return {
      data,
      updatedAt: new Date().toISOString(),
      status: "live" as const,
      params,
    };
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      data: mockMarketOverview,
      updatedAt: new Date().toISOString(),
      status: "mock" as const,
      params,
    };
  }
}

export async function getMarketTicker(params: Record<string, unknown> = {}) {
  try {
    const res = await stockApi.getMarketIndices();
    const indices = res.data || [];
    if (indices.length === 0) throw new Error("empty");
    const data = indices.map(mapApiIndexToTicker);
    return {
      data,
      updatedAt: new Date().toISOString(),
      status: "live" as const,
      params,
    };
  } catch {
    try {
      const rows = await fetchLiveMarketRows();
      if (rows.length === 0) throw new Error("empty");
      const data = buildIndexTickers(rows);
      return {
        data,
        updatedAt: new Date().toISOString(),
        status: "live" as const,
        params,
      };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        data: mockTickerData,
        updatedAt: new Date().toISOString(),
        status: "mock" as const,
        params,
      };
    }
  }
}

export async function getMarketIndicesForBoard(market: "korea" | "us") {
  const ids =
    market === "korea" ? "kospi,kosdaq,usd-krw" : "nasdaq,sp500,dow,us-tech100";
  try {
    const res = await stockApi.getMarketIndices(ids);
    const items = filterIndexTickers(res.data || [], market);
    if (items.length === 0) throw new Error("empty");
    return { data: items, status: "live" as const };
  } catch {
    return {
      data: market === "korea" ? koreaIndexStrip() : usIndexStrip(),
      status: "mock" as const,
    };
  }
}

