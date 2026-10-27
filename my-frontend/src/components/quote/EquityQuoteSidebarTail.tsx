"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { stockApi } from "@/lib/api";
import {
  koreaToEquity,
  resolveLiveEquityQuoteFromMaps,
  usToEquity,
} from "@/lib/equityQuotes";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { seedMarketIndexCatalog } from "@/services/marketApi";
import AppLink from "@/components/common/AppLink";
import type { MarketIndexQuote } from "@/types/stock";

type Props = {
  symbol: string;
  market: "korea" | "us";
  quoteName?: string;
  changePercent: number;
  currentPrice: number;
};

export default function EquityQuoteSidebarTail({
  symbol,
  market,
  quoteName,
  changePercent,
  currentPrice,
}: Props) {
  const ws = useMarketWebSocketContext();
  const decimals = market === "korea" ? 0 : 2;

  const { data: koreaList } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    enabled: market === "korea",
    staleTime: 30_000,
  });
  const { data: usList } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    enabled: market === "us",
    staleTime: 30_000,
  });

  const self =
    market === "korea"
      ? koreaList?.find((s) => s.symbol === symbol)
      : usList?.find((s) => s.symbol === symbol);
  const sector = self?.sector?.trim();

  const gainers = useMemo(() => {
    const rows =
      market === "korea"
        ? (koreaList ?? []).map(koreaToEquity)
        : (usList ?? []).map(usToEquity);
    return [...rows]
      .sort((a, b) => b.changePercent - a.changePercent || b.volume - a.volume)
      .slice(0, 5);
  }, [koreaList, usList, market]);

  const peerEquities = useMemo(() => {
    if (!sector) return [];
    if (market === "korea") {
      return (koreaList ?? [])
        .filter((s) => s.symbol !== symbol && s.sector === sector)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 4)
        .map(koreaToEquity);
    }
    return (usList ?? [])
      .filter((s) => s.symbol !== symbol && s.sector === sector)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 4)
      .map(usToEquity);
  }, [koreaList, usList, market, sector, symbol]);

  const tailSymbols = useMemo(() => {
    const set = new Set<string>([symbol]);
    for (const g of gainers) set.add(g.symbol);
    for (const p of peerEquities) set.add(p.symbol);
    return Array.from(set);
  }, [gainers, peerEquities, symbol]);

  const { quotes, ticks } = useLiveSymbols(tailSymbols);

  const indexItems = useMemo(() => {
    const map = new Map<string, MarketIndexQuote>();
    for (const row of seedMarketIndexCatalog()) {
      map.set(row.id, row);
    }
    for (const row of ws?.indices ?? []) {
      if (ALL_WS_INDEX_IDS.includes(row.id)) map.set(row.id, row);
    }
    const prefer =
      market === "korea"
        ? ["kospi", "kosdaq", "kospi200", "kr_won"]
        : ["sp500", "nasdaq", "dow", "vix"];
    return prefer.map((id) => map.get(id)).filter((x): x is MarketIndexQuote => Boolean(x));
  }, [market, ws?.indices]);

  return (
    <div className="inv-equity-quote-sidebar-tail">
      <section className="inv-widget inv-equity-sidebar-tail-snapshot">
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">
            {quoteName ?? symbol}
            <LiveStreamBadge
              connected={ws?.isConnected ?? false}
              showOffline
              className="inv-live-badge--inline"
            />
          </h3>
        </header>
        <div className="inv-equity-sidebar-tail-snapshot-body">
          <p className="inv-equity-sidebar-tail-price tabular">
            {formatPrice(currentPrice, decimals)}
          </p>
          <p className={`inv-equity-sidebar-tail-chg tabular ${priceClass(changePercent)}`}>
            {formatPercent(changePercent)}
          </p>
        </div>
      </section>

      {indexItems.length > 0 && (
        <section className="inv-widget">
          <header className="inv-widget-head">
            <h3 className="inv-widget-title">관련 지수</h3>
            <Link href="/markets" className="inv-widget-more">
              시장
            </Link>
          </header>
          <ul className="inv-equity-sidebar-tail-index-list">
            {indexItems.map((idx) => (
              <li key={idx.id}>
                <AppLink href={`/markets/indices/${idx.id}`} className="inv-equity-sidebar-tail-index-row">
                  <span className="inv-equity-sidebar-tail-index-name">{idx.name}</span>
                  <span className={`tabular ${priceClass(idx.changePercent)}`}>
                    {formatPercent(idx.changePercent)}
                  </span>
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="inv-widget">
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">오늘 상승 TOP</h3>
          <Link href={market === "korea" ? "/korea" : "/us"} className="inv-widget-more">
            더보기
          </Link>
        </header>
        {gainers.length === 0 ? (
          <p className="inv-widget-empty">목록을 불러오는 중…</p>
        ) : (
          <ul className="inv-widget-list">
            {gainers.map((row) => {
              const live = resolveLiveEquityQuoteFromMaps(row, quotes, ticks);
              const d = market === "korea" ? 0 : 2;
              return (
                <li key={row.symbol}>
                  <Link href={`/quote/${market}/${row.symbol}`} className="inv-widget-row">
                    <StockNameWithLogo
                      market={market}
                      symbol={row.symbol}
                      name={row.name}
                      size={20}
                      className="inv-widget-name inv-widget-name--with-logo"
                      nameClassName="inv-widget-name-text"
                    />
                    <span className="inv-widget-right">
                      <span className="tabular">{formatPrice(live.price, d)}</span>
                      <span className={`tabular ${priceClass(live.changePercent)}`}>
                        {formatPercent(live.changePercent)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {peerEquities.length > 0 && (
        <section className="inv-widget">
          <header className="inv-widget-head">
            <h3 className="inv-widget-title">{sector ? `同업종 · ${sector}` : "同업종"}</h3>
          </header>
          <ul className="inv-widget-list">
            {peerEquities.map((eq) => {
              const live = resolveLiveEquityQuoteFromMaps(eq, quotes, ticks);
              const d = market === "korea" ? 0 : 2;
              return (
                <li key={eq.symbol}>
                  <Link href={`/quote/${market}/${eq.symbol}`} className="inv-widget-row">
                    <StockNameWithLogo
                      market={market}
                      symbol={eq.symbol}
                      name={eq.name}
                      size={20}
                      className="inv-widget-name inv-widget-name--with-logo"
                      nameClassName="inv-widget-name-text"
                    />
                    <span className="inv-widget-right">
                      <span className="tabular">{formatPrice(live.price, d)}</span>
                      <span className={`tabular ${priceClass(live.changePercent)}`}>
                        {formatPercent(live.changePercent)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="inv-widget inv-equity-sidebar-tail-hint">
        <p className="text-muted-sm">
          차트·재무·뉴스는 본문 탭을, 지수·랭킹·인사이트는 아래 「더보기」를 사용하세요.
        </p>
      </section>
    </div>
  );
}
