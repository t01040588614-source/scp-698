"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import {
  koreaToEquity,
  resolveLiveEquityQuote,
  usToEquity,
  type EquityQuote,
} from "@/lib/equityQuotes";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import {
  cacheStatusRefetchMs,
  stocksListRefetchMs,
} from "@/lib/marketRefreshIntervals";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import NewsList from "@/components/news/NewsList";
import EconomicCalendar from "@/components/calendar/EconomicCalendar";
import SidebarIndicesWidget from "@/components/market/SidebarIndicesWidget";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { useSmoothReorder } from "@/hooks/useSmoothReorder";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";

import type { MarketIndexQuote } from "@/types/stock";

type MarketSidebarWidgetsProps = {
  market?: "korea" | "us";
  showRankings?: boolean;
  showNews?: boolean;
  showCalendar?: boolean;
  showIndicesWidget?: boolean;
  liveIndices?: MarketIndexQuote[];
  indicesStreamConnected?: boolean;
  subscribeIndexIds?: string[];
};

function WidgetList({
  title,
  rows,
  href,
  market,
  liveQuotes,
  liveTicks,
  flash,
}: {
  title: string;
  rows: EquityQuote[];
  href: string;
  market: "korea" | "us";
  liveQuotes: Record<string, number>;
  liveTicks: Record<string, import("@/lib/wsNormalize").LiveStockTick>;
  flash: Record<string, "up" | "down">;
}) {
  const decimals = market === "korea" ? 0 : 2;
  const [listRef] = useSmoothReorder(360);
  return (
    <section className="inv-widget">
      <header className="inv-widget-head">
        <h3 className="inv-widget-title">{title}</h3>
        <Link href={href} className="inv-widget-more">
          더보기
        </Link>
      </header>
      <ul ref={listRef} className="inv-widget-list inv-smooth-rank">
        {rows.map((r) => {
          const merged = resolveLiveEquityQuote(r, liveQuotes[r.symbol], liveTicks[r.symbol]);
          const flashDir = flash[r.symbol];
          return (
            <li key={r.symbol}>
              <Link href={`/quote/${market}/${r.symbol}`} className="inv-widget-row">
                <StockNameWithLogo
                  market={market}
                  symbol={r.symbol}
                  name={r.name}
                  size={20}
                  className="inv-widget-name inv-widget-name--with-logo"
                  nameClassName="inv-widget-name-text"
                />
                <span className="inv-widget-right">
                  <span className={`tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}>
                    {formatPrice(merged.price, decimals)}
                  </span>
                  <span className={`tabular ${priceClass(merged.changePercent)}`}>
                    {formatPercent(merged.changePercent)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function MarketSidebarWidgets({
  market = "korea",
  showRankings = true,
  showNews = true,
  showCalendar = true,
  showIndicesWidget = true,
  liveIndices,
  indicesStreamConnected,
  subscribeIndexIds,
}: MarketSidebarWidgetsProps) {
  const wsCtx = useMarketWebSocketContext();
  const streamConnected = wsCtx?.isConnected ?? false;

  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    staleTime: 2_000,
    refetchInterval: (query) => {
      const regular = Boolean(
        query.state.data?.krMarketOpen || query.state.data?.usMarketOpen
      );
      return cacheStatusRefetchMs(streamConnected, regular);
    },
  });
  const regularSession = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);

  const { data: korea } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    enabled: market === "korea",
    refetchInterval:
      market === "korea" ? stocksListRefetchMs(streamConnected, false, regularSession) : false,
    staleTime: 2_000,
  });
  const { data: us } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    enabled: market === "us",
    refetchInterval:
      market === "us" ? stocksListRefetchMs(streamConnected, false, regularSession) : false,
    staleTime: 2_000,
  });

  const rows = useMemo(() => {
    if (market === "us") return (us ?? []).map(usToEquity);
    return (korea ?? []).map(koreaToEquity);
  }, [market, korea, us]);

  const listSymbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const { quotes: rankingQuotes, ticks: rankingTicks, flash: rankingFlash } =
    useLiveSymbols(listSymbols);

  const liveMetric = useCallback(
    (r: EquityQuote) =>
      resolveLiveEquityQuote(r, rankingQuotes[r.symbol], rankingTicks[r.symbol]),
    [rankingQuotes, rankingTicks]
  );

  const gainers = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            liveMetric(b).changePercent - liveMetric(a).changePercent ||
            liveMetric(b).volume - liveMetric(a).volume
        )
        .slice(0, 5),
    [rows, liveMetric]
  );
  const losers = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            liveMetric(a).changePercent - liveMetric(b).changePercent ||
            liveMetric(b).volume - liveMetric(a).volume
        )
        .slice(0, 5),
    [rows, liveMetric]
  );
  const active = useMemo(
    () =>
      [...rows]
        .sort((a, b) => liveMetric(b).volume - liveMetric(a).volume)
        .slice(0, 5),
    [rows, liveMetric]
  );
  const byMcap = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            (b.marketCap ?? 0) - (a.marketCap ?? 0) ||
            liveMetric(b).volume - liveMetric(a).volume
        )
        .slice(0, 5),
    [rows, liveMetric]
  );

  const listHref = market === "us" ? "/us" : "/korea";

  return (
    <>
      {showIndicesWidget && (
        <SidebarIndicesWidget
          market={market}
          liveIndices={liveIndices}
          indicesStreamConnected={indicesStreamConnected}
          subscribeIndexIds={subscribeIndexIds}
        />
      )}
      {showRankings && (
        <>
          <WidgetList
            title="상승률 TOP"
            rows={gainers}
            href={listHref}
            market={market}
            liveQuotes={rankingQuotes}
            liveTicks={rankingTicks}
            flash={rankingFlash}
          />
          <WidgetList
            title="하락률 TOP"
            rows={losers}
            href={listHref}
            market={market}
            liveQuotes={rankingQuotes}
            liveTicks={rankingTicks}
            flash={rankingFlash}
          />
          <WidgetList
            title="거래량 TOP"
            rows={active}
            href={listHref}
            market={market}
            liveQuotes={rankingQuotes}
            liveTicks={rankingTicks}
            flash={rankingFlash}
          />
          <WidgetList
            title="시가총액 TOP"
            rows={byMcap}
            href={listHref}
            market={market}
            liveQuotes={rankingQuotes}
            liveTicks={rankingTicks}
            flash={rankingFlash}
          />
        </>
      )}
      {showNews && (
        <section className="inv-widget inv-widget--stack">
          <NewsList compact />
        </section>
      )}
      {showCalendar && (
        <section className="inv-widget inv-widget--stack">
          <EconomicCalendar compact defaultCountry={market === "us" ? "US" : "ALL"} />
        </section>
      )}
    </>
  );
}
