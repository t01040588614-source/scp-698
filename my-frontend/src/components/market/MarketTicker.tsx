"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketTicker } from "@/services/marketApi";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { mergeIndexStripWithWs } from "@/lib/indexStrip";
import ErrorState from "@/components/common/ErrorState";
import { marketTickerRefetchMs } from "@/lib/marketRefreshIntervals";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import IndexQuoteStrip from "./IndexQuoteStrip";

export default function MarketTicker() {
  const wsCtx = useMarketWebSocketContext();
  const isConnected = wsCtx?.isConnected ?? false;

  const wsIndices = useMemo(() => {
    const allowed = new Set(ALL_WS_INDEX_IDS);
    return (wsCtx?.indices ?? []).filter((i) => allowed.has(i.id));
  }, [wsCtx?.indices]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketTicker"],
    queryFn: () => getMarketTicker(),
    refetchInterval: marketTickerRefetchMs(isConnected),
    staleTime: 3_000,
  });

  const tickerItems = useMemo(
    () => mergeIndexStripWithWs(data?.data ?? [], wsIndices, isConnected),
    [data?.data, wsIndices, isConnected]
  );

  if (isLoading) {
    return (
      <div className="market-ticker market-ticker--strip" aria-label="주요 시장 티커" aria-busy="true">
        <div className="inv-index-strip">
          <div className="inv-index-strip-btn skeleton" style={{ width: 168, minHeight: 118 }} />
          <div className="inv-index-strip-btn skeleton" style={{ width: 168, minHeight: 118 }} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="market-ticker market-ticker--error" aria-label="주요 시장 티커">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="market-ticker market-ticker--strip" aria-label="주요 시장 티커">
      <IndexQuoteStrip items={tickerItems} streamConnected={isConnected} />
    </div>
  );
}
