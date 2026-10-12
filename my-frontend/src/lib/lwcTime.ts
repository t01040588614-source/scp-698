import type { OhlcPoint } from "@/services/chartApi";

/** lightweight-charts Time (SSR-safe — 타입만 로컬 정의) */
export type LwcTime = string | number;

export type LwcCandle = {
  time: LwcTime;
  open: number;
  high: number;
  low: number;
  close: number;
};

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

/** 최근 N 캘린더 일 YYYY-MM-DD (백엔드 _pad_calendar_days 와 동일 창) */
function recentCalendarDayKeys(count: number): string[] {
  const anchor = new Date();
  anchor.setHours(12, 0, 0, 0);
  const days: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - (count - 1 - i));
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

export function ohlcPointsToLwcCandles(
  points: OhlcPoint[],
  period?: string,
  dataInterval?: string
): LwcCandle[] {
  if (!points.length) return [];

  if (period === "1w" || period === "1m") {
    const slotCount = period === "1w" ? 7 : 31;
    const dayKeys = recentCalendarDayKeys(slotCount);
    return points.map((p, i) => {
      const fromTs = p.timestamp ? toCalendarDay(p.timestamp) : null;
      const time = fromTs ?? dayKeys[i] ?? dayKeys[Math.min(i, dayKeys.length - 1)];
      return {
        time,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      };
    });
  }

  const intraday = isIntradayInterval(dataInterval);
  const useBusinessDay =
    !intraday && (period ? DAILY_CHART_PERIODS.has(period) || dataInterval === "1d" : false);
  const baseSec = Math.floor(Date.now() / 1000) - points.length * 86_400;
  const mapped: LwcCandle[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
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
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
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
      open: prev.open,
      high: Math.max(prev.high, c.high),
      low: Math.min(prev.low, c.low),
      close: c.close,
    });
  }
  const deduped = Array.from(byTime.values()).sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));

  // 동일 일자·타임스탬프로 뭉개져 봉이 2개 이하일 때 — 순번 기반 일봉 키로 복원
  if (useBusinessDay && points.length >= 8 && deduped.length < Math.min(8, Math.floor(points.length * 0.25))) {
    const baseSec = Math.floor(Date.now() / 1000) - points.length * 86_400;
    return points.map((p, i) => {
      const d = new Date(baseSec * 1000 + i * 86_400 * 1000);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        time: day,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      };
    });
  }

  return deduped;
}
