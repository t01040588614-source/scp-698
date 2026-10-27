"use client";

import AppLink from "@/components/common/AppLink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { fetchMarketIndicesResilient, seedMarketIndexCatalog } from "@/services/marketApi";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import {
  MARKET_REGION_NAV,
  MARKETS_CONTENT_TABS,
  computeBreadth,
  commodityIndexRows,
  filterIndicesByRegion,
  filterIndicesByTab,
  hubStockRegionsForMarket,
  regionTableTitle,
  type MarketRegionId,
  type MarketsContentTabId,
} from "@/lib/regionalMarkets";
import type { MarketIndexQuote } from "@/types/stock";
import RegionalIndicesTable from "./RegionalIndicesTable";
import RegionalWorldMap from "./RegionalWorldMap";
import MarketsHubActiveFilter from "./MarketsHubActiveFilter";
import MarketsHubStocksPanel from "./MarketsHubStocksPanel";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import {
  marketIndicesRefetchMs,
  stocksListRefetchMs,
} from "@/lib/marketRefreshIntervals";
import {
  koreaToEquity,
  resolveLiveEquityQuoteFromMaps,
  usToEquity,
  wsLiveInputsForSymbol,
} from "@/lib/equityQuotes";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import type { MapRegionId } from "@/lib/regionMapStats";

function parseRegionParam(value: string | null): MarketRegionId | null {
  if (
    value === "overview" ||
    value === "korea" ||
    value === "asia" ||
    value === "us" ||
    value === "europe"
  ) {
    return value;
  }
  return null;
}

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

function parseInitialContentTab(value?: string | null): MarketsContentTabId {
  if (
    value === "indices" ||
    value === "stocks" ||
    value === "forex" ||
    value === "commodities" ||
    value === "overview"
  ) {
    return value;
  }
  return "overview";
}

type InvestingMarketsHubProps = {
  initialContentTab?: MarketsContentTabId;
  highlightIndexId?: string | null;
};

/** Investing.com 스타일 시장 개요 허브 */
export default function InvestingMarketsHub({
  initialContentTab = "overview",
  highlightIndexId = null,
}: InvestingMarketsHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [region, setRegion] = useState<MarketRegionId>(() => {
    return parseRegionParam(searchParams.get("region")) ?? "overview";
  });
  const [contentTab, setContentTab] = useState<MarketsContentTabId>(initialContentTab);
  const wsCtx = useMarketWebSocketContext();
  const streamConnected = wsCtx?.isConnected ?? false;
  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    staleTime: 1_000,
  });
  const needsLive =
    cacheStatus?.koreaSource === "reference" ||
    cacheStatus?.koreaSource === "none" ||
    cacheStatus?.usSource === "reference" ||
    cacheStatus?.usSource === "none";
  const regularSession = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);
  const stocksPollMs = stocksListRefetchMs(streamConnected, needsLive, regularSession);

  useEffect(() => {
    const fromUrl = parseRegionParam(searchParams.get("region"));
    if (fromUrl) setRegion(fromUrl);
  }, [searchParams]);

  const hubDetailRef = useRef<HTMLDivElement>(null);

  const selectRegion = useCallback(
    (
      next: MarketRegionId,
      options?: { scrollToDetail?: boolean; openStocksTab?: boolean }
    ) => {
      setRegion(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("region");
      else params.set("region", next);

      const openStocks = next !== "overview" && options?.openStocksTab !== false;
      if (openStocks) {
        setContentTab("stocks");
        params.set("tab", "stocks");
      } else if (next !== "overview" && (contentTab === "forex" || contentTab === "commodities")) {
        setContentTab("overview");
        params.delete("tab");
      }

      const qs = params.toString();
      router.replace(qs ? `/markets?${qs}` : "/markets", { scroll: false });
      if (options?.scrollToDetail !== false) {
        requestAnimationFrame(() => {
          const el = hubDetailRef.current;
          if (!el) return;
          const top = el.getBoundingClientRect().top;
          if (top > window.innerHeight * 0.55) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    },
    [router, searchParams, contentTab]
  );

  const selectContentTab = useCallback(
    (tab: MarketsContentTabId) => {
      setContentTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `/markets?${qs}` : "/markets", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    setContentTab(parseInitialContentTab(initialContentTab));
  }, [initialContentTab]);

  useEffect(() => {
    if (highlightIndexId) {
      setContentTab((t) => (t === "stocks" ? t : "indices"));
    }
  }, [highlightIndexId]);

  const {
    data: indicesPayload,
    isLoading: idxLoading,
    isError: idxError,
    refetch,
  } = useQuery({
    queryKey: ["marketHubIndices"],
    queryFn: () => fetchMarketIndicesResilient(),
    placeholderData: () => ({ rows: seedMarketIndexCatalog(), live: false }),
    refetchInterval: marketIndicesRefetchMs(streamConnected, regularSession),
    staleTime: 8_000,
    retry: 1,
  });

  const { data: backendHealth, isFetched: healthFetched } = useQuery({
    queryKey: ["health"],
    queryFn: () => stockApi.getHealth().then((r) => r.data),
    refetchInterval: 15_000,
    retry: 0,
    staleTime: 5_000,
  });
  const backendUp = backendHealth?.status === "healthy";
  const backendDown = healthFetched && !backendUp;

  const indicesRaw = indicesPayload?.rows;
  const indicesLive = indicesPayload?.live ?? false;

  const { data: koreaStocks, isLoading: krLoading } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data ?? []),
    refetchInterval: stocksPollMs,
    staleTime: needsLive ? 0 : 2_000,
  });

  const { data: usStocks, isLoading: usLoading } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data ?? []),
    refetchInterval: stocksPollMs,
    staleTime: needsLive ? 0 : 3_000,
  });

  const { data: asiaStocks, isLoading: asiaLoading } = useQuery({
    queryKey: ["asiaStocks"],
    queryFn: () => stockApi.getAsiaStocks().then((r) => r.data ?? []),
    refetchInterval: stocksPollMs,
    staleTime: needsLive ? 0 : 5_000,
  });

  const { data: europeStocks, isLoading: europeLoading } = useQuery({
    queryKey: ["europeStocks"],
    queryFn: () => stockApi.getEuropeStocks().then((r) => r.data ?? []),
    refetchInterval: stocksPollMs,
    staleTime: needsLive ? 0 : 5_000,
  });

  const stockRegions = hubStockRegionsForMarket(region);
  const wsSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const s of koreaStocks ?? []) set.add(s.symbol);
    for (const s of usStocks ?? []) set.add(s.symbol);
    for (const s of asiaStocks ?? []) set.add(s.symbol);
    for (const s of europeStocks ?? []) set.add(s.symbol);
    return Array.from(set);
  }, [koreaStocks, usStocks, asiaStocks, europeStocks]);

  const { indices: wsIndices, quotes: liveQuotes, ticks: liveTicks, isConnected } = useMarketWebSocket(
    wsSymbols,
    ALL_WS_INDEX_IDS
  );

  const allIndices = useMemo(() => {
    const base = indicesRaw?.length ? indicesRaw : seedMarketIndexCatalog();
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

  const indexTableRows = useMemo(() => {
    if (contentTab === "commodities") {
      return commodityIndexRows(allIndices);
    }
    const regional = filterIndicesByRegion(allIndices, region);
    return filterIndicesByTab(regional, contentTab);
  }, [allIndices, region, contentTab]);

  const mapStockChanges = useMemo((): Record<MapRegionId, number[]> => {
    const pct = (
      symbol: string,
      base: { price: number; change: number; changePercent: number; previousClose?: number }
    ) => {
      const { livePrice, tick } = wsLiveInputsForSymbol(symbol, liveQuotes, liveTicks);
      return mergeLiveStockQuote(
        {
          price: base.price,
          change: base.change,
          changePercent: base.changePercent,
          previousClose: base.previousClose ?? base.price - base.change,
        },
        livePrice,
        tick
      ).changePercent;
    };

    return {
      korea: (koreaStocks ?? []).map((s) => pct(s.symbol, s)),
      us: (usStocks ?? []).map((s) => pct(s.symbol, s)),
      asia: (asiaStocks ?? []).map((s) => pct(s.symbol, s)),
      europe: (europeStocks ?? []).map((s) => pct(s.symbol, s)),
    };
  }, [koreaStocks, usStocks, asiaStocks, europeStocks, liveQuotes, liveTicks]);

  const breadth = useMemo(() => {
    const kr = (koreaStocks ?? []).map(koreaToEquity);
    const us = (usStocks ?? []).map(usToEquity);
    const changes = [
      ...kr.map((row) => resolveLiveEquityQuoteFromMaps(row, liveQuotes, liveTicks).changePercent),
      ...us.map((row) => resolveLiveEquityQuoteFromMaps(row, liveQuotes, liveTicks).changePercent),
      ...(asiaStocks ?? []).map((s) => {
        const { livePrice, tick } = wsLiveInputsForSymbol(s.symbol, liveQuotes, liveTicks);
        return mergeLiveStockQuote(
          {
            price: s.price,
            change: s.change,
            changePercent: s.changePercent,
            previousClose: s.previousClose,
          },
          livePrice,
          tick
        ).changePercent;
      }),
      ...(europeStocks ?? []).map((s) => {
        const { livePrice, tick } = wsLiveInputsForSymbol(s.symbol, liveQuotes, liveTicks);
        return mergeLiveStockQuote(
          {
            price: s.price,
            change: s.change,
            changePercent: s.changePercent,
            previousClose: s.previousClose,
          },
          livePrice,
          tick
        ).changePercent;
      }),
    ];
    return computeBreadth(changes);
  }, [koreaStocks, usStocks, asiaStocks, europeStocks, liveQuotes, liveTicks]);

  const showIndexTab =
    contentTab === "overview" ||
    contentTab === "indices" ||
    contentTab === "forex" ||
    contentTab === "commodities";
  const showIndicesTable =
    showIndexTab && indexTableRows.length > 0;
  const showIndexTableEmpty = showIndexTab && !idxLoading && indexTableRows.length === 0;
  const showStocks = contentTab === "overview" || contentTab === "stocks";
  const indicesUsingFallback = !indicesLive && indexTableRows.length > 0;
  const stocksLoading = krLoading || usLoading || asiaLoading || europeLoading;

  const stocksNoticeMessage =
    needsLive && showStocks
      ? cacheStatus?.message ??
        "참고 시세(등락 0%·5만원대)입니다. FDR/Yahoo 실시간 캐시로 갱신 중입니다…"
      : null;

  const indicesNoticeMessage = (() => {
    if (!healthFetched) return null;
    if (backendDown) {
      return "백엔드(8000)에 연결되지 않았습니다. 참고 지수 시세를 표시합니다. 주식대시보드_통합.bat(메뉴 1)으로 실시간 데이터를 켜세요.";
    }
    if (indicesUsingFallback) {
      return "실시간 지수 API를 불러오지 못해 참고 시세를 표시합니다. 재연결 중…";
    }
    if (!isConnected) {
      return "WebSocket 연결이 끊겼습니다. REST로 약 20초마다 갱신됩니다.";
    }
    return null;
  })();

  return (
    <div className="inv-markets-hub">
      <div className="inv-markets-hub-top">
        <div className="inv-region-nav" role="tablist" aria-label="지역">
          {MARKET_REGION_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={region === item.id}
              className={`inv-region-nav-item${region === item.id ? " is-active" : ""}`}
              onClick={() => selectRegion(item.id)}
            >
              <span>{item.label}</span>
              {item.hint ? <span className="inv-region-nav-hint">{item.hint}</span> : null}
            </button>
          ))}
        </div>
        <div className="inv-hub-meta">
          <LiveStreamBadge connected={isConnected} className="inv-live-badge--inline" />
          <span className="inv-hub-meta-text">
            {isConnected ? "실시간 시세 연결됨" : "시세 갱신 중"}
          </span>
        </div>
      </div>

      <div className="inv-hub-main">
        {idxLoading && indexTableRows.length === 0 && <LoadingState rows={4} />}
        {idxError && indexTableRows.length === 0 && (
          <ErrorState title="지수를 불러오지 못했습니다" onRetry={() => void refetch()} />
        )}

        <RegionalWorldMap
          indices={allIndices}
          stockChanges={mapStockChanges}
          activeRegion={region}
          onRegionSelect={selectRegion}
          streamConnected={isConnected}
        />

        <div id="markets-hub-detail" ref={hubDetailRef} className="inv-hub-detail-anchor">
          <MarketsHubActiveFilter
            region={region}
            onSelectOverview={() => selectRegion("overview", { scrollToDetail: false })}
          />
        </div>

        <div className="inv-hub-content-tabs" role="tablist" aria-label="시장 콘텐츠">
          {MARKETS_CONTENT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={contentTab === tab.id}
              className={`inv-hub-content-tab${contentTab === tab.id ? " is-active" : ""}`}
              onClick={() => selectContentTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showIndicesTable && (
          <RegionalIndicesTable
            title={regionTableTitle(region)}
            rows={indexTableRows}
            breadth={breadth}
            highlightIndexId={highlightIndexId}
          />
        )}

        {showIndexTableEmpty && (
          <ErrorState
            title="지수 목록을 표시할 수 없습니다"
            message="백엔드(8000)를 확인한 뒤 새로고침해 주세요."
            onRetry={() => void refetch()}
          />
        )}

        {showIndexTab && showIndicesTable && indicesNoticeMessage && (
          <p className="inv-hub-indices-notice" role="status">
            {indicesNoticeMessage}
          </p>
        )}

        {showStocks && stocksNoticeMessage && (
          <p className="inv-hub-indices-notice" role="status">
            {stocksNoticeMessage}
          </p>
        )}

        {showStocks && (
          <MarketsHubStocksPanel
            regions={stockRegions}
            koreaStocks={koreaStocks}
            usStocks={usStocks}
            asiaStocks={asiaStocks}
            europeStocks={europeStocks}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            isLoading={stocksLoading}
            liveStream={isConnected}
          />
        )}

        <nav className="inv-hub-board-links" aria-label="종목 보드">
          <AppLink href="/korea">한국 종목 보드</AppLink>
          <AppLink href="/us">미국 종목 보드</AppLink>
          <AppLink href="/watchlist">관심종목</AppLink>
          <AppLink href="/news">뉴스 · 피드</AppLink>
          <AppLink href="/calendar">경제 캘린더</AppLink>
        </nav>
      </div>
    </div>
  );
}
