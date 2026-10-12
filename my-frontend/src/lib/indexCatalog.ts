export type SidebarIndexTabId = "forex" | "indices" | "commodity" | "equity";

export type SidebarIndexTab = {
  id: SidebarIndexTabId;
  label: string;
  category?: string;
  /** category API 대신 고정 id 목록 */
  ids?: string[];
};

export const SIDEBAR_INDEX_TABS: SidebarIndexTab[] = [
  { id: "forex", label: "외환", category: "forex" },
  { id: "indices", label: "지수", category: "indices" },
  { id: "commodity", label: "원자재", category: "commodity" },
  {
    id: "equity",
    label: "주식",
    ids: ["kospi", "kospi200", "kosdaq", "sp500", "us-tech100", "dax", "nikkei"],
  },
];

export {
  SIDEBAR_CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  normalizeChartPeriod,
  chartHistoryRefetchMs,
  type SidebarChartPeriod,
} from "@/config/chartPeriods";

/** 보드 market에 따른 기본 선택 지수 */
export function defaultIndexIdForMarket(market: "korea" | "us"): string {
  return market === "us" ? "sp500" : "kospi";
}

const CATEGORY_INDEX_IDS: Record<string, string[]> = {
  forex: ["usd-krw", "usd-index", "eur-krw", "jpy-krw"],
  indices: [
    "kospi",
    "kospi200",
    "kosdaq",
    "sp500",
    "us-tech100",
    "nasdaq",
    "dow",
    "dax",
    "nikkei",
  ],
  commodity: [
    "gold",
    "silver",
    "platinum",
    "oil",
    "brent",
    "natural-gas",
    "copper",
    "wheat",
    "corn",
    "soybeans",
    "sugar",
    "cotton",
  ],
};

export const COMMODITY_INDEX_IDS: string[] = [...CATEGORY_INDEX_IDS.commodity];

export function indexIdsForTab(tab: SidebarIndexTab): string[] {
  if (tab.ids?.length) return [...tab.ids];
  if (tab.category && CATEGORY_INDEX_IDS[tab.category]) {
    return [...CATEGORY_INDEX_IDS[tab.category]];
  }
  return [];
}

/** WebSocket 구독용 전체 지수 id (중복 제거) */
export const ALL_WS_INDEX_IDS: string[] = Array.from(
  new Set([
    ...Object.values(CATEGORY_INDEX_IDS).flat(),
    ...SIDEBAR_INDEX_TABS.flatMap((t) => t.ids ?? []),
  ])
);
