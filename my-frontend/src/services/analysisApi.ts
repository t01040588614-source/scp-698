import { stockApi } from "@/lib/api";
import {
  equityAiSummary,
  koreaToEquity,
  technicalSignals,
  usToEquity,
  type EquityQuote,
} from "@/lib/equityQuotes";

export type AnalysisListItem = {
  id: string;
  title: string;
  author: string;
  tag: string;
  publishedAt: string;
  href?: string;
  symbol?: string;
  market?: "korea" | "us";
};

export const MACRO_ANALYSIS_REPORTS: AnalysisListItem[] = [
  {
    id: "a1",
    title: "반도체 업종 실적 전망과 수출 회복 시그널",
    author: "리서치 팀",
    tag: "산업 분석",
    publishedAt: "2026-09-29T12:00:00+09:00",
  },
  {
    id: "a2",
    title: "금리 경로와 성장주 vs 가치주 로테이션",
    author: "매크로 팀",
    tag: "매크로",
    publishedAt: "2026-09-28T17:30:00+09:00",
  },
  {
    id: "a3",
    title: "원/달러 환율 변동이 수출주 EPS에 미치는 영향",
    author: "FX 데스크",
    tag: "외환",
    publishedAt: "2026-09-27T09:15:00+09:00",
  },
];

export function buildStockAnalysis(
  eq: EquityQuote,
  market: "korea" | "us",
  feed: "websocket" | "rest" = "rest"
): AnalysisListItem {
  const tech = technicalSignals(eq.changePercent);
  const summary = equityAiSummary(eq.changePercent, eq.sector);
  const pct =
    eq.changePercent >= 0
      ? `+${eq.changePercent.toFixed(2)}%`
      : `${eq.changePercent.toFixed(2)}%`;
  return {
    id: `${market}-${eq.symbol}`,
    symbol: eq.symbol,
    market,
    title: `${eq.name} (${eq.symbol}) · ${summary} · 등락 ${pct} · RSI ${tech.rsi.toFixed(0)} · ${tech.trend} · MACD ${tech.macd}`,
    author: feed === "websocket" ? "MarketLens · WebSocket" : "MarketLens · REST",
    tag: market === "korea" ? "한국 종목" : "미국 종목",
    publishedAt: new Date().toISOString(),
    href: `/quote/${market}/${encodeURIComponent(eq.symbol)}`,
  };
}

export function sortEquitiesForAnalysis(a: EquityQuote, b: EquityQuote) {
  const byMarket = a.market.localeCompare(b.market, "ko");
  if (byMarket !== 0) return byMarket;
  return a.name.localeCompare(b.name, "ko");
}

export type AnalysisListBundle = {
  data: AnalysisListItem[];
  status: "live" | "partial" | "macro_only";
  counts: { korea: number; us: number; total: number };
};

export function buildAnalysisListBundle(
  koreaEquities: EquityQuote[],
  usEquities: EquityQuote[],
  feed: "websocket" | "rest" = "rest"
): AnalysisListBundle {
  const stockItems = [
    ...koreaEquities.map((eq) => buildStockAnalysis(eq, "korea", feed)),
    ...usEquities.map((eq) => buildStockAnalysis(eq, "us", feed)),
  ];

  const status =
    koreaEquities.length > 0 && usEquities.length > 0
      ? "live"
      : stockItems.length > 0
        ? "partial"
        : "macro_only";

  return {
    data: [...MACRO_ANALYSIS_REPORTS, ...stockItems],
    status,
    counts: {
      korea: koreaEquities.length,
      us: usEquities.length,
      total: MACRO_ANALYSIS_REPORTS.length + stockItems.length,
    },
  };
}

/** REST 일괄 조회 (폴백·SSR용) */
export async function getAnalysisList(): Promise<AnalysisListBundle> {
  const [krRes, usRes] = await Promise.allSettled([
    stockApi.getKoreaStocks(),
    stockApi.getUSStocks(),
  ]);

  const koreaRaw = krRes.status === "fulfilled" ? (krRes.value.data ?? []) : [];
  const usRaw = usRes.status === "fulfilled" ? (usRes.value.data ?? []) : [];

  const koreaEquities = koreaRaw.map(koreaToEquity).sort(sortEquitiesForAnalysis);
  const usEquities = usRaw.map(usToEquity).sort(sortEquitiesForAnalysis);

  return buildAnalysisListBundle(koreaEquities, usEquities, "rest");
}
