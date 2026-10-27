import type { OhlcPoint } from "@/services/chartApi";
import { resolveChartHistoryInterval, type IntradayIntervalId } from "@/config/chartIntraday";
import type { SidebarChartPeriod } from "@/lib/indexCatalog";

/** API가 `_pad_calendar_days` 로 내려준 "1일" … "N일" 시계열 */
export function hasOrdinalDayTimeLabels(points: OhlcPoint[]): boolean {
  if (points.length === 0) return false;
  return points.every((p, i) => p.time === `${i + 1}일`);
}

/** 1주·1달 캘린더 패딩(휴장일) — flat 봉 */
export function isCalendarPaddingBar(p: OhlcPoint): boolean {
  if ((p.volume ?? 0) !== 0) return false;
  return p.open === p.high && p.high === p.low && p.low === p.close;
}

export function isIntradayDataInterval(interval?: string): boolean {
  if (!interval?.trim()) return false;
  if (interval === "1d" || interval === "1wk" || interval === "1mo") return false;
  return /m$/.test(interval) || interval.endsWith("h");
}

/** 1주·1달은 항상 일봉 축 (이전 1d 분봉 interval 잔여값 무시) */
export function chartDataIntervalForPeriod(period: string, dataInterval?: string): string | undefined {
  if (period === "1w" || period === "1m") return "1d";
  return dataInterval;
}

/** 지수 history — 백엔드는 period=1d 일 때만 interval 쿼리 반영 */
export function indexHistoryInterval(
  period: SidebarChartPeriod,
  intraday: IntradayIntervalId
): string | undefined {
  return resolveChartHistoryInterval(period, intraday);
}

/** @deprecated normalizeCalendarPeriodPoints 사용 */
export function shouldPadPointsToCalendarDays(
  period: string,
  dataInterval: string | undefined,
  points: OhlcPoint[]
): boolean {
  const iv = chartDataIntervalForPeriod(period, dataInterval);
  if (isIntradayDataInterval(iv)) return false;
  const n = period === "1w" ? 7 : period === "1m" ? 31 : 0;
  if (!n) return false;
  if (hasOrdinalDayTimeLabels(points) && points.length === n) return false;
  return points.length >= 1;
}

export function shouldUseOrdinalWeekMonthChart(
  period: string | undefined,
  dataInterval: string | undefined,
  points: OhlcPoint[]
): boolean {
  if (period !== "1w" && period !== "1m") return false;
  const iv = chartDataIntervalForPeriod(period, dataInterval);
  if (isIntradayDataInterval(iv)) return false;
  return points.length >= 2;
}

export function priceDecimalsForIndex(indexId: string, price: number): number {
  if (indexId.includes("krw") || indexId.includes("jpy")) return 2;
  if (price >= 10_000) return 0;
  if (price >= 100) return 2;
  return 4;
}
