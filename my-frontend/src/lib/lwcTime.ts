import type { OhlcPoint } from "@/services/chartApi";
import {
  normalizeCalendarPeriodPoints,
  padPointsToCalendarDays,
  sanitizeOhlcValues,
} from "@/lib/chartSeries";
import {
  chartDataIntervalForPeriod,
  isCalendarPaddingBar,
  isIntradayDataInterval,
} from "@/lib/indexChartUtils";

/** lightweight-charts Time (SSR-safe — 타입만 로컬 정의) */
export type LwcTime = string | number;

export type LwcCandle = {
  time: LwcTime;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** lightweight-charts — 휴장·결측 구간(whitespace) */
export type LwcWhitespace = { time: LwcTime };

export type LwcSeriesPoint = LwcCandle | LwcWhitespace;

export function isLwcWhitespace(bar: LwcSeriesPoint): bar is LwcWhitespace {
  return !("close" in bar);
}

const DAILY_CHART_PERIODS = new Set(["1w", "1m", "3m", "6m", "1y", "5y", "max"]);

function isIntradayInterval(interval?: string): boolean {
  if (!interval) return false;
  if (interval === "1d" || interval === "1wk" || interval === "1mo") return false;
  return /m$/.test(interval) || interval.endsWith("h");
}

/** 일봉 time 키 (YYYY-MM-DD) — 브라우저 로컬 달력 기준 (KST 환경과 일치) */
function toCalendarDay(timestamp: string): string | null {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeSortKey(t: LwcTime): number {
  if (typeof t === "number") return t;
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 1주·1달 — LWC time 축: 실제 달력일 대신 86400초 간격 (주말 공백·봉 희소 방지) */
export const ORDINAL_SLOT_BASE_SEC = Math.floor(Date.UTC(2020, 0, 1) / 1000);

export function ordinalSlotTime(slotIndex: number): number {
  return ORDINAL_SLOT_BASE_SEC + slotIndex * 86_400;
}

export function ordinalSlotIndexFromTime(time: unknown): number | null {
  let sec: number | null = null;
  if (typeof time === "number" && Number.isFinite(time)) {
    sec = time;
  } else {
    const ms = Date.parse(String(time));
    if (Number.isFinite(ms)) sec = Math.floor(ms / 1000);
  }
  if (sec == null) return null;
  const idx = Math.round((sec - ORDINAL_SLOT_BASE_SEC) / 86_400);
  if (idx < 0 || idx > 30) return null;
  return idx;
}

function isShortCalendarChartPeriod(period?: string): period is "1w" | "1m" {
  return period === "1w" || period === "1m";
}

function seriesForShortCalendarPeriod(
  points: OhlcPoint[],
  period: "1w" | "1m",
  chartInterval?: string,
): OhlcPoint[] {
  const slotCount = period === "1w" ? 7 : 31;
  let series = normalizeCalendarPeriodPoints(points, period, chartInterval);
  if (series.length !== slotCount) {
    series = padPointsToCalendarDays(series.length ? series : points, slotCount);
  }
  if (series.length > slotCount) series = series.slice(-slotCount);
  return series;
}

export function ohlcPointsToLwcCandles(
  points: OhlcPoint[],
  period?: string,
  dataInterval?: string
): LwcSeriesPoint[] {
  if (!points.length) return [];

  const chartInterval = chartDataIntervalForPeriod(period ?? "", dataInterval);

  if (isShortCalendarChartPeriod(period) && !isIntradayDataInterval(chartInterval)) {
    const slotPoints = seriesForShortCalendarPeriod(points, period, chartInterval);
    return slotPoints.map((p, i) => {
      const time = ordinalSlotTime(i);
      let ohlc = sanitizeOhlcValues({
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      });
      if (isCalendarPaddingBar(p) && ohlc.close > 0) {
        const eps = Math.max(ohlc.close * 0.00012, 0.01);
        ohlc = {
          ...ohlc,
          high: ohlc.close + eps,
          low: Math.max(0.01, ohlc.close - eps),
        };
      }
      return { time, ...ohlc };
    });
  }

  const series = points;

  const intraday = isIntradayInterval(chartInterval ?? dataInterval);
  const useBusinessDay =
    !intraday &&
    (period ? DAILY_CHART_PERIODS.has(period) || chartInterval === "1d" || dataInterval === "1d" : false);
  const baseSec = Math.floor(Date.now() / 1000) - series.length * 86_400;
  const mapped: LwcCandle[] = [];

  for (let i = 0; i < series.length; i++) {
    const p = series[i];
    let time: LwcTime;

    if (p.timestamp) {
      if (useBusinessDay) {
        const day = toCalendarDay(p.timestamp);
        time = day ?? Math.floor(Date.parse(p.timestamp) / 1000);
      } else {
        const ms = Date.parse(p.timestamp);
        time = Number.isFinite(ms) ? Math.floor(ms / 1000) : baseSec + i * 86_400;
      }
    } else if (/^\d{4}-\d{2}-\d{2}/.test(p.time)) {
      time = p.time.slice(0, 10);
    } else if (useBusinessDay) {
      const day = new Date(baseSec * 1000 + i * 86_400 * 1000);
      time = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    } else {
      time = baseSec + i * 86_400;
    }

    mapped.push({
      time,
      ...sanitizeOhlcValues({
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }),
    });
  }

  mapped.sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));

  const byTime = new Map<string, LwcCandle>();
  for (const c of mapped) {
    const key = String(c.time);
    const prev = byTime.get(key);
    if (!prev) {
      byTime.set(key, c);
      continue;
    }
    byTime.set(key, {
      time: c.time,
      ...sanitizeOhlcValues({
        open: prev.open,
        high: Math.max(prev.high, c.high),
        low: Math.min(prev.low, c.low),
        close: c.close,
      }),
    });
  }
  const deduped = Array.from(byTime.values()).sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));

  // 동일 일자·타임스탬프로 뭉개져 봉이 2개 이하일 때 — 순번 기반 일봉 키로 복원
  if (useBusinessDay && series.length >= 8 && deduped.length < Math.min(8, Math.floor(series.length * 0.25))) {
    const baseSec = Math.floor(Date.now() / 1000) - series.length * 86_400;
    return series.map((p, i) => {
      const d = new Date(baseSec * 1000 + i * 86_400 * 1000);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        time: day,
        ...sanitizeOhlcValues({
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
        }),
      };
    });
  }

  return deduped;
}
