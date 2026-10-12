/** Investing.com 스타일 차트 허브 — 8개 기간 (+ 하단 수익률) */
export const CHART_HUB_PERIODS = [
  { id: "1d", label: "1일" },
  { id: "1w", label: "1주" },
  { id: "1m", label: "1달" },
  { id: "3m", label: "3달" },
  { id: "6m", label: "6달" },
  { id: "1y", label: "1년" },
  { id: "5y", label: "5년" },
  { id: "max", label: "최대" },
] as const;

/** 사이드바 등 좁은 영역 — 6개 */
export const SIDEBAR_CHART_PERIODS = CHART_HUB_PERIODS.filter((p) => p.id !== "3m" && p.id !== "5y");

/** @deprecated CHART_HUB_PERIODS 또는 SIDEBAR_CHART_PERIODS 사용 */
export const REALTIME_CHART_PERIODS = SIDEBAR_CHART_PERIODS;

export type ChartHubPeriodId = (typeof CHART_HUB_PERIODS)[number]["id"];
export type ChartPeriodId = ChartHubPeriodId;

export type SidebarChartPeriod = (typeof SIDEBAR_CHART_PERIODS)[number]["id"];

export const DEFAULT_CHART_PERIOD: ChartHubPeriodId = "6m";

const HUB_ID_SET = new Set<string>(CHART_HUB_PERIODS.map((p) => p.id));

export function isChartPeriodId(value: string): value is ChartHubPeriodId {
  return HUB_ID_SET.has(value);
}

export function normalizeChartPeriod(value: string): ChartHubPeriodId {
  if (isChartPeriodId(value)) return value;
  return DEFAULT_CHART_PERIOD;
}

export function chartPeriodLabel(id: ChartHubPeriodId | string): string {
  const row = CHART_HUB_PERIODS.find((p) => p.id === id);
  return row?.label ?? String(id);
}

/** WebSocket 연결 시 history REST 재조회 간격(ms) */
export function chartHistoryRefetchMs(period: ChartHubPeriodId, live: boolean): number | false {
  if (!live) return false;
  switch (period) {
    case "1d":
      return 15_000;
    case "1w":
      return 120_000;
    case "1m":
      return 180_000;
    case "3m":
      return 240_000;
    case "6m":
      return 300_000;
    case "1y":
      return 600_000;
    case "5y":
      return 900_000;
    case "max":
      return 900_000;
    default:
      return 120_000;
  }
}
