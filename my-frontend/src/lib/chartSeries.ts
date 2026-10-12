import type { OhlcPoint } from "@/services/chartApi";

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

export function normalizeOhlcPoint(raw: Record<string, unknown>): OhlcPoint {
  const close = Number(raw.close ?? raw.value ?? 0);
  const open = Number(raw.open ?? close);
  const high = Number(raw.high ?? Math.max(open, close));
  const low = Number(raw.low ?? Math.min(open, close));
  return {
    time: String(raw.time),
    timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
    open,
    high,
    low,
    close,
    volume: Number(raw.volume ?? 0),
    value: close,
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
function parsePointDate(p: OhlcPoint): Date | null {
  if (p.timestamp) {
    const ms = Date.parse(p.timestamp);
    if (Number.isFinite(ms)) return new Date(ms);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(p.time)) {
    const ms = Date.parse(p.time.slice(0, 10));
    if (Number.isFinite(ms)) return new Date(ms);
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

  const byDate = new Map<string, OhlcPoint>();
  const sorted: { d: Date; p: OhlcPoint }[] = [];
  for (const p of points) {
    const dt = parsePointDate(p);
    if (!dt) continue;
    const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    sorted.push({ d, p });
    byDate.set(calendarDateKey(d), p);
  }
  sorted.sort((a, b) => a.d.getTime() - b.d.getTime());

  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));

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

export function syncLastPointToLivePrice(
  points: OhlcPoint[],
  liveClose: number,
): OhlcPoint[] {
  if (points.length < 2 || !Number.isFinite(liveClose) || liveClose <= 0) {
    return points;
  }
  const last = points[points.length - 1];
  return [
    ...points.slice(0, -1),
    {
      ...last,
      close: liveClose,
      high: Math.max(last.high, liveClose),
      low: Math.min(last.low, liveClose),
      value: liveClose,
    },
  ];
}

/** 기간 OHLC 헤더 — 종가만 현재가(실시간)로 덮어씀 */
export function liveOhlcForPeriod(
  points: OhlcPoint[],
  liveClose: number,
): { open: number; high: number; low: number; close: number } | undefined {
  if (!points.length || !Number.isFinite(liveClose) || liveClose <= 0) {
    return undefined;
  }
  const summary = summarizeFromPoints(points);
  return {
    open: summary.open,
    high: Math.max(summary.high, liveClose),
    low: Math.min(summary.low, liveClose),
    close: liveClose,
  };
}

export function formatVolumeShort(value: number): string {
  if (!value || value <= 0) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(value);
}
