"use client";

import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { getStockHistory } from "@/services/chartApi";
import MarketPageShell from "@/components/market/MarketPageShell";
import MarketsSplitLayout from "@/components/market/MarketsSplitLayout";
import ResearchSidebar from "@/components/layout/ResearchSidebar";
import ChartPanel from "@/components/chart/ChartPanel";
import LoadingState from "@/components/common/LoadingState";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import InvestingEquityInstrumentHeader from "@/components/quote/InvestingEquityInstrumentHeader";
import InvestingEquityPageTabs from "@/components/quote/InvestingEquityPageTabs";
import InvestingEquityInsightsPanel from "@/components/quote/InvestingEquityInsightsPanel";
type QuotePageContentProps = {
  market: "korea" | "us";
  symbol: string;
};

function EquityQuotePageContent({
  symbol,
  market,
}: {
  symbol: string;
  market: "korea" | "us";
}) {
  const { quotes, ticks, flash, isConnected } = useLiveSymbols([symbol]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quote", market, symbol],
    queryFn: async () => {
      const res =
        market === "korea"
          ? await stockApi.getKoreaStockDetail(symbol)
          : await stockApi.getUSStockDetail(symbol);
      return res.data;
    },
    refetchInterval: isConnected ? 1_500 : 8_000,
    staleTime: 0,
  });

  const { data: hist1y } = useQuery({
    queryKey: ["quote52w", market, symbol],
    queryFn: () => getStockHistory({ symbol, market, period: "1y" }),
    staleTime: 120_000,
  });

  const decimals = market === "korea" ? 0 : 2;
  const marketLabel = market === "korea" ? "한국 주식" : "미국 주식";
  const boardHref = market === "korea" ? "/korea" : "/us";

  const live = quotes[symbol];
  const tick = ticks[symbol];
  const quoteView = useMemo(() => {
    if (!data) return null;
    const merged = mergeLiveStockQuote(
      {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        previousClose: data.previousClose,
        volume: data.volume,
      },
      live,
      tick
    );
    return { ...data, ...merged };
  }, [data, live, tick]);

  const priceFlash = flash[symbol];
  const week52Low = hist1y?.summary?.low;
  const week52High = hist1y?.summary?.high;

  return (
    <MarketPageShell
      compactHead
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "시장", href: "/markets" },
        { label: marketLabel, href: boardHref },
        { label: data?.name ?? symbol },
      ]}
      title=""
      description=""
    >
      {isLoading && <LoadingState rows={4} />}
      {isError && (
        <p className="inv-page-desc">종목을 불러오지 못했습니다. 심볼을 확인해주세요.</p>
      )}
      {quoteView && (
        <div className="inv-equity-page" id="overview">
          <InvestingEquityInstrumentHeader
            name={quoteView.name}
            symbol={symbol}
            market={market}
            price={quoteView.price}
            change={quoteView.change}
            changePercent={quoteView.changePercent}
            open={quoteView.open ?? quoteView.price}
            high={quoteView.high ?? quoteView.price}
            low={quoteView.low ?? quoteView.price}
            previousClose={quoteView.previousClose ?? quoteView.price - quoteView.change}
            volume={quoteView.volume ?? 0}
            priceDecimals={decimals}
            priceFlash={priceFlash}
            exchangeLabel={
              market === "korea"
                ? "market" in quoteView
                  ? String(quoteView.market)
                  : "KOSPI"
                : "exchange" in quoteView
                  ? String(quoteView.exchange)
                  : "NASDAQ"
            }
            isLive={isConnected}
            week52Low={week52Low}
            week52High={week52High}
          />

          <InvestingEquityPageTabs />

          <MarketsSplitLayout
            showToolRail
            main={
              <div className="inv-equity-page-main">
                <Suspense fallback={<LoadingState rows={3} />}>
                  <ChartPanel
                    investingEmbed
                    investingEquityPage
                    initialSymbol={symbol}
                    initialMarket={market}
                  />
                </Suspense>
              </div>
            }
            sidebar={
              <div className="inv-sidebar-stack">
                <InvestingEquityInsightsPanel
                  symbol={symbol}
                  market={market}
                  changePercent={quoteView.changePercent}
                  currentPrice={quoteView.price}
                />
                <ResearchSidebar market={market} showIndicesWidget showWatchlist />
              </div>
            }
          />
        </div>
      )}
    </MarketPageShell>
  );
}

export default function QuotePageContent({ market, symbol }: QuotePageContentProps) {
  return <EquityQuotePageContent symbol={symbol} market={market} />;
}
