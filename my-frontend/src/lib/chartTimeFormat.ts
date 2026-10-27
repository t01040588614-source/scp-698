/** lightweight-charts 시간축 — 전 기간·전 종목 공통 (시·분·일·월) */

import type { OhlcPoint } from "@/services/chartApi";
import { ordinalSlotIndexFromTime } from "@/lib/lwcTime";
import { isIntradayChartPeriod } from "@/lib/chartTimeScaleFit";

export type ChartMarketRegion = "korea" | "us";

type LwcTimeLike = string | number | { year: number; month: number; day: number };

export type LwcSeriesPointLike = { time: LwcTimeLike };

const SESSION_OPEN: Record<ChartMarketRegion, { hour: number; minute: number }> = {
  korea: { hour: 9, minute: 0 },
  us: { hour: 9, minute: 30 },
};

const EXCHANGE_TZ: Record<ChartMarketRegion, string> = {
  korea: "Asia/Seoul",
  us: "America/New_York",
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function zonedPartsFromMs(ms: number, timeZone: string): ZonedParts | null {
  if (!Number.isFinite(ms)) return null;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(ms));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  const hour = pick("hour");
  const minute = pick("minute");
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return { year, month, day, hour, minute };
}

export function sessionOpenMsForBar(ms: number, market: ChartMarketRegion): number | null {
  const tz = EXCHANGE_TZ[market];
  const bar = zonedPartsFromMs(ms, tz);
  if (!bar) return null;
  const open = SESSION_OPEN[market];
  const guessUtc = Date.UTC(bar.year, bar.month - 1, bar.day, open.hour, open.minute, 0, 0);
  const atGuess = zonedPartsFromMs(guessUtc, tz);
  if (!atGuess) return guessUtc;
  const deltaMin = (atGuess.hour - open.hour) * 60 + (atGuess.minute - open.minute);
  return guessUtc - deltaMin * 60_000;
}

export function lwcTimeToUnixMs(time: unknown): number | null {
  if (typeof time === "number") return time * 1000;
  if (typeof time === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(time)) {
      const parsed = Date.parse(`${time}T12:00:00`);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Date.parse(time);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (time && typeof time === "object" && "year" in time) {
    const t = time as { year: number; month: number; day: number };
    return Date.UTC(t.year, t.month - 1, t.day, 12, 0, 0);
  }
  return null;
}

function businessDayKey(time: unknown): string | null {
  if (typeof time === "string") return time.slice(0, 10);
  if (typeof time === "number") return null;
  if (time && typeof time === "object" && "year" in time) {
    const t = time as { year: number; month: number; day: number };
    return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  }
  return null;
}

function candleIndexForTime(time: unknown, candles: LwcSeriesPointLike[]): number {
  const key = businessDayKey(time);
  if (key) {
    const idx = candles.findIndex((c) => String(c.time) === key);
    if (idx >= 0) return idx;
  }
  if (typeof time === "number") {
    const idx = candles.findIndex((c) => c.time === time);
    if (idx >= 0) return idx;
  }
  return -1;
}

function seriesTimeSpanMs(candles: LwcSeriesPointLike[]): number {
  const ms = candles
    .map((c) => lwcTimeToUnixMs(c.time))
    .filter((v): v is number => v != null);
  if (ms.length < 2) return 0;
  return Math.max(...ms) - Math.min(...ms);
}

/** "1시간 15분", "45분" */
export function formatSessionElapsedKo(elapsedMs: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "";
  const totalMin = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins}분`;
  return `${hours}시간 ${mins}분`;
}

function formatIntradayTickKo(ms: number, market: ChartMarketRegion): string {
  const p = zonedPartsFromMs(ms, EXCHANGE_TZ[market]);
  if (!p) return "";
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

function formatIntradayTickLabel(
  ms: number,
  market: ChartMarketRegion,
  preferSessionElapsed: boolean,
): string {
  if (preferSessionElapsed) {
    const openMs = sessionOpenMsForBar(ms, market);
    if (openMs != null) {
      const elapsed = ms - openMs;
      if (elapsed >= 0 && elapsed <= 7.5 * 60 * 60_000) {
        const elapsedLabel = formatSessionElapsedKo(elapsed);
        if (elapsedLabel.length <= 10) return elapsedLabel;
      }
    }
  }
  return formatIntradayTickKo(ms, market);
}

function formatDailyTickKo(ms: number, spanMs: number, market: ChartMarketRegion): string {
  const p = zonedPartsFromMs(ms, EXCHANGE_TZ[market]);
  if (!p) return "";
  const days = spanMs / 86_400_000;
  const tz = EXCHANGE_TZ[market];
  const nowY = zonedPartsFromMs(Date.now(), tz)?.year;
  if (days > 900) return `${p.year}.${p.month}`;
  if (days > 180 || p.year !== nowY) return `${p.year}.${String(p.month).padStart(2, "0")}.${String(p.day).padStart(2, "0")}`;
  return `${p.month}/${p.day}`;
}

function formatIntradayTickWithDateKo(ms: number, market: ChartMarketRegion): string {
  const p = zonedPartsFromMs(ms, EXCHANGE_TZ[market]);
  if (!p) return "";
  const clock = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  const tz = EXCHANGE_TZ[market];
  const nowY = zonedPartsFromMs(Date.now(), tz)?.year;
  if (p.year !== nowY) {
    return `${p.year}.${String(p.month).padStart(2, "0")}.${String(p.day).padStart(2, "0")} ${clock}`;
  }
  return `${p.month}/${p.day} ${clock}`;
}

function pointTimestampMs(point: OhlcPoint | undefined): number | null {
  if (!point) return null;
  if (point.timestamp) {
    const ms = Date.parse(point.timestamp);
    if (Number.isFinite(ms)) return ms;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(point.time)) {
    const ms = Date.parse(point.time.slice(0, 10));
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

/** 1달 — 1일·2일·…·31일(일봉 31칸) 연속 축, LWC 희소 눈금 대체 */
export function isDenseOrdinalMonthAxis(period: string, useOrdinalDayAxis: boolean): boolean {
  return useOrdinalDayAxis && period === "1m";
}

function formatOrdinalTickKo(
  time: unknown,
  candles: LwcSeriesPointLike[],
  points: OhlcPoint[],
  market: ChartMarketRegion,
  period: string,
): string {
  const idx = ordinalSlotIndexFromTime(time) ?? candleIndexForTime(time, candles);
  if (idx < 0) return "";
  if (period === "1m") {
    return `${idx + 1}일`;
  }
  const tsMs = pointTimestampMs(points[idx]);
  if (tsMs != null && period === "1w") {
    const tick = formatDailyTickKo(tsMs, 7 * 86_400_000, market);
    if (tick.length <= 10) return tick;
  }
  return `${idx + 1}일`;
}

export function intradayChartShowSeconds(dataInterval?: string): boolean {
  if (!dataInterval) return false;
  return dataInterval === "1m" || dataInterval === "2m";
}

export type ChartTimeFormattersInput = {
  market: ChartMarketRegion;
  period: string;
  dataInterval?: string;
  useOrdinalDayAxis: boolean;
  candles: LwcSeriesPointLike[];
  pointsSnapshot: OhlcPoint[];
};

export type ChartTimeDetail = {
  dateIso: string;
  dateLong: string;
  weekday: string;
  time: string | null;
  sessionElapsed: string | null;
  barOrdinal: string | null;
  zoneLabel: string;
};

const ZONE_LABEL: Record<ChartMarketRegion, string> = {
  korea: "KST",
  us: "ET",
};

function formatWeekdayKo(ms: number, market: ChartMarketRegion): string {
  const tz = EXCHANGE_TZ[market];
  return new Date(ms).toLocaleDateString("ko-KR", {
    timeZone: tz,
    weekday: "short",
  });
}

function formatDateLongKo(ms: number, market: ChartMarketRegion): string {
  const tz = EXCHANGE_TZ[market];
  return new Date(ms).toLocaleDateString("ko-KR", {
    timeZone: tz,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateIso(ms: number, market: ChartMarketRegion): string {
  const p = zonedPartsFromMs(ms, EXCHANGE_TZ[market]);
  if (!p) return "";
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function formatTimeOnlyKo(ms: number, market: ChartMarketRegion, showSeconds: boolean): string {
  const tz = EXCHANGE_TZ[market];
  return new Date(ms).toLocaleTimeString("ko-KR", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: true,
  });
}

function sessionElapsedForBar(ms: number, market: ChartMarketRegion, period: string): string | null {
  if (period !== "1d") return null;
  const openMs = sessionOpenMsForBar(ms, market);
  if (openMs == null) return null;
  const elapsed = ms - openMs;
  if (elapsed < 0 || elapsed > 16 * 60 * 60_000) return null;
  return formatSessionElapsedKo(elapsed) || null;
}

/** 십자선·범례 — 날짜·요일·시간·장중 등 필드 분리 */
export function resolveChartTimeDetail(
  time: unknown,
  input: ChartTimeFormattersInput,
): ChartTimeDetail | null {
  const { market, period, dataInterval, useOrdinalDayAxis, candles, pointsSnapshot } = input;
  const zoneLabel = ZONE_LABEL[market];

  if (useOrdinalDayAxis) {
    const idx = candleIndexForTime(time, candles);
    if (idx < 0) return null;
    const tsMs = pointTimestampMs(pointsSnapshot[idx]);
    if (tsMs == null) {
      return {
        dateIso: "",
        dateLong: "",
        weekday: "",
        time: null,
        sessionElapsed: null,
        barOrdinal: `${idx + 1}일`,
        zoneLabel,
      };
    }
    return {
      dateIso: formatDateIso(tsMs, market),
      dateLong: formatDateLongKo(tsMs, market),
      weekday: formatWeekdayKo(tsMs, market),
      time: null,
      sessionElapsed: null,
      barOrdinal: `${idx + 1}일`,
      zoneLabel,
    };
  }

  const ms = lwcTimeToUnixMs(time);
  if (ms == null) return null;

  if (isIntradayChartPeriod(period, dataInterval)) {
    const showSeconds = intradayChartShowSeconds(dataInterval);
    return {
      dateIso: formatDateIso(ms, market),
      dateLong: formatDateLongKo(ms, market),
      weekday: formatWeekdayKo(ms, market),
      time: formatTimeOnlyKo(ms, market, showSeconds),
      sessionElapsed: sessionElapsedForBar(ms, market, period),
      barOrdinal: null,
      zoneLabel,
    };
  }

  return {
    dateIso: formatDateIso(ms, market),
    dateLong: formatDateLongKo(ms, market),
    weekday: formatWeekdayKo(ms, market),
    time: null,
    sessionElapsed: null,
    barOrdinal: null,
    zoneLabel,
  };
}

/** LWC 축·십자선 라벨 — 짧게 */
function compactCrosshairLabel(
  time: unknown,
  input: ChartTimeFormattersInput,
  mode: "ordinal" | "intraday" | "daily",
  spanMs: number,
): string {
  const { market, period, candles } = input;
  if (mode === "ordinal") {
    const idx =
      ordinalSlotIndexFromTime(time) ?? candleIndexForTime(time, candles);
    if (idx < 0) return "";
    return `${idx + 1}일`;
  }
  const ms = lwcTimeToUnixMs(time);
  if (ms == null) return "";
  if (mode === "intraday") {
    return formatIntradayTickLabel(ms, market, period === "1d");
  }
  return formatDailyTickKo(ms, spanMs, market);
}

/** 종목·지수 차트 — 기간별 timeFormatter / tickMarkFormatter */
export function createChartTimeFormatters(input: ChartTimeFormattersInput): {
  timeFormatter: (time: unknown) => string;
  tickMarkFormatter: (time: unknown) => string | null;
  mode: "ordinal" | "intraday" | "daily";
} {
  const { market, period, dataInterval, useOrdinalDayAxis, candles, pointsSnapshot } = input;

  const formatterInput: ChartTimeFormattersInput = {
    market,
    period,
    dataInterval,
    useOrdinalDayAxis,
    candles,
    pointsSnapshot,
  };

  if (useOrdinalDayAxis) {
    return {
      mode: "ordinal",
      timeFormatter: (time) =>
        compactCrosshairLabel(time, formatterInput, "ordinal", 0),
      tickMarkFormatter: (time) =>
        formatOrdinalTickKo(time, candles, pointsSnapshot, market, period) || null,
    };
  }

  if (isIntradayChartPeriod(period, dataInterval)) {
    const withDateOnAxis = period !== "1d";
    const preferSessionElapsed = period === "1d";
    return {
      mode: "intraday",
      timeFormatter: (time) =>
        compactCrosshairLabel(time, formatterInput, "intraday", 0),
      tickMarkFormatter: (time) => {
        const ms = lwcTimeToUnixMs(time);
        if (ms == null) return null;
        if (withDateOnAxis) {
          return formatIntradayTickWithDateKo(ms, market);
        }
        return formatIntradayTickLabel(ms, market, preferSessionElapsed);
      },
    };
  }

  const spanMs = seriesTimeSpanMs(candles);
  return {
    mode: "daily",
    timeFormatter: (time) =>
      compactCrosshairLabel(time, formatterInput, "daily", spanMs),
    tickMarkFormatter: (time) => {
      const ms = lwcTimeToUnixMs(time);
      if (ms == null) return null;
      return formatDailyTickKo(ms, spanMs, market);
    },
  };
}

/** @deprecated createChartTimeFormatters 사용 */
export function createIntradayChartTimeFormatters(
  market: ChartMarketRegion,
  opts?: { dataInterval?: string; preferSessionElapsedTicks?: boolean },
) {
  const period = opts?.preferSessionElapsedTicks ? "1d" : "1w";
  return createChartTimeFormatters({
    market,
    period,
    dataInterval: opts?.dataInterval,
    useOrdinalDayAxis: false,
    candles: [],
    pointsSnapshot: [],
  });
}
