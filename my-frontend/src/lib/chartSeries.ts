import type { OhlcPoint } from "@/services/chartApi";
import {
  chartDataIntervalForPeriod,
  isIntradayDataInterval,
} from "@/lib/indexChartUtils";

export type EnrichedOhlcPoint = OhlcPoint & {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  changeFromPrev: number | null;
  changePercentFromPrev: number | null;
};

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function movingAverage(closes: number[], index: number, window: number): number | null {
  if (index + 1 < window) return null;
  return average(closes.slice(index - window + 1, index + 1));
}

/** OHLC — high/low가 시·종을 포함하도록 보정 */
export function sanitizeOhlcValues(o: {
  open: number;
  high: number;
  low: number;
  close: number;
}): { open: number; high: number; low: number; close: number } {
  let { open, high, low, close } = o;
  if (!Number.isFinite(open)) open = close;
  if (!Number.isFinite(close)) close = open;
  if (!Number.isFinite(high)) high = Math.max(open, close);
  if (!Number.isFinite(low)) low = Math.min(open, close);
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  high = Math.max(high, bodyHigh);
  low = Math.min(low, bodyLow);
  if (low > high) {
    const mid = (low + high) / 2;
    low = mid;
    high = mid;
  }
  return { open, high, low, close };
}

export function normalizeOhlcPoint(raw: Record<string, unknown>): OhlcPoint {
  const close = Number(raw.close ?? raw.value ?? 0);
  const open = Number(raw.open ?? close);
  const high = Number(raw.high ?? Math.max(open, close));
  const low = Number(raw.low ?? Math.min(open, close));
  const ohlc = sanitizeOhlcValues({ open, high, low, close });
  return {
    time: String(raw.time),
    timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
    open: ohlc.open,
    high: ohlc.high,
    low: ohlc.low,
    close: ohlc.close,
    volume: Number(raw.volume ?? 0),
    value: ohlc.close,
  };
}

export function enrichChartSeries(points: OhlcPoint[]): EnrichedOhlcPoint[] {
  const closes = points.map((p) => p.close);
  return points.map((p, i) => {
    const prev = i > 0 ? points[i - 1].close : null;
    const changeFromPrev = prev != null ? p.close - prev : null;
    const changePercentFromPrev =
      prev != null && prev !== 0 ? ((p.close - prev) / prev) * 100 : null;
    return {
      ...p,
      ma5: movingAverage(closes, i, 5),
      ma20: movingAverage(closes, i, 20),
      ma60: movingAverage(closes, i, 60),
      changeFromPrev,
      changePercentFromPrev,
    };
  });
}

export function summarizeFromPoints(points: OhlcPoint[]) {
  if (!points.length) {
    return {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      change: 0,
      changePercent: 0,
      totalVolume: 0,
      avgVolume: 0,
      pointsCount: 0,
    };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const high = Math.max(...points.map((p) => p.high));
  const low = Math.min(...points.map((p) => p.low));
  const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);
  const change = last.close - first.open;
  const changePercent = first.open ? (change / first.open) * 100 : 0;
  return {
    open: first.open,
    high,
    low,
    close: last.close,
    change,
    changePercent,
    totalVolume,
    avgVolume: Math.round(totalVolume / points.length),
    pointsCount: points.length,
  };
}

/** 마지막 봉 종가·고저를 WS/캐시 현재가에 맞춤 */
function parsePointDate(p: OhlcPoint, windowStart?: Date): Date | null {
  if (p.timestamp) {
    const ms = Date.parse(p.timestamp);
    if (Number.isFinite(ms)) return new Date(ms);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(p.time)) {
    const ms = Date.parse(p.time.slice(0, 10));
    if (Number.isFinite(ms)) return new Date(ms);
  }
  const mmdd = /^(\d{1,2})\/(\d{1,2})$/.exec(p.time.trim());
  if (mmdd) {
    const now = new Date();
    let year = now.getFullYear();
    const month = Number(mmdd[1]) - 1;
    const day = Number(mmdd[2]);
    const dt = new Date(year, month, day, 12, 0, 0, 0);
    if (dt.getTime() > now.getTime() + 86_400_000) year -= 1;
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  const ord = /^(\d+)일$/.exec(p.time.trim());
  if (ord && windowStart) {
    const idx = Number(ord[1]) - 1;
    if (idx >= 0) {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + idx);
      d.setHours(12, 0, 0, 0);
      return d;
    }
  }
  return null;
}

function calendarDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function flatDayPoint(day: Date, close: number): OhlcPoint {
  const key = calendarDateKey(day);
  const noon = new Date(day);
  noon.setHours(12, 0, 0, 0);
  const px = close > 0 ? close : 0;
  return {
    time: key,
    timestamp: noon.toISOString(),
    open: px,
    high: px,
    low: px,
    close: px,
    volume: 0,
    value: px,
  };
}

/** API가 7·31일 패딩 없이 올 때 — 백엔드와 동일하게 캘린더 N일 고정 */
export function padPointsToCalendarDays(
  points: OhlcPoint[],
  dayCount: number,
): OhlcPoint[] {
  if (dayCount < 1) return points;

  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));

  const byDate = new Map<string, OhlcPoint>();
  const sorted: { d: Date; p: OhlcPoint }[] = [];
  for (const p of points) {
    const dt = parsePointDate(p, start);
    if (!dt) continue;
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    sorted.push({ d, p });
    byDate.set(calendarDateKey(d), p);
  }
  sorted.sort((a, b) => a.d.getTime() - b.d.getTime());

  if (sorted.length === 0 && points.length >= 1) {
    const tail = points.slice(-dayCount);
    const offset = dayCount - tail.length;
    for (let i = 0; i < dayCount; i++) {
      const srcIdx = i - offset;
      if (srcIdx < 0) continue;
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      byDate.set(calendarDateKey(day), tail[srcIdx]);
    }
  }

  let seedClose = 0;
  for (const { d, p } of sorted) {
    if (d < start) seedClose = p.close;
    else break;
  }
  if (seedClose <= 0 && sorted.length) seedClose = sorted[0].p.close;

  let lastClose = seedClose > 0 ? seedClose : sorted.length ? sorted[sorted.length - 1].p.close : 0;

  const out: OhlcPoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = calendarDateKey(day);
    const src = byDate.get(key);
    if (src) {
      lastClose = src.close;
      const noon = new Date(day);
      noon.setHours(12, 0, 0, 0);
      out.push({
        ...src,
        time: `${i + 1}일`,
        timestamp: src.timestamp ?? noon.toISOString(),
      });
    } else {
      out.push({ ...flatDayPoint(day, lastClose), time: `${i + 1}일` });
    }
  }
  return out;
}

/** API·차트 공통 — 1주/1달은 항상 7·31일봉 + interval=1d (한국·미국·지수 전 종목) */
export function historyPointsForChartPeriod(
  points: OhlcPoint[],
  period: string,
  interval?: string,
): { points: OhlcPoint[]; interval: string | undefined } {
  if (period !== "1w" && period !== "1m") {
    return { points, interval };
  }
  const chartInterval = chartDataIntervalForPeriod(period, interval);
  return {
    points: normalizeCalendarPeriodPoints(points, period, chartInterval),
    interval: chartInterval ?? "1d",
  };
}

/** 1주·1달 — 최근 7·31 캘린더 일 고정 + "1일"…"N일" (전 종목 공통) */
export function normalizeCalendarPeriodPoints(
  points: OhlcPoint[],
  period: string,
  dataInterval?: string,
): OhlcPoint[] {
  if (period !== "1w" && period !== "1m") return points;
  const iv = chartDataIntervalForPeriod(period, dataInterval);
  if (isIntradayDataInterval(iv)) return points;
  const dayCount = period === "1w" ? 7 : 31;
  if (points.length < 1) return points;
  return padPointsToCalendarDays(points, dayCount);
}

export function syncLastPointToLivePrice(
  points: OhlcPoint[],
  liveClose: number,
): OhlcPoint[] {
  return patchLastPointWithLiveQuote(points, { price: liveClose });
}

export type LiveChartQuotePatch = {
  price: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
};

export type PatchLastPointOptions = {
  /** 1d·분봉 — REST/WS 당일 시·고·저 (구간 summary 고·저는 사용하지 않음) */
  useSessionHighLow?: boolean;
  /** 분봉 봉 — 거래량은 봉 값 유지 */
  isIntradaySession?: boolean;
};

/** WS·REST — 마지막 봉만 갱신 (다일 차트에 기간 전체 고·저를 섞지 않음) */
export function patchLastPointWithLiveQuote(
  points: OhlcPoint[],
  live: LiveChartQuotePatch,
  options: PatchLastPointOptions = {},
): OhlcPoint[] {
  const { useSessionHighLow = false, isIntradaySession = false } = options;
  const price = live.price;
  if (points.length < 2 || !Number.isFinite(price) || price <= 0) {
    return points;
  }
  const last = points[points.length - 1];
  let high = Math.max(last.high, price);
  let low = Math.min(last.low, price);
  if (useSessionHighLow) {
    if (live.high != null && Number.isFinite(live.high)) {
      high = Math.max(high, live.high, price);
    }
    if (live.low != null && Number.isFinite(live.low)) {
      low = Math.min(low, live.low, price);
    }
  }
  const lastVolume = isIntradaySession
    ? (last.volume ?? 0)
    : Math.max(last.volume ?? 0, live.volume ?? 0);
  const open =
    live.open != null && Number.isFinite(live.open) ? live.open : last.open;
  return [
    ...points.slice(0, -1),
    {
      ...last,
      open,
      close: price,
      high,
      low,
      volume: lastVolume,
      value: price,
    },
  ];
}

/** 차트 범례·마지막 봉 — 선택 구간의 마지막 캔들 OHLC (실시간 종가 반영) */
export function ohlcForChartLegend(
  points: OhlcPoint[],
  liveClose?: number,
): { open: number; high: number; low: number; close: number } | null {
  if (!points.length) return null;
  const last = points[points.length - 1];
  const sanitized = sanitizeOhlcValues({
    open: last.open,
    high: last.high,
    low: last.low,
    close: last.close,
  });
  const open = sanitized.open;
  let { high, low, close } = sanitized;
  if (liveClose != null && Number.isFinite(liveClose) && liveClose > 0) {
    close = liveClose;
    high = Math.max(high, liveClose);
    low = Math.min(low, liveClose);
  }
  return { open, high, low, close };
}

/** WS·캐시 — 마지막 봉만 갱신 (구간 전체 고·저를 봉에 섞지 않음) */
export function liveOhlcForPeriod(
  points: OhlcPoint[],
  liveClose: number,
): { open: number; high: number; low: number; close: number } | undefined {
  if (!points.length || !Number.isFinite(liveClose) || liveClose <= 0) {
    return undefined;
  }
  return ohlcForChartLegend(points, liveClose) ?? undefined;
}

/** 차트 범례 OHLC — 봉 기반 우선, 없으면 당일 시세 스냅샷 */
export function resolveChartLegendOhlc(
  points: OhlcPoint[],
  livePrice: number,
  session?: Pick<LiveChartQuotePatch, "open" | "high" | "low">,
): { open: number; high: number; low: number; close: number } | null {
  const fromBars = liveOhlcForPeriod(points, livePrice);
  if (fromBars) return fromBars;
  if (!Number.isFinite(livePrice) || livePrice <= 0) return null;
  const open =
    session?.open != null && Number.isFinite(session.open)
      ? session.open
      : livePrice;
  const high = Math.max(session?.high ?? livePrice, livePrice);
  const low = Math.min(session?.low ?? livePrice, livePrice);
  return sanitizeOhlcValues({ open, high, low, close: livePrice });
}

export function formatVolumeShort(value: number): string {
  if (!value || value <= 0) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(value);
}
