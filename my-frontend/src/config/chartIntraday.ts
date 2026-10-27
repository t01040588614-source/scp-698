export const INTRADAY_INTERVALS = [
  { id: "1m", label: "1" },
  { id: "2m", label: "2" },
  { id: "5m", label: "5" },
  { id: "15m", label: "15" },
  { id: "30m", label: "30" },
  { id: "1h", label: "1시간" },
  { id: "1d", label: "1일" },
] as const;

export type IntradayIntervalId = (typeof INTRADAY_INTERVALS)[number]["id"];

export function isIntradayIntervalId(value: string): value is IntradayIntervalId {
  return INTRADAY_INTERVALS.some((r) => r.id === value);
}

/**
 * 차트 history API interval — UI는 1시간봉이어도 1일 장중 축을 1~59분 단위로 보이게 1분봉 요청.
 */
export function resolveChartHistoryInterval(
  period: string,
  intraday: IntradayIntervalId | undefined,
): string | undefined {
  if (period !== "1d" && period !== "1w") return undefined;
  if (!intraday) return undefined;
  if (period === "1d" && intraday === "1h") return "1m";
  return intraday;
}

const API_INTERVAL_KO: Record<string, string> = {
  "1m": "1분",
  "2m": "2분",
  "5m": "5분",
  "15m": "15분",
  "30m": "30분",
  "1h": "1시간",
  "1d": "일",
};

/** API interval (1m, 5m…) → 차트 범례용 한글 */
export function apiIntervalLabelKo(interval?: string): string | null {
  if (!interval?.trim()) return null;
  return API_INTERVAL_KO[interval] ?? interval;
}

/** MarketLens / Investing 차트 제목 — "NASDAQ, 1분" 또는 "6달" */
export function chartLegendIntervalLabel(
  activePeriod: string,
  opts?: { dataInterval?: string; intradayInterval?: IntradayIntervalId },
): string {
  const periodKo: Record<string, string> = {
    "1d": "1일",
    "1w": "7일",
    "1m": "1달",
    "3m": "3달",
    "5mo": "5달",
    "6m": "6달",
    "1y": "1년",
    "5y": "5년",
    max: "전체",
  };
  if (activePeriod !== "1d") {
    return periodKo[activePeriod] ?? activePeriod;
  }
  const fromApi = apiIntervalLabelKo(opts?.dataInterval);
  if (fromApi) return fromApi;
  if (opts?.intradayInterval) {
    return investingStreamIntervalLabel(opts.intradayInterval, activePeriod);
  }
  return periodKo["1d"];
}

/** Investing.com 스트림 차트 범례 — "종목명, 5분, (NASDAQ)" */
export function investingStreamIntervalLabel(
  intradayInterval: IntradayIntervalId,
  activePeriod: string,
): string {
  if (activePeriod === "1m" && intradayInterval === "1d") return "일";
  if (intradayInterval === "1d") {
    if (activePeriod === "1d" || activePeriod === "1w") return "일";
    return "1일";
  }
  const minutes: Record<IntradayIntervalId, string> = {
    "1m": "1분",
    "2m": "2분",
    "5m": "5분",
    "15m": "15분",
    "30m": "30분",
    "1h": "1시간",
    "1d": "일",
  };
  return minutes[intradayInterval] ?? intradayInterval;
}

export function investingStreamVenueTag(market: "korea" | "us", venueLabel?: string): string {
  if (venueLabel?.trim()) return venueLabel.trim();
  return market === "korea" ? "KOSPI" : "NASDAQ";
}
