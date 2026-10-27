"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import {
  formatEquityMarketCap,
  koreaToEquity,
  resolveLiveEquityQuoteFromMaps,
  usToEquity,
  type EquityQuote,
} from "@/lib/equityQuotes";
import {
  fundamentalsCoverage,
  rowsForMarketCapRank,
  sortRankHint,
} from "@/lib/fundamentalsDisplay";
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
  /** 종목 상세 사이드 — 지수·랭킹만 간략히 */
  compactSidebar?: boolean;
};

function WidgetList({
  title,
  rows,
  href,
  market,
  liveQuotes,
  liveTicks,
  flash,
  subtitle,
  showMarketCap,
}: {
  title: string;
  rows: EquityQuote[];
  href: string;
  market: "korea" | "us";
  liveQuotes: Record<string, number>;
  liveTicks: Record<string, import("@/lib/wsNormalize").LiveStockTick>;
  flash: Record<string, "up" | "down">;
  subtitle?: string | null;
  showMarketCap?: boolean;
}) {
  const decimals = market === "korea" ? 0 : 2;
  const [listRef] = useSmoothReorder(360);
  return (
    <section className="inv-widget">
      <header className="inv-widget-head">
        <div className="inv-widget-head-text">
          <h3 className="inv-widget-title">{title}</h3>
          {subtitle ? <p className="inv-widget-subtitle">{subtitle}</p> : null}
        </div>
        <Link href={href} className="inv-widget-more">
          더보기
        </Link>
      </header>
      <ul ref={listRef} className="inv-widget-list inv-smooth-rank">
        {rows.map((r) => {
          const merged = resolveLiveEquityQuoteFromMaps(r, liveQuotes, liveTicks);
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
                  {showMarketCap && (r.marketCap ?? 0) > 0 ? (
                    <span className="inv-widget-mcap tabular" title="시가총액">
                      {formatEquityMarketCap(r.marketCap, r.currency)}
                    </span>
                  ) : null}
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
  compactSidebar = false,
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
      resolveLiveEquityQuoteFromMaps(r, rankingQuotes, rankingTicks),
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
        .slice(0, compactSidebar ? 4 : 5),
    [rows, liveMetric, compactSidebar]
  );
  const losers = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            liveMetric(a).changePercent - liveMetric(b).changePercent ||
            liveMetric(b).volume - liveMetric(a).volume
        )
        .slice(0, compactSidebar ? 4 : 5),
    [rows, liveMetric, compactSidebar]
  );
  const active = useMemo(
    () =>
      [...rows]
        .sort((a, b) => liveMetric(b).volume - liveMetric(a).volume)
        .slice(0, compactSidebar ? 4 : 5),
    [rows, liveMetric, compactSidebar]
  );
  const byMcap = useMemo(() => rowsForMarketCapRank(rows), [rows]);

  const fundamentalsCov = useMemo(() => fundamentalsCoverage(rows), [rows]);
  const mcapRankHint = useMemo(
    () => sortRankHint("marketCap", fundamentalsCov),
    [fundamentalsCov]
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
          compact={compactSidebar}
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
          {!compactSidebar ? (
            <>
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
                subtitle={mcapRankHint}
                showMarketCap
              />
            </>
          ) : (
            <>
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
                subtitle={mcapRankHint}
                showMarketCap
              />
            </>
          )}
        </>
      )}
      {showNews && (
        <section
          className={`inv-widget inv-widget--stack${compactSidebar ? " inv-widget--stack-compact" : ""}`}
        >
          <NewsList compact />
        </section>
      )}
      {showCalendar && (
        <section
          className={`inv-widget inv-widget--stack${compactSidebar ? " inv-widget--stack-compact" : ""}`}
        >
          <EconomicCalendar compact defaultCountry={market === "us" ? "US" : "ALL"} />
        </section>
      )}
    </>
  );
}
