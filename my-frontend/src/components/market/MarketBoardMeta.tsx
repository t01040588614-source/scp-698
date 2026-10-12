"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMarketSession, type MarketRegion } from "@/lib/marketSession";
import { useLiveMarketSessions } from "@/hooks/useLiveMarketSessions";
import { stockApi } from "@/lib/api";

import type { StocksSourceLabel } from "@/lib/mapStocksSource";

type MarketBoardMetaProps = {
  market: MarketRegion;
  stockCount: number;
  updatedAt?: number;
  cacheAgeSeconds?: number | null;
  indicesSource?: "live" | "mock";
  stocksSource?: StocksSourceLabel;
  stocksNotice?: string | null;
  wsConnected?: boolean;
  sectorFilter?: string | null;
};

function formatUpdatedAt(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function MarketBoardMeta({
  market,
  stockCount,
  updatedAt,
  cacheAgeSeconds,
  indicesSource,
  stocksSource,
  stocksNotice,
  wsConnected,
  sectorFilter,
}: MarketBoardMetaProps) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => stockApi.refreshMarketCache(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketCacheStatus"] });
      void qc.invalidateQueries({ queryKey: market === "us" ? ["usStocks"] : ["koreaStocks"] });
    },
  });
  const live = useLiveMarketSessions();
  const session = getMarketSession(market);
  const sessionDetail =
    (market === "korea" ? live.krDetail : live.usDetail) ?? session.detail;
  const listHref = market === "us" ? "/us" : "/korea";
  const cacheStale = cacheAgeSeconds != null && cacheAgeSeconds > 45;

  return (
    <div className="market-board-meta" role="status" aria-live="polite">
      <span className={`market-session market-session--${session.state}`}>{session.label}</span>
      <span className="market-meta-muted">{sessionDetail}</span>
      <span className="market-meta-sep" aria-hidden>
        ·
      </span>
      <span className="market-meta-strong">{stockCount.toLocaleString("ko-KR")}종목</span>
      {indicesSource && (
        <>
          <span className="market-meta-sep" aria-hidden>
            ·
          </span>
          <span className="market-meta-muted">
            지수 {indicesSource === "live" ? "연동" : "샘플"}
          </span>
        </>
      )}
      {(stocksSource === "yahoo" || stocksSource === "fdr") && (
        <>
          <span className="market-meta-sep" aria-hidden>
            ·
          </span>
          <span className="market-meta-live">
            종목 {stocksSource === "fdr" ? "KRX 일봉" : "Yahoo"} · WS 1초
          </span>
        </>
      )}
      {stocksSource === "reference" && (
        <>
          <span className="market-meta-sep" aria-hidden>
            ·
          </span>
          <span className="market-meta-warn" title={stocksNotice ?? undefined}>
            종목 참고 시세
          </span>
        </>
      )}
      {sectorFilter && (
        <>
          <span className="market-meta-sep" aria-hidden>
            ·
          </span>
          <Link href={listHref} className="market-meta-link">
            섹터 &quot;{sectorFilter}&quot; 필터 해제
          </Link>
        </>
      )}
      <span className="market-meta-fill" />
      <span className={`market-ws-pill ${wsConnected ? "is-on" : ""}`}>
        {wsConnected ? "실시간" : "폴링 갱신"}
      </span>
      <span className={`market-meta-muted tabular${cacheStale ? " market-meta-warn" : ""}`}>
        갱신 {formatUpdatedAt(updatedAt)}
        {cacheAgeSeconds != null && cacheAgeSeconds >= 1
          ? ` (${Math.round(cacheAgeSeconds)}초 전)`
          : ""}
      </span>
      <button
        type="button"
        className="market-meta-refresh"
        disabled={refresh.isPending}
        title="Yahoo·KIS 캐시 즉시 갱신 요청"
        onClick={() => refresh.mutate()}
      >
        {refresh.isPending ? "…" : "↻"}
      </button>
    </div>
  );
}
