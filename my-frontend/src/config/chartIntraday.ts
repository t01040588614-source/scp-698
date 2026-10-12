export const INTRADAY_INTERVALS = [
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

/** Investing.com 스트림 차트 범례 — "종목명, 60, (NASDAQ)" */
export function investingStreamIntervalLabel(
  intradayInterval: IntradayIntervalId,
  activePeriod: string,
): string {
  if (activePeriod === "1m" && intradayInterval === "1d") return "달";
  if (intradayInterval === "1d") {
    if (activePeriod === "1d" || activePeriod === "1w") return "일";
    return "1일";
  }
  const minutes: Record<IntradayIntervalId, string> = {
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "1d": "일",
  };
  return minutes[intradayInterval] ?? intradayInterval;
}

export function investingStreamVenueTag(market: "korea" | "us", venueLabel?: string): string {
  if (venueLabel?.trim()) return venueLabel.trim();
  return market === "korea" ? "KOSPI" : "NASDAQ";
}
