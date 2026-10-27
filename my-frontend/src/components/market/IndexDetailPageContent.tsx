"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLink from "@/components/common/AppLink";
import IndexInvestingChart from "@/components/chart/IndexInvestingChart";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import LoadingState from "@/components/common/LoadingState";
import { fetchMarketIndicesResilient } from "@/services/marketApi";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
} from "@/lib/format";
import type { MarketIndexQuote } from "@/types/stock";

type IndexDetailPageContentProps = {
  indexId: string;
};

function mergeQuote(base: MarketIndexQuote, live?: MarketIndexQuote): MarketIndexQuote {
  if (!live || live.price <= 0) return base;
  return { ...base, ...live };
}

export default function IndexDetailPageContent({ indexId }: IndexDetailPageContentProps) {
  const { data: indicesPayload, isLoading: listLoading } = useQuery({
    queryKey: ["marketHubIndices"],
    queryFn: () => fetchMarketIndicesResilient(),
    staleTime: 8_000,
  });

  const { indices: wsIndices, isConnected } = useMarketWebSocket([], ALL_WS_INDEX_IDS);

  const quote = useMemo(() => {
    const fromApi = indicesPayload?.rows.find((r) => r.id === indexId);
    const fromWs = wsIndices.find((r) => r.id === indexId);
    const base = fromApi ?? seedHubIndexQuote(indexId);
    return mergeQuote(base, fromWs);
  }, [indexId, indicesPayload?.rows, wsIndices]);

  const flash = usePriceFlash({ [indexId]: quote.price });
  const flashDir = flash[indexId];
  const chgClass = priceClass(quote.change);
  const changeDecimals = quote.price > 1000 ? 2 : quote.price > 10 ? 2 : 4;

  if (listLoading && quote.price <= 0) {
    return <LoadingState rows={4} />;
  }

  return (
    <article className="inv-index-detail">
      <header className="inv-index-detail-head">
        <div className="inv-index-detail-title-row">
          <h2 className="inv-index-detail-title">{quote.name}</h2>
          <LiveStreamBadge connected={isConnected} className="inv-live-badge--inline" />
        </div>
        <p className="inv-index-detail-meta">
          {quote.category === "forex"
            ? "외환"
            : quote.category === "commodity"
              ? "원자재"
              : "지수"}{" "}
          · {quote.country}
        </p>
        <div className="inv-index-detail-quote tabular">
          <span
            className={`inv-index-detail-price${flashDir ? ` is-flash-${flashDir}` : ""}`}
          >
            {formatIndexPrice(indexId, quote.price)}
          </span>
          <span className={`inv-index-detail-chg ${chgClass}`}>
            <span aria-hidden>{directionSymbol(quote.change)} </span>
            {formatChange(quote.change, changeDecimals)} ({formatPercent(quote.changePercent)})
          </span>
        </div>
        <AppLink href="/markets?tab=indices" className="inv-index-detail-back">
          ← 전체 지수 목록
        </AppLink>
      </header>

      <div className="inv-index-detail-chart">
        <IndexInvestingChart
          indexId={indexId}
          indexName={quote.name}
          category={quote.category}
          country={quote.country}
          livePrice={quote.price}
          liveChange={quote.change}
          streamConnected={isConnected}
        />
      </div>
    </article>
  );
}
