import type { KoreaStock, USStock } from "@/types/stock";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import { normalizeStockQuoteFields } from "@/lib/stockQuoteFields";
import type { LiveStockTick } from "@/lib/wsNormalize";

export function quoteMarketFromEquity(row: EquityQuote): "korea" | "us" {
  return row.currency === "KRW" ? "korea" : "us";
}

export type EquityQuote = {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  currency: "KRW" | "USD";
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  sector?: string;
};

export type EquityFilter =
  | "all"
  | "kospi"
  | "kosdaq"
  | "nasdaq"
  | "nyse"
  | "gainers"
  | "losers"
  | "volume";

export function koreaToEquity(stock: KoreaStock): EquityQuote {
  const n = normalizeStockQuoteFields(stock);
  const previousClose = n.previousClose > 0 ? n.previousClose : n.price - n.change;
  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    price: n.price,
    change: n.change,
    changePercent: n.changePercent,
    previousClose,
    high: stock.high,
    low: stock.low,
    open: stock.open,
    volume: stock.volume,
    currency: "KRW",
    marketCap: stock.marketCap,
    peRatio: stock.peRatio,
    eps: stock.eps,
    sector: stock.sector,
  };
}

export function usToEquity(stock: USStock): EquityQuote {
  const n = normalizeStockQuoteFields(stock);
  const previousClose = n.previousClose > 0 ? n.previousClose : n.price - n.change;
  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.exchange,
    price: n.price,
    change: n.change,
    changePercent: n.changePercent,
    previousClose,
    high: stock.high,
    low: stock.low,
    open: stock.open,
    volume: stock.volume,
    currency: "USD",
    marketCap: stock.marketCap,
    peRatio: stock.peRatio,
    eps: stock.eps,
    sector: stock.sector,
  };
}

/** 실적 탭용 기간 수익률 (일간 등락률 기반 추정, API 확장 전 UI용) */
export function estimatedPerformance(changePercent: number) {
  const base = changePercent;
  const scale = (m: number) => Math.round((base * m + Number.EPSILON) * 100) / 100;
  return {
    d1: base,
    w1: scale(2.4),
    m1: scale(5.5),
    m3: scale(12),
    m6: scale(22),
    y1: scale(38),
    ytd: scale(18),
  };
}

export function technicalSignals(changePercent: number) {
  const rsi = Math.min(85, Math.max(15, 50 + changePercent * 2.5));
  const trend = changePercent > 0.35 ? "상승" : changePercent < -0.35 ? "하락" : "횡보";
  const macd = changePercent > 1.2 ? "매수" : changePercent < -1.2 ? "매도" : "관망";
  return { rsi, trend, macd };
}

export type EquitySortMetrics = {
  price: number;
  changePercent: number;
  volume: number;
  turnover: number;
  marketCap: number;
};

export function defaultEquityMetrics(row: EquityQuote): EquitySortMetrics {
  return {
    price: row.price,
    changePercent: row.changePercent,
    volume: row.volume,
    turnover: row.price * row.volume,
    marketCap: row.marketCap ?? 0,
  };
}

/** 토스 스타일 거래대금·시총 표기 (참고용) */
export function formatEquityTurnover(value: number, currency: "KRW" | "USD"): string {
  if (!value || value <= 0) return "—";
  if (currency === "KRW") {
    if (value >= 1_000_000_000_000) {
      return `${(value / 1_000_000_000_000).toLocaleString("ko-KR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}조원`;
    }
    const eok = value / 100_000_000;
    if (eok >= 10) return `${Math.round(eok).toLocaleString("ko-KR")}억원`;
    if (eok >= 1) return `${eok.toFixed(1)}억원`;
    if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
    return `${Math.round(value).toLocaleString("ko-KR")}원`;
  }
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatEquityMarketCap(value: number | undefined, currency: "KRW" | "USD"): string {
  if (!value || value <= 0) return "—";
  if (currency === "KRW") {
    if (value >= 1_000_000_000_000) {
      return `${(value / 1_000_000_000_000).toLocaleString("ko-KR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}조원`;
    }
    const eok = value / 100_000_000;
    if (eok >= 10) return `${Math.round(eok).toLocaleString("ko-KR")}억원`;
    return `${eok.toFixed(1)}억원`;
  }
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** 종목별 안정적인 매수·매도 비율 (데모 UI) */
export function tossStyleTradeRatio(symbol: string): { buyPct: number; sellPct: number } {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  }
  const buyPct = 22 + (Math.abs(hash) % 57);
  return { buyPct, sellPct: 100 - buyPct };
}

export function equityAiSummary(changePercent: number, sector?: string): string {
  const tag = sector?.trim();
  if (Math.abs(changePercent) >= 15) {
    return changePercent > 0 ? "급등 · 단기 변동성 주의" : "급락 · 수급 부담";
  }
  if (changePercent >= 5) return tag ? `${tag} 모멘텀 강화` : "수급 우위 · 상승세";
  if (changePercent <= -5) return tag ? `${tag} 약세 지속` : "매도 우위 · 하락 압력";
  if (tag?.includes("반도체")) return "반도체주 수급 이슈";
  if (tag?.includes("금융") || tag?.includes("은행")) return "금리·실적 관망";
  if (tag?.includes("바이오") || tag?.includes("제약")) return "임상·허가 이슈";
  if (Math.abs(changePercent) < 0.05) return "보합 · 관망세";
  return changePercent > 0 ? "완만한 상승" : "완만한 조정";
}

export function filterEquities(
  rows: EquityQuote[],
  filter: EquityFilter,
  metrics: (row: EquityQuote) => EquitySortMetrics = defaultEquityMetrics
): EquityQuote[] {
  let list = [...rows];
  switch (filter) {
    case "kospi":
      list = list.filter((r) => r.market === "KOSPI");
      break;
    case "kosdaq":
      list = list.filter((r) => r.market === "KOSDAQ");
      break;
    case "nasdaq":
      list = list.filter((r) => /NASDAQ/i.test(r.market));
      break;
    case "nyse":
      list = list.filter((r) => /NYSE/i.test(r.market));
      break;
    case "gainers":
      list = list
        .filter((r) => metrics(r).changePercent > 0)
        .sort((a, b) => metrics(b).changePercent - metrics(a).changePercent);
      break;
    case "losers":
      list = list
        .filter((r) => metrics(r).changePercent < 0)
        .sort((a, b) => metrics(a).changePercent - metrics(b).changePercent);
      break;
    case "volume":
      list = list.sort((a, b) => metrics(b).volume - metrics(a).volume);
      break;
    default:
      break;
  }
  return list;
}

export type SortKey =
  | "name"
  | "price"
  | "changePercent"
  | "volume"
  | "turnover"
  | "marketCap";
export type SortDir = "asc" | "desc";

function metricValue(metrics: EquitySortMetrics, key: SortKey): number {
  switch (key) {
    case "price":
      return metrics.price;
    case "changePercent":
      return metrics.changePercent;
    case "volume":
      return metrics.volume;
    case "turnover":
      return metrics.turnover;
    case "marketCap":
      return metrics.marketCap;
    default:
      return 0;
  }
}

export function sortEquities(
  rows: EquityQuote[],
  key: SortKey,
  dir: SortDir,
  metrics: (row: EquityQuote) => EquitySortMetrics = defaultEquityMetrics
): EquityQuote[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "name") return mul * a.name.localeCompare(b.name, "ko");
    const ma = metrics(a);
    const mb = metrics(b);
    const va = metricValue(ma, key);
    const vb = metricValue(mb, key);
    const primary = mul * (va - vb);
    if (primary !== 0) return primary;
    return mb.volume - ma.volume;
  });
}

/** REST + WebSocket 시세를 전일종가 기준으로 통일 */
export function resolveLiveEquityQuote(
  row: EquityQuote,
  livePrice?: number,
  tick?: LiveStockTick
) {
  const merged = mergeLiveStockQuote(
    {
      price: row.price,
      change: row.change,
      changePercent: row.changePercent,
      previousClose: row.previousClose,
      volume: row.volume,
    },
    livePrice,
    tick
  );
  return {
    price: merged.price,
    change: merged.change,
    changePercent: merged.changePercent,
    volume: merged.volume,
    turnover: merged.price * merged.volume,
  };
}
