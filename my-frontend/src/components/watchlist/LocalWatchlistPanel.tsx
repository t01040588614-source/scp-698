"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { stockApi } from "@/lib/api";
import type { WatchlistEntry } from "@/lib/localWatchlist";
import { loadWatchlistForUi } from "@/lib/watchlistFacade";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { mergeLiveStockPrice } from "@/lib/liveQuoteMerge";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import { pickWsQuote } from "@/lib/wsSymbolKey";
import { addPriceAlert, inferDirection } from "@/lib/priceAlerts";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { buildLoginHref } from "@/lib/authNavigation";

export default function LocalWatchlistPanel() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    const sync = () => {
      void loadWatchlistForUi().then(setItems);
    };
    sync();
    window.addEventListener("local-watchlist-changed", sync);
    return () => window.removeEventListener("local-watchlist-changed", sync);
  }, [isAuthenticated]);

  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const needsKorea = items.some((i) => i.market === "korea");
  const needsUs = items.some((i) => i.market === "us");

  const { data: koreaStocks } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    enabled: needsKorea && items.length > 0,
  });
  const { data: usStocks } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    enabled: needsUs && items.length > 0,
  });

  const { quotes, flash, isConnected } = useLiveSymbols(symbols);

  const quoteByKey = useMemo(() => {
    const map = new Map<string, { price: number; changePercent: number }>();
    for (const s of koreaStocks ?? []) {
      const live = pickWsQuote(s.symbol, quotes);
      const merged = mergeLiveStockPrice(
        s.price,
        s.change,
        s.changePercent,
        s.previousClose,
        live
      );
      map.set(`korea-${s.symbol}`, {
        price: merged.price,
        changePercent: merged.changePercent,
      });
    }
    for (const s of usStocks ?? []) {
      const live = pickWsQuote(s.symbol, quotes);
      const merged = mergeLiveStockPrice(
        s.price,
        s.change,
        s.changePercent,
        s.previousClose,
        live
      );
      map.set(`us-${s.symbol}`, {
        price: merged.price,
        changePercent: merged.changePercent,
      });
    }
    for (const item of items) {
      const live = pickWsQuote(item.symbol, quotes);
      if (live !== undefined && !map.has(`${item.market}-${item.symbol}`)) {
        map.set(`${item.market}-${item.symbol}`, { price: live, changePercent: 0 });
      }
    }
    return map;
  }, [koreaStocks, usStocks, items, quotes]);

  const onQuickAlert = (item: WatchlistEntry, currentPrice?: number) => {
    const raw = window.prompt(
      `${item.name} 알림 가격`,
      currentPrice != null ? String(Math.round(currentPrice)) : ""
    );
    if (!raw) return;
    const targetPrice = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return;
    addPriceAlert({
      symbol: item.symbol,
      market: item.market,
      name: item.name,
      targetPrice,
      direction: inferDirection(currentPrice ?? targetPrice, targetPrice),
    });
  };

  const title = "관심종목";

  if (!isAuthenticated) {
    return (
      <section className="inv-widget">
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">{title}</h3>
          <Link href="/watchlist" className="inv-widget-more">
            관리
          </Link>
        </header>
        <p className="inv-widget-empty mb-3">로그인하면 관심종목을 계정에 저장할 수 있습니다.</p>
        <button
          type="button"
          className="btn-primary text-sm px-4 py-2"
          onClick={() => {
            window.location.href = buildLoginHref(
              typeof window !== "undefined" ? window.location.pathname : "/watchlist",
            );
          }}
        >
          로그인
        </button>
      </section>
    );
  }

  return (
    <section className="inv-widget">
      <header className="inv-widget-head">
        <h3 className="inv-widget-title">
          {title}
          <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
        </h3>
        <Link href="/watchlist" className="inv-widget-more">
          관리
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="inv-widget-empty">표에서 ★를 눌러 추가하세요.</p>
      ) : (
        <ul className="inv-widget-list">
          {items.slice(0, 8).map((item) => {
            const q = quoteByKey.get(`${item.market}-${item.symbol}`);
            const decimals = item.market === "korea" ? 0 : 2;
            const flashDir = flash[item.symbol];
            return (
              <li key={`${item.market}-${item.symbol}`} className="inv-widget-row-wrap">
                <Link href={`/quote/${item.market}/${item.symbol}`} className="inv-widget-row">
                  <StockNameWithLogo
                    market={item.market}
                    symbol={item.symbol}
                    name={item.name}
                    size={20}
                    className="inv-widget-name inv-widget-name--with-logo"
                    nameClassName="inv-widget-name-text"
                  />
                  <span className="inv-widget-right">
                    <span
                      className={`tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
                    >
                      {q ? formatPrice(q.price, decimals) : "—"}
                    </span>
                    {q && (
                      <span className={`tabular ${priceClass(q.changePercent)}`}>
                        {formatPercent(q.changePercent)}
                      </span>
                    )}
                    <span className="inv-code tabular">{item.symbol}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="inv-widget-alert-btn"
                  title="가격 알림"
                  aria-label={`${item.name} 가격 알림`}
                  onClick={() => onQuickAlert(item, q?.price)}
                >
                  🔔
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
