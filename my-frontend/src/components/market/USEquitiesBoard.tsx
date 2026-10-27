"use client";

import { Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import {
  boardIndicesRefetchMs,
  cacheStatusRefetchMs,
  stocksListRefetchMs,
} from "@/lib/marketRefreshIntervals";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { buildBoardIndexStripItems } from "@/lib/marketFromStocks";
import { resolveLiveEquityQuoteFromMaps, usToEquity } from "@/lib/equityQuotes";
import { getMarketIndicesForBoard } from "@/services/marketApi";
import IndexQuoteStrip from "./IndexQuoteStrip";
import EquitiesTable from "./EquitiesTable";
import SectorLinksGrid from "./SectorLinksGrid";
import MarketBoardMeta from "./MarketBoardMeta";
import MarketFundamentalsBar from "./MarketFundamentalsBar";
import ErrorState from "@/components/common/ErrorState";
import { retryMarketStocksFetch } from "@/lib/marketCacheRetry";
import { mapUsStocksSource } from "@/lib/mapStocksSource";

type USEquitiesBoardProps = {
  compact?: boolean;
  sectorFilter?: string | null;
};

export default function USEquitiesBoard({ compact, sectorFilter }: USEquitiesBoardProps) {
  const queryClient = useQueryClient();
  const wsCtx = useMarketWebSocketContext();
  const streamConnected = wsCtx?.isConnected ?? false;

  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: cacheStatusRefetchMs(streamConnected),
  });

  const regularSession = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);

  const {
    data: stocks,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    refetchInterval: stocksListRefetchMs(streamConnected, false, regularSession),
    staleTime: 2_000,
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
      const eq = usToEquity(s);
      const live = resolveLiveEquityQuoteFromMaps(eq, liveQuotes, liveTicks);
      return { ...eq, price: live.price, change: live.change, changePercent: live.changePercent, volume: live.volume };
    });
  }, [stocks, liveQuotes, liveTicks]);

  const { data: indexPayload } = useQuery({
    queryKey: ["boardIndices", "us"],
    queryFn: () => getMarketIndicesForBoard("us"),
    refetchInterval: boardIndicesRefetchMs(isConnected, regularSession),
    staleTime: 12_000,
  });
  const indexItems = useMemo(
    () => buildBoardIndexStripItems("us", indexPayload?.data, wsIndices, isConnected),
    [indexPayload?.data, wsIndices, isConnected]
  );

  const table = (
    <EquitiesTable
      rows={compact ? rows.slice(0, 8) : rows}
      isLoading={isLoading}
      liveQuotes={liveQuotes}
      liveTicks={liveTicks}
      market="us"
      sectorFilter={sectorFilter}
      investingExact
      footerHref={compact ? "/us" : undefined}
      footerLabel="미국 주식 전체"
      updatedLabel={
        isConnected
          ? undefined
          : dataUpdatedAt
            ? new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")
            : undefined
      }
      liveStream={isConnected}
      stocksSource={mapUsStocksSource(cacheStatus?.usSource)}
    />
  );

  if (compact) return table;

  if (isError) {
    return (
      <ErrorState
        title="미국 종목을 불러오지 못했습니다"
        message="백엔드(8000) 실행 후 새로고침하세요. 주식대시보드_통합.bat(메뉴 1)으로 다시 띄우면 됩니다."
        onRetry={handleRetry}
      />
    );
  }

  const emptyMessage =
    cacheStatus?.message ??
    "API 서버(8000) 실행 여부를 확인한 뒤 다시 시도해 주세요. Yahoo 요청 한도(429)일 수 있습니다.";

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
            <SectorLinksGrid market="us" />
          </Suspense>
        )}
      </div>
    );

  return (
    <div className="inv-market-board">
      <div className="inv-market-board-top">
        <IndexQuoteStrip items={indexItems} streamConnected={isConnected} />
        <MarketBoardMeta
          market="us"
          stockCount={rows.length}
          updatedAt={cacheUpdatedMs ?? dataUpdatedAt}
          cacheAgeSeconds={cacheStatus?.cacheAgeSeconds}
          indicesSource={indexPayload?.status}
          stocksSource={mapUsStocksSource(cacheStatus?.usSource)}
          stocksNotice={cacheStatus?.message}
          wsConnected={isConnected}
          sectorFilter={sectorFilter}
        />
        <MarketFundamentalsBar
          rows={rows}
          market="us"
          stocksSource={mapUsStocksSource(cacheStatus?.usSource)}
        />
      </div>
      {mainContent}
    </div>
  );
}
