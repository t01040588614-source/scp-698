import type { MarketIndexQuote } from "@/types/stock";
import { COMMODITY_INDEX_IDS } from "@/lib/indexCatalog";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";

export type MarketRegionId = "overview" | "korea" | "asia" | "us" | "europe";

export type MarketsContentTabId = "overview" | "indices" | "stocks" | "forex" | "commodities";

export const MARKET_REGION_NAV: { id: MarketRegionId; label: string; hint?: string }[] = [
  { id: "overview", label: "전체 시장", hint: "4개 권역" },
  { id: "korea", label: "한국", hint: "KOSPI·KOSDAQ" },
  { id: "asia", label: "아시아", hint: "니케이 등" },
  { id: "us", label: "미국", hint: "NASDAQ·S&P" },
  { id: "europe", label: "유럽", hint: "DAX 등" },
];

export function regionFilterLabel(region: MarketRegionId): string {
  return MARKET_REGION_NAV.find((r) => r.id === region)?.label ?? "전체 시장";
}

export function regionFilterBlurb(region: MarketRegionId): string {
  switch (region) {
    case "korea":
      return "한국 지수와 국내 종목만 표시합니다.";
    case "asia":
      return "아시아 지수·종목만 표시합니다.";
    case "us":
      return "미국 지수·종목만 표시합니다.";
    case "europe":
      return "유럽 지수·종목만 표시합니다.";
    default:
      return "모든 지역의 지수·종목을 함께 봅니다.";
  }
}

export const MARKETS_CONTENT_TABS: { id: MarketsContentTabId; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "indices", label: "지수" },
  { id: "stocks", label: "종목" },
  { id: "forex", label: "외환" },
  { id: "commodities", label: "원자재" },
];

const REGION_INDEX_IDS: Record<MarketRegionId, string[]> = {
  overview: [
    "kospi",
    "kospi200",
    "kosdaq",
    "nikkei",
    "nasdaq",
    "sp500",
    "dow",
    "dax",
    "usd-krw",
    "gold",
  ],
  korea: ["kospi", "kospi200", "kosdaq", "usd-krw", "eur-krw", "jpy-krw"],
  asia: ["nikkei", "usd-krw", "jpy-krw", "gold"],
  us: ["nasdaq", "sp500", "dow", "us-tech100", "usd-index", "oil"],
  europe: ["dax", "usd-index", "eur-krw", "oil", "copper"],
};

export function regionalIndexIds(region: MarketRegionId): string[] {
  return REGION_INDEX_IDS[region];
}

export function filterIndicesByRegion(
  all: MarketIndexQuote[],
  region: MarketRegionId,
  fillMissing = true
): MarketIndexQuote[] {
  const ordered = regionalIndexIds(region);
  const map = new Map(all.map((r) => [r.id, r]));
  return ordered.map((id) => {
    const row = map.get(id);
    if (row) return row;
    return fillMissing ? seedHubIndexQuote(id) : undefined;
  }).filter(Boolean) as MarketIndexQuote[];
}

/** /markets 원자재 탭 — 지역 필터와 무관하게 전체 원자재 목록 */
export function commodityIndexRows(all: MarketIndexQuote[]): MarketIndexQuote[] {
  const map = new Map(all.map((r) => [r.id, r]));
  return COMMODITY_INDEX_IDS.map((id) => map.get(id) ?? seedHubIndexQuote(id));
}

export function filterIndicesByTab(
  rows: MarketIndexQuote[],
  tab: MarketsContentTabId
): MarketIndexQuote[] {
  if (tab === "forex") return rows.filter((r) => r.category === "forex");
  if (tab === "commodities") return rows.filter((r) => r.category === "commodity");
  if (tab === "indices" || tab === "overview") {
    return rows.filter((r) => !r.category || r.category === "indices");
  }
  return rows;
}

export type MarketBreadth = {
  advance: number;
  decline: number;
  unchanged: number;
  advancePct: number;
  declinePct: number;
  unchangedPct: number;
};

export function computeBreadth(changes: number[]): MarketBreadth {
  let advance = 0;
  let decline = 0;
  let unchanged = 0;
  for (const c of changes) {
    if (c > 0.02) advance += 1;
    else if (c < -0.02) decline += 1;
    else unchanged += 1;
  }
  const total = changes.length || 1;
  return {
    advance,
    decline,
    unchanged,
    advancePct: advance / total,
    declinePct: decline / total,
    unchangedPct: unchanged / total,
  };
}

export function regionTableTitle(region: MarketRegionId): string {
  switch (region) {
    case "korea":
      return "한국 지수";
    case "asia":
      return "아시아 지수";
    case "us":
      return "미국 지수";
    case "europe":
      return "유럽 지수";
    default:
      return "주요 글로벌 지수";
  }
}

export function countryFlag(country: string): string {
  switch (country) {
    case "KR":
      return "🇰🇷";
    case "US":
      return "🇺🇸";
    case "JP":
      return "🇯🇵";
    case "DE":
      return "🇩🇪";
    case "FX":
      return "💱";
    case "CM":
      return "🥇";
    default:
      return "🌐";
  }
}

/** 시장 허브 종목 섹션 — 지역별 표시 여부 */
export type HubStockRegion = "korea" | "us" | "asia" | "europe";

export function hubStockRegionsForMarket(region: MarketRegionId): HubStockRegion[] {
  switch (region) {
    case "korea":
      return ["korea"];
    case "asia":
      return ["asia"];
    case "us":
      return ["us"];
    case "europe":
      return ["europe"];
    default:
      return ["korea", "us", "asia", "europe"];
  }
}

export const HUB_STOCK_SECTION_TITLES: Record<HubStockRegion, string> = {
  korea: "한국 주식 · 전 종목",
  us: "미국 주식 · 전 종목",
  asia: "아시아 주식 · 전 종목",
  europe: "유럽 주식 · 전 종목",
};
