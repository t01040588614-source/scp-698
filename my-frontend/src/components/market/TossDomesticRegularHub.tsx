"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { cacheStatusRefetchMs, stocksListRefetchMs } from "@/lib/marketRefreshIntervals";
import { wsLiveInputsForSymbol } from "@/lib/equityQuotes";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import {
  computeBreadth,
  filterIndicesByRegion,
  filterIndicesByTab,
} from "@/lib/regionalMarkets";
import type { MarketIndexQuote } from "@/types/stock";
import TossIndexStrip from "./TossIndexStrip";
import TossRealtimeRankPanel from "./TossRealtimeRankPanel";
import RegionalIndicesTable from "./RegionalIndicesTable";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";

const KOREA_INDEX_STRIP = ["kospi", "kosdaq", "kospi200"] as const;

type MainTab = "realtime" | "indices";

function mergeLiveIndices(
  rest: MarketIndexQuote[],
  live: MarketIndexQuote[]
): MarketIndexQuote[] {
  if (!live.length) return rest;
  const map = new Map(rest.map((r) => [r.id, r]));
  for (const row of live) {
    map.set(row.id, { ...map.get(row.id), ...row });
  }
  return Array.from(map.values());
}

/** 토스증권 국내 정규장 + 실시간/지수 탭 */
export default function TossDomesticRegularHub() {
  const [mainTab, setMainTab] = useState<MainTab>("realtime");
  const wsCtx = useMarketWebSocketContext();
  const streamConnected = wsCtx?.isConnected ?? false;

  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data;
      const regular = Boolean(status?.krMarketOpen || status?.usMarketOpen);
      return cacheStatusRefetchMs(streamConnected, regular);
    },
    staleTime: 2_000,
  });
  const regularSession = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);

  const { data: indicesRaw, isLoading: idxLoading, isError: idxError, refetch } = useQuery({
    queryKey: ["marketHubIndices"],
    queryFn: () => stockApi.getMarketIndices().then((r) => r.data ?? []),
    refetchInterval: 20_000,
    staleTime: 8_000,
  });

  const { data: koreaStocks } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data ?? []),
    refetchInterval: stocksListRefetchMs(streamConnected, false, regularSession),
    staleTime: 2_000,
  });

  const { indices: wsIndices, isConnected } = useMarketWebSocket([], ALL_WS_INDEX_IDS);

  const allIndices = useMemo(() => {
    const base = indicesRaw ?? [];
    const live = wsIndices.map((i) => ({
      id: i.id,
      name: i.name,
      country: i.country,
      category: i.category,
      price: i.price,
      change: i.change,
      changePercent: i.changePercent,
      status: i.status,
    }));
    return mergeLiveIndices(base, live);
  }, [indicesRaw, wsIndices]);

  const indexStrip = useMemo(() => {
    const map = new Map(allIndices.map((r) => [r.id, r]));
    return KOREA_INDEX_STRIP.map((id) => map.get(id)).filter(Boolean) as MarketIndexQuote[];
  }, [allIndices]);

  const indexTableRows = useMemo(() => {
    const regional = filterIndicesByRegion(allIndices, "korea");
    return filterIndicesByTab(regional, "indices").filter(
      (r) => r.country === "KR" || r.id.startsWith("kospi") || r.id.startsWith("kosdaq")
    );
  }, [allIndices]);

  const breadth = useMemo(() => {
    const liveQuotes = wsCtx?.quotes ?? {};
    const liveTicks = wsCtx?.ticks ?? {};
    const changes = (koreaStocks ?? []).map((s) => {
      const { livePrice, tick } = wsLiveInputsForSymbol(s.symbol, liveQuotes, liveTicks);
      return mergeLiveStockQuote(
        {
          price: s.price,
          change: s.change,
          changePercent: s.changePercent,
          previousClose: s.previousClose,
          volume: s.volume,
        },
        livePrice,
        tick
      ).changePercent;
    });
    return computeBreadth(changes);
  }, [koreaStocks, wsCtx?.quotes, wsCtx?.ticks]);

  return (
    <div className="toss-markets">
      <div className="toss-markets-meta">
        <LiveStreamBadge connected={isConnected} className="inv-live-badge--inline" />
        <span>시세</span>
      </div>

      {idxLoading && !allIndices.length && <LoadingState rows={4} />}
      {idxError && !allIndices.length && (
        <ErrorState title="지수를 불러오지 못했습니다" onRetry={() => void refetch()} />
      )}

      {indexStrip.length > 0 && <TossIndexStrip items={indexStrip} />}

      <div className="toss-main-tabs" role="tablist" aria-label="시장 보기">
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "realtime"}
          className={`toss-main-tab${mainTab === "realtime" ? " is-active" : ""}`}
          onClick={() => setMainTab("realtime")}
        >
          실시간
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "indices"}
          className={`toss-main-tab${mainTab === "indices" ? " is-active" : ""}`}
          onClick={() => setMainTab("indices")}
        >
          지수·환율
        </button>
      </div>

      {mainTab === "realtime" && (
        <TossRealtimeRankPanel koreaStocks={koreaStocks ?? []} usStocks={[]} domesticOnly sparklines />
      )}

      {mainTab === "indices" && indexTableRows.length > 0 && (
        <div className="toss-indices-panel" role="tabpanel">
          <RegionalIndicesTable title="국내·아시아 지수" rows={indexTableRows} breadth={breadth} />
        </div>
      )}

      <nav className="toss-quick-links" aria-label="더보기">
        <Link href="/korea">전체 한국 종목</Link>
        <Link href="/watchlist">관심종목</Link>
      </nav>
    </div>
  );
}
