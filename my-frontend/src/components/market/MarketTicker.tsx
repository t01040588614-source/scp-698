"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketTicker } from "@/services/marketApi";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { mapApiIndexToTicker } from "@/lib/marketFromStocks";
import {
  directionSymbol,
  formatChange,
  formatPercent,
  formatPrice,
  priceClass,
  statusLabel,
} from "@/lib/format";
import ErrorState from "@/components/common/ErrorState";
import { getMarketTone } from "@/lib/marketTone";
import { marketTickerRefetchMs } from "@/lib/marketRefreshIntervals";

export default function MarketTicker() {
  const { indices: wsIndices, isConnected } = useMarketWebSocket([], ALL_WS_INDEX_IDS);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketTicker"],
    queryFn: () => getMarketTicker(),
    refetchInterval: marketTickerRefetchMs(isConnected),
    staleTime: 3_000,
  });

  const tickerItems = useMemo(() => {
    const base = data?.data ?? [];
    if (!wsIndices.length) return base;
    const merged = new Map(base.map((t) => [t.id, t]));
    for (const i of wsIndices) {
      merged.set(i.id, mapApiIndexToTicker(i));
    }
    return Array.from(merged.values());
  }, [data?.data, wsIndices]);

  if (isLoading) {
    return (
      <div className="market-ticker" aria-label="시장 티커 로딩">
        <div className="ticker-item skeleton" style={{ minWidth: 168, minHeight: 96 }} />
        <div className="ticker-item skeleton" style={{ minWidth: 168, minHeight: 96 }} />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <div className="market-ticker" aria-label="주요 시장 티커">
      {tickerItems.map((item) => {
        const tone = getMarketTone(item.id, item.name);
        const live = item.status !== "closed";
        return (
          <article key={item.id} className={`ticker-item ticker-item--${tone}`}>
            <div className="ticker-item-head">
              <span className="ticker-name">{item.name}</span>
              <span className={`ticker-live-pill${live ? " is-live" : ""}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <span className="ticker-price tabular">{formatPrice(item.price)}</span>
            <div className={`ticker-foot tabular ${priceClass(item.change)}`}>
              <span className="ticker-delta">
                {directionSymbol(item.change)} {formatChange(item.change)}
              </span>
              <span className="ticker-pct">{formatPercent(item.changeRate)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
