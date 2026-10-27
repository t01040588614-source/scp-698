"use client";

import { useEffect, useState } from "react";
import ResearchSidebar from "@/components/layout/ResearchSidebar";
import LocalWatchlistPanel from "@/components/watchlist/LocalWatchlistPanel";
import InvestingEquityInsightsPanel from "@/components/quote/InvestingEquityInsightsPanel";
import InvestingEquitySidebar from "@/components/quote/InvestingEquitySidebar";
import EquityQuoteSidebarExtras from "@/components/quote/EquityQuoteSidebarExtras";
import EquityQuoteSidebarBottom from "@/components/quote/EquityQuoteSidebarBottom";
import EquityQuoteSidebarTail from "@/components/quote/EquityQuoteSidebarTail";
import ChartMajorStatistics from "@/components/chart/ChartMajorStatistics";
type Props = {
  symbol: string;
  market: "korea" | "us";
  changePercent: number;
  currentPrice: number;
  quoteName?: string;
  liveVolume?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
};

/** 종목 상세 우측 — 시장 위젯 + 인사이트 + 트렌딩 (토스형 밀도) */
export default function EquityQuoteSidebarColumn({
  symbol,
  market,
  changePercent,
  currentPrice,
  quoteName,
  liveVolume,
  open,
  high,
  low,
  previousClose,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setMoreOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="inv-equity-quote-sidebar">
      <LocalWatchlistPanel />
      <EquityQuoteSidebarBottom
        symbol={symbol}
        market={market}
        quoteName={quoteName}
        currentPrice={currentPrice}
      />
      <EquityQuoteSidebarTail
        symbol={symbol}
        market={market}
        quoteName={quoteName}
        changePercent={changePercent}
        currentPrice={currentPrice}
      />
      <ChartMajorStatistics
        symbol={symbol}
        market={market}
        liveVolume={liveVolume}
        sidebar
      />
      <details
        className="inv-equity-quote-sidebar-more"
        open={moreOpen}
        onToggle={(e) => setMoreOpen(e.currentTarget.open)}
      >
        <summary className="inv-equity-quote-sidebar-more-summary">
          {moreOpen ? "시장·인사이트·랭킹 접기" : "시장·인사이트·랭킹 더보기"}
        </summary>
        <div className="inv-equity-quote-sidebar-more-body">
          <InvestingEquityInsightsPanel
            compact
            symbol={symbol}
            market={market}
            changePercent={changePercent}
            currentPrice={currentPrice}
          />
          <EquityQuoteSidebarExtras
            symbol={symbol}
            market={market}
            quoteName={quoteName}
            currentPrice={currentPrice}
            changePercent={changePercent}
            open={open}
            high={high}
            low={low}
            previousClose={previousClose}
            volume={liveVolume}
          />
          <ResearchSidebar
            market={market}
            showIndicesWidget
            showWatchlist={false}
            compactSidebar
            showNews
            showCalendar
          />
          <InvestingEquitySidebar symbol={symbol} market={market} />
        </div>
      </details>
    </div>
  );
}
