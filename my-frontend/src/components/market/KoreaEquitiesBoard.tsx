"use client";

import { Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { buildBoardIndexStripItems } from "@/lib/marketFromStocks";
import { koreaToEquity, resolveLiveEquityQuoteFromMaps } from "@/lib/equityQuotes";
import { getMarketIndicesForBoard } from "@/services/marketApi";
import IndexQuoteStrip from "./IndexQuoteStrip";
import EquitiesTable from "./EquitiesTable";
import SectorLinksGrid from "./SectorLinksGrid";
import MarketBoardMeta from "./MarketBoardMeta";
import MarketFundamentalsBar from "./MarketFundamentalsBar";
import ErrorState from "@/components/common/ErrorState";
import { retryMarketStocksFetch } from "@/lib/marketCacheRetry";
import { mapKoreaStocksSource } from "@/lib/mapStocksSource";
import {
  boardIndicesRefetchMs,
  cacheStatusRefetchMs,
  stocksListRefetchMs,
} from "@/lib/marketRefreshIntervals";

type KoreaEquitiesBoardProps = {
  compact?: boolean;
  sectorFilter?: string | null;
};

export default function KoreaEquitiesBoard({ compact, sectorFilter }: KoreaEquitiesBoardProps) {
  const queryClient = useQueryClient();
  const wsCtx = useMarketWebSocketContext();
  const streamConnected = wsCtx?.isConnected ?? false;

  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: cacheStatusRefetchMs(streamConnected),
  });

  const koreaReference =
    cacheStatus?.koreaSource === "reference" || cacheStatus?.koreaSource === "none";
  const regularSession = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);

  const {
    data: stocks,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    refetchInterval: stocksListRefetchMs(streamConnected, koreaReference, regularSession),
    staleTime: koreaReference ? 0 : 2_000,
  });

  const cacheUpdatedMs = useMemo(() => {
    if (!cacheStatus?.lastUpdated) return undefined;
    const t = Date.parse(cacheStatus.lastUpdated);
    return Number.isFinite(t) ? t : undefined;
  }, [cacheStatus?.lastUpdated]);

  const handleRetry = () => void retryMarketStocksFetch(refetch, queryClient);

  const symbols = useMemo(() => (stocks ?? []).map((s) => s.symbol), [stocks]);
  const {
    quotes: liveQuotes,
    ticks: liveTicks,
    indices: wsIndices,
    isConnected,
  } = useMarketWebSocket(symbols, ALL_WS_INDEX_IDS);

  const rows = useMemo(() => {
    return (stocks ?? []).map((s) => {
      const eq = koreaToEquity(s);
      const live = resolveLiveEquityQuoteFromMaps(eq, liveQuotes, liveTicks);
      return { ...eq, price: live.price, change: live.change, changePercent: live.changePercent, volume: live.volume };
    });
  }, [stocks, liveQuotes, liveTicks]);

  const { data: indexPayload } = useQuery({
    queryKey: ["boardIndices", "korea"],
    queryFn: () => getMarketIndicesForBoard("korea"),
    refetchInterval: boardIndicesRefetchMs(isConnected, regularSession),
    staleTime: 12_000,
  });
  const indexItems = useMemo(
    () => buildBoardIndexStripItems("korea", indexPayload?.data, wsIndices, isConnected),
    [indexPayload?.data, wsIndices, isConnected]
  );

  const table = (
    <EquitiesTable
      rows={compact ? rows.slice(0, 8) : rows}
      isLoading={isLoading}
      liveQuotes={liveQuotes}
      liveTicks={liveTicks}
      market="korea"
      sectorFilter={sectorFilter}
      investingExact
      footerHref={compact ? "/korea" : undefined}
      footerLabel="한국 주식 전체"
      updatedLabel={
        isConnected
          ? undefined
          : dataUpdatedAt
            ? new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")
            : undefined
      }
      liveStream={isConnected}
      stocksSource={mapKoreaStocksSource(cacheStatus?.koreaSource)}
    />
  );

  if (compact) {
    return table;
  }

  if (isError) {
    return (
      <ErrorState
        title="한국 종목을 불러오지 못했습니다"
        message="백엔드(8000) 실행 후 프론트를 새로고침해 주세요. 127.0.0.1과 localhost 혼용 시 연결 오류가 날 수 있습니다 — start.bat으로 다시 실행하면 해결됩니다."
        onRetry={handleRetry}
      />
    );
  }

  const emptyMessage =
    cacheStatus?.message ??
    "API 서버(8000)가 실행 중인지 확인한 뒤, 1~2분 후 다시 시도해 주세요. Yahoo 시세는 요청 한도(429)에 걸리면 비어 있을 수 있습니다.";

  const mainContent =
    !isLoading && rows.length === 0 ? (
      <div className="inv-market-empty-main">
        <ErrorState
          title="종목 데이터가 비어 있습니다"
          message={emptyMessage}
          onRetry={handleRetry}
        />
      </div>
    ) : (
      <div className="inv-market-main-stack">
        {table}
        {!isLoading && (
          <Suspense fallback={null}>
            <SectorLinksGrid />
          </Suspense>
        )}
      </div>
    );

  return (
    <div className="inv-market-board">
      <div className="inv-market-board-top">
        <IndexQuoteStrip items={indexItems} streamConnected={isConnected} />
        <MarketBoardMeta
          market="korea"
          stockCount={rows.length}
          updatedAt={cacheUpdatedMs ?? dataUpdatedAt}
          cacheAgeSeconds={cacheStatus?.cacheAgeSeconds}
          indicesSource={indexPayload?.status}
          stocksSource={mapKoreaStocksSource(cacheStatus?.koreaSource)}
          stocksNotice={cacheStatus?.message}
          wsConnected={isConnected}
          sectorFilter={sectorFilter}
        />
        <MarketFundamentalsBar
          rows={rows}
          market="korea"
          stocksSource={mapKoreaStocksSource(cacheStatus?.koreaSource)}
        />
      </div>
      {mainContent}
    </div>
  );
}
