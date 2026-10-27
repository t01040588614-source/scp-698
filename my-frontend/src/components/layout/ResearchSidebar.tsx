"use client";

import MarketSidebarWidgets from "@/components/market/MarketSidebarWidgets";
import LocalWatchlistPanel from "@/components/watchlist/LocalWatchlistPanel";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";

export type ResearchSidebarOptions = {
  market?: "korea" | "us";
  showRankings?: boolean;
  showNews?: boolean;
  showCalendar?: boolean;
  showWatchlist?: boolean;
  /** false면 지수 차트 위젯 숨김 (/markets 본문과 중복 방지) */
  showIndicesWidget?: boolean;
  /** 종목 상세 등 — 지수·랭킹 위주의 짧은 사이드 */
  compactSidebar?: boolean;
};

export default function ResearchSidebar({
  market = "korea",
  showRankings = true,
  showNews = true,
  showCalendar = true,
  showWatchlist = true,
  showIndicesWidget = true,
  compactSidebar = false,
}: ResearchSidebarOptions) {
  const indexIds = showIndicesWidget ? ALL_WS_INDEX_IDS : [];
  const { indices: wsIndices, isConnected } = useMarketWebSocket([], indexIds);

  return (
    <>
      {showWatchlist && <LocalWatchlistPanel />}
      <MarketSidebarWidgets
        market={market}
        showRankings={showRankings}
        showNews={showNews}
        showCalendar={showCalendar}
        showIndicesWidget={showIndicesWidget}
        liveIndices={wsIndices}
        indicesStreamConnected={isConnected}
        subscribeIndexIds={indexIds}
        compactSidebar={compactSidebar}
      />
    </>
  );
}
