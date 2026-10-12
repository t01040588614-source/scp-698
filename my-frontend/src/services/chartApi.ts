import { getApiBaseUrl } from "@/lib/apiBase";
import { mockChartData } from "@/data/mockData";
import { normalizeOhlcPoint, summarizeFromPoints } from "@/lib/chartSeries";

export type ChartMarket = "korea" | "us" | "index";

export interface OhlcPoint {
  time: string;
  timestamp?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
}

export interface ChartPeriodSummary {
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  totalVolume: number;
  avgVolume: number;
  pointsCount: number;
}

export interface ChartHistoryResult {
  points: OhlcPoint[];
  summary: ChartPeriodSummary;
  source: "yahoo" | "fdr" | "synthetic" | "mock";
  interval?: string;
  yahooTicker?: string;
}

function normalizeSummary(raw: Record<string, unknown> | undefined, points: OhlcPoint[]): ChartPeriodSummary {
  if (!raw) {
    const s = summarizeFromPoints(points);
    return {
      open: s.open,
      high: s.high,
      low: s.low,
      close: s.close,
      change: s.change,
      changePercent: s.changePercent,
      totalVolume: s.totalVolume,
      avgVolume: s.avgVolume,
      pointsCount: s.pointsCount,
    };
  }
  return {
    open: Number(raw.open ?? 0),
    high: Number(raw.high ?? 0),
    low: Number(raw.low ?? 0),
    close: Number(raw.close ?? 0),
    change: Number(raw.change ?? 0),
    changePercent: Number(raw.changePercent ?? raw.change_percent ?? 0),
    totalVolume: Number(raw.totalVolume ?? raw.total_volume ?? 0),
    avgVolume: Number(raw.avgVolume ?? raw.avg_volume ?? 0),
    pointsCount: Number(raw.pointsCount ?? raw.points_count ?? points.length),
  };
}

/** API 실패·봉 부족 시 클라이언트 참고 곡선 (사이드바 등) */
export function syntheticFromPrice(basePrice: number, period: string): OhlcPoint[] {
  const steps =
    { "1d": 48, "1w": 35, "1m": 126, "3m": 66, "6m": 126, "1y": 252, "5y": 260, max: 300 }[period] ?? 30;
  const points: OhlcPoint[] = [];
  let prev = basePrice;
  for (let i = 0; i < steps; i += 1) {
    const drift = (i - steps / 2) * (basePrice * 0.0012);
    const noise = ((i * 17) % 7 - 3) * (basePrice * 0.0006);
    const close = Math.round(basePrice + drift + noise);
    const open = Math.round(prev);
    const high = Math.round(Math.max(open, close) * 1.003);
    const low = Math.round(Math.min(open, close) * 0.997);
    const volume = Math.round(800_000 + (i % 5) * 120_000);
    let time = `P${i + 1}`;
    if (period === "1d") time = `${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
    else if (period === "1w" || period === "1m" || period === "3m") time = `${i + 1}일`;
    else time = `W${i + 1}`;
    points.push({ time, open, high, low, close, volume, value: close });
    prev = close;
  }
  return anchorSeriesToPrice(points, basePrice);
}

/** 마지막 종가를 현재가(base)에 맞춰 스케일 — synthetic·헤더 시세 불일치 방지 */
function anchorSeriesToPrice(points: OhlcPoint[], target: number): OhlcPoint[] {
  if (!points.length || !Number.isFinite(target) || target <= 0) return points;
  const lastClose = points[points.length - 1].close;
  if (!Number.isFinite(lastClose) || lastClose <= 0) return points;
  const ratio = target / lastClose;
  if (Math.abs(ratio - 1) < 0.002) return points;
  return points.map((p) => ({
    ...p,
    open: Math.round(p.open * ratio),
    high: Math.round(p.high * ratio),
    low: Math.round(p.low * ratio),
    close: Math.round(p.close * ratio),
    value: Math.round(p.close * ratio),
  }));
}

function legacyMockToOhlc(): OhlcPoint[] {
  return mockChartData.map((p, i) => {
    const close = p.value;
    const open = i > 0 ? mockChartData[i - 1].value : close * 0.998;
    return {
      time: p.time,
      open,
      high: Math.max(open, close) * 1.002,
      low: Math.min(open, close) * 0.998,
      close,
      volume: 500_000 + i * 10_000,
      value: close,
    };
  });
}

export async function getStockHistory(params: {
  symbol: string;
  market: ChartMarket;
  period: string;
  basePrice?: number;
  interval?: string;
  /** true면 API·실데이터(yahoo/fdr)만 허용 — 실패 시 throw */
  requireLiveData?: boolean;
}): Promise<ChartHistoryResult> {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams({
    symbol: params.symbol,
    market: params.market,
    period: params.period,
  });
  if (params.interval) qs.set("interval", params.interval);

  const parseHistory = async (res: Response): Promise<ChartHistoryResult> => {
    if (!res.ok) {
      let detail = "차트 데이터를 불러오지 못했습니다.";
      try {
        const err = (await res.json()) as { detail?: string };
        if (typeof err.detail === "string") detail = err.detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const rawPoints = (json.points as Record<string, unknown>[]) ?? [];
    let points = rawPoints.length ? rawPoints.map(normalizeOhlcPoint) : legacyMockToOhlc();
    const source =
      json.source === "yahoo" ||
      json.source === "fdr" ||
      json.source === "synthetic"
        ? (json.source as ChartHistoryResult["source"])
        : "mock";
    if (params.requireLiveData) {
      if (source === "synthetic" || source === "mock" || points.length < 2) {
        throw new Error("차트 소스(Yahoo·KRX)에 연결되지 않았습니다.");
      }
    }
    if (
      (source === "synthetic" || params.market === "index") &&
      params.basePrice &&
      params.basePrice > 0 &&
      source !== "yahoo" &&
      source !== "fdr"
    ) {
      points = anchorSeriesToPrice(points, params.basePrice);
    }
    return {
      points,
      summary: normalizeSummary(json.summary as Record<string, unknown>, points),
      source,
      interval: String(json.interval ?? ""),
      yahooTicker: String(json.yahooTicker ?? json.yahoo_ticker ?? ""),
    };
  };

  try {
    const res = await fetch(`${base}/stocks/history?${qs.toString()}`, {
      cache: "no-store",
    });
    return await parseHistory(res);
  } catch (err) {
    if (params.requireLiveData) {
      throw err instanceof Error ? err : new Error("차트 데이터를 불러오지 못했습니다.");
    }
    const points =
      params.basePrice && params.basePrice > 0
        ? syntheticFromPrice(params.basePrice, params.period)
        : legacyMockToOhlc();
    return {
      points,
      summary: normalizeSummary(undefined, points),
      source: params.basePrice ? "synthetic" : "mock",
    };
  }
}

export type KeyStatsRow = {
  label: string;
  value: string | null;
  kind: "value" | "locked";
  premium?: boolean;
};

export type KeyStatsResult = {
  symbol: string;
  market: string;
  columns: KeyStatsRow[][];
};

export async function getStockKeyStats(params: {
  symbol: string;
  market: ChartMarket;
}): Promise<KeyStatsResult> {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams({
    symbol: params.symbol,
    market: params.market,
  });
  const res = await fetch(`${base}/stocks/key-stats?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("key-stats failed");
  return (await res.json()) as KeyStatsResult;
}

export async function getIndexHistory(
  indexId: string,
  period: string,
  basePrice?: number
): Promise<ChartHistoryResult> {
  return getStockHistory({
    symbol: indexId,
    market: "index",
    period,
    basePrice,
  });
}

export type ChartEventDto = {
  type: string;
  date: string;
  label: string;
  title?: string;
  amount?: number | null;
  future?: boolean;
};

export type ChartEventsResult = {
  symbol: string;
  market: string;
  period: string;
  events: ChartEventDto[];
  legend: { key: string; label: string }[];
};

export async function getStockChartEvents(params: {
  symbol: string;
  market: ChartMarket;
  period: string;
}): Promise<ChartEventsResult> {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams({
    symbol: params.symbol,
    market: params.market,
    period: params.period,
  });
  try {
    const res = await fetch(`${base}/stocks/history/chart-events?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("chart-events failed");
    return (await res.json()) as ChartEventsResult;
  } catch {
    return {
      symbol: params.symbol,
      market: params.market,
      period: params.period,
      events: [],
      legend: [
        { key: "D", label: "배당" },
        { key: "E", label: "실적" },
      ],
    };
  }
}

export type PeriodReturnsResult = {
  symbol: string;
  market: string;
  returns: Partial<Record<string, number>>;
  source: string;
};

export async function getStockPeriodReturns(params: {
  symbol: string;
  market: ChartMarket;
}): Promise<PeriodReturnsResult> {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams({
    symbol: params.symbol,
    market: params.market,
  });
  try {
    const res = await fetch(`${base}/stocks/history/period-returns?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("period-returns failed");
    const json = (await res.json()) as Record<string, unknown>;
    const raw = (json.returns as Record<string, unknown>) ?? {};
    const returns: Partial<Record<string, number>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (Number.isFinite(n)) returns[k] = n;
    }
    return {
      symbol: String(json.symbol ?? params.symbol),
      market: String(json.market ?? params.market),
      returns,
      source: String(json.source ?? ""),
    };
  } catch {
    return { symbol: params.symbol, market: params.market, returns: {}, source: "error" };
  }
}
