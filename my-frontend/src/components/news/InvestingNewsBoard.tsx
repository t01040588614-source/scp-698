"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import IndexQuoteStrip from "@/components/market/IndexQuoteStrip";
import InvestingNewsFeed from "@/components/news/InvestingNewsFeed";
import { getMarketIndicesForBoard } from "@/services/marketApi";
import { buildBoardIndexStripItems } from "@/lib/marketFromStocks";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";

/** kr.investing.com/equities/south-korea — 지수 스트립 + 뉴스 목록 (사이드는 InvestingPageLayout) */
export default function InvestingNewsBoard() {
  const { indices: wsIndices, isConnected } = useMarketWebSocket([], ALL_WS_INDEX_IDS);

  const { data: indexPayload } = useQuery({
    queryKey: ["boardIndices", "korea"],
    queryFn: () => getMarketIndicesForBoard("korea"),
    refetchInterval: 25_000,
    staleTime: 12_000,
  });

  const indexItems = useMemo(
    () => buildBoardIndexStripItems("korea", indexPayload?.data, wsIndices),
    [indexPayload?.data, wsIndices]
  );

  return (
    <div className="inv-equities-page inv-market-board">
      <div className="inv-market-board-top">
        <IndexQuoteStrip items={indexItems} streamConnected={isConnected} />
      </div>
      <InvestingNewsFeed />
    </div>
  );
}
