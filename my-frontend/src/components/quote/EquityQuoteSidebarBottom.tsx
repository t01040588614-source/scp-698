"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import {
  addToCompareTray,
  isInCompareTray,
  readCompareTray,
  removeFromCompareTray,
} from "@/lib/equityCompareTray";
import {
  readEquityQuickNote,
  saveEquityQuickNote,
} from "@/lib/equityQuickNotes";
import {
  openMarketAiChat,
  buildSymbolTrendPrompt,
} from "@/lib/marketAiChatEvents";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import { readPriceAlerts } from "@/lib/priceAlerts";
import {
  readRecentEquityViews,
  type RecentEquityView,
} from "@/lib/recentEquityViews";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { pickWsQuote } from "@/lib/wsSymbolKey";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";

type Props = {
  symbol: string;
  market: "korea" | "us";
  quoteName?: string;
  currentPrice: number;
};

function WidgetShell({
  title,
  moreHref,
  moreLabel,
  children,
}: {
  title: string;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="inv-widget inv-equity-sidebar-bottom-widget">
      <header className="inv-widget-head">
        <h3 className="inv-widget-title">{title}</h3>
        {moreHref ? (
          <Link href={moreHref} className="inv-widget-more">
            {moreLabel ?? "더보기"}
          </Link>
        ) : null}
      </header>
      <div className="inv-equity-sidebar-bottom-body">{children}</div>
    </section>
  );
}

export default function EquityQuoteSidebarBottom({
  symbol,
  market,
  quoteName,
  currentPrice,
}: Props) {
  const name = quoteName ?? symbol;

  const [recent, setRecent] = useState<RecentEquityView[]>([]);
  const [alerts, setAlerts] = useState<ReturnType<typeof readPriceAlerts>>([]);
  const [compare, setCompare] = useState<ReturnType<typeof readCompareTray>>([]);
  const [note, setNote] = useState("");
  const [inTray, setInTray] = useState(false);

  const syncLocal = useCallback(() => {
    setRecent(readRecentEquityViews());
    setAlerts(readPriceAlerts());
    setCompare(readCompareTray());
    setInTray(isInCompareTray(market, symbol));
    setNote(readEquityQuickNote(market, symbol));
  }, [market, symbol]);

  useEffect(() => {
    syncLocal();
    const onRecent = () => setRecent(readRecentEquityViews());
    const onAlerts = () => setAlerts(readPriceAlerts());
    const onTray = () => {
      setCompare(readCompareTray());
      setInTray(isInCompareTray(market, symbol));
    };
    const onNotes = () => setNote(readEquityQuickNote(market, symbol));
    window.addEventListener("recent-equity-views-changed", onRecent);
    window.addEventListener("price-alerts-changed", onAlerts);
    window.addEventListener("equity-compare-tray-changed", onTray);
    window.addEventListener("equity-quick-notes-changed", onNotes);
    return () => {
      window.removeEventListener("recent-equity-views-changed", onRecent);
      window.removeEventListener("price-alerts-changed", onAlerts);
      window.removeEventListener("equity-compare-tray-changed", onTray);
      window.removeEventListener("equity-quick-notes-changed", onNotes);
    };
  }, [market, symbol, syncLocal]);

  const recentFiltered = useMemo(
    () => recent.filter((v) => !(v.market === market && v.symbol === symbol)).slice(0, 5),
    [recent, market, symbol]
  );

  const alertSymbols = useMemo(
    () =>
      alerts
        .filter((a) => a.enabled && !a.triggeredAt)
        .map((a) => a.symbol),
    [alerts]
  );
  const { quotes } = useLiveSymbols(alertSymbols);

  const symbolAlerts = alerts
    .filter((a) => a.enabled && !a.triggeredAt && a.market === market && a.symbol === symbol)
    .slice(0, 4);
  const otherAlerts = alerts
    .filter((a) => a.enabled && !a.triggeredAt && !(a.market === market && a.symbol === symbol))
    .slice(0, 3);

  const { data: koreaList } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: usList } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    staleTime: 60_000,
  });

  const quoteFor = (m: "korea" | "us", sym: string) => {
    const live = pickWsQuote(sym, quotes);
    const row =
      m === "korea"
        ? koreaList?.find((s) => s.symbol === sym)
        : usList?.find((s) => s.symbol === sym);
    if (row) {
      return {
        price: live ?? row.price,
        changePercent: row.changePercent,
      };
    }
    if (live != null) return { price: live, changePercent: 0 };
    return null;
  };

  const toggleTray = () => {
    if (inTray) {
      removeFromCompareTray(market, symbol);
    } else {
      addToCompareTray({ symbol, market, name });
    }
    setInTray(isInCompareTray(market, symbol));
    setCompare(readCompareTray());
  };

  const persistNote = () => {
    saveEquityQuickNote(market, symbol, note);
  };

  return (
    <div className="inv-equity-quote-sidebar-bottom">
      <WidgetShell title="빠른 실행">
        <div className="inv-equity-sidebar-bottom-actions">
          <button
            type="button"
            className="inv-equity-sidebar-bottom-action"
            onClick={() =>
              openMarketAiChat({
                symbol,
                market,
                message: buildSymbolTrendPrompt(symbol),
                autoSend: true,
              })
            }
          >
            AI 분석
          </button>
          <button
            type="button"
            className={`inv-equity-sidebar-bottom-action${inTray ? " is-active" : ""}`}
            onClick={toggleTray}
          >
            {inTray ? "비교함 ✓" : "비교함 담기"}
          </button>
          <Link
            href={`/charts?market=${market}&symbol=${symbol}`}
            className="inv-equity-sidebar-bottom-action inv-equity-sidebar-bottom-action--link"
          >
            차트 허브
          </Link>
          <Link
            href={`/analysis?symbol=${symbol}&market=${market}`}
            className="inv-equity-sidebar-bottom-action inv-equity-sidebar-bottom-action--link"
          >
            기술 분석
          </Link>
        </div>
      </WidgetShell>

      {compare.length > 0 && (
        <WidgetShell title="비교함" moreHref="/charts">
          <ul className="inv-widget-list">
            {compare.map((row) => {
              const q = quoteFor(row.market, row.symbol);
              const d = row.market === "korea" ? 0 : 2;
              return (
                <li key={`${row.market}-${row.symbol}`}>
                  <Link href={`/quote/${row.market}/${row.symbol}`} className="inv-widget-row">
                    <StockNameWithLogo
                      market={row.market}
                      symbol={row.symbol}
                      name={row.name ?? row.symbol}
                      size={20}
                      className="inv-widget-name inv-widget-name--with-logo"
                      nameClassName="inv-widget-name-text"
                    />
                    <span className="inv-widget-right">
                      {q ? (
                        <>
                          <span className="tabular">{formatPrice(q.price, d)}</span>
                          <span className={`tabular ${priceClass(q.changePercent)}`}>
                            {formatPercent(q.changePercent)}
                          </span>
                        </>
                      ) : (
                        <span className="inv-code tabular">{row.symbol}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </WidgetShell>
      )}

      {recentFiltered.length > 0 && (
        <WidgetShell title="최근 본 종목">
          <ul className="inv-widget-list">
            {recentFiltered.map((row) => {
              const q = quoteFor(row.market, row.symbol);
              const d = row.market === "korea" ? 0 : 2;
              return (
                <li key={`${row.market}-${row.symbol}-${row.viewedAt}`}>
                  <Link href={`/quote/${row.market}/${row.symbol}`} className="inv-widget-row">
                    <StockNameWithLogo
                      market={row.market}
                      symbol={row.symbol}
                      name={row.name ?? row.symbol}
                      size={20}
                      className="inv-widget-name inv-widget-name--with-logo"
                      nameClassName="inv-widget-name-text"
                    />
                    <span className="inv-widget-right">
                      {q ? (
                        <>
                          <span className="tabular">{formatPrice(q.price, d)}</span>
                          <span className={`tabular ${priceClass(q.changePercent)}`}>
                            {formatPercent(q.changePercent)}
                          </span>
                        </>
                      ) : (
                        <span className="inv-code tabular">{row.symbol}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </WidgetShell>
      )}

      {(symbolAlerts.length > 0 || otherAlerts.length > 0) && (
        <WidgetShell title="가격 알림" moreHref="/watchlist" moreLabel="관리">
          <ul className="inv-equity-sidebar-alert-list">
            {[...symbolAlerts, ...otherAlerts].map((a) => {
              const live =
                pickWsQuote(a.symbol, quotes) ??
                (a.symbol === symbol ? currentPrice : undefined);
              const d = a.market === "korea" ? 0 : 2;
              const dirLabel = a.direction === "above" ? "이상" : "이하";
              return (
                <li key={a.id}>
                  <Link href={`/quote/${a.market}/${a.symbol}`} className="inv-equity-sidebar-alert-row">
                    <span className="inv-equity-sidebar-alert-name">{a.name ?? a.symbol}</span>
                    <span className="inv-equity-sidebar-alert-target tabular">
                      {formatPrice(a.targetPrice, d)} {dirLabel}
                    </span>
                    {live != null && (
                      <span className="inv-equity-sidebar-alert-live tabular text-muted-sm">
                        현재 {formatPrice(live, d)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </WidgetShell>
      )}

      <WidgetShell title="종목 메모">
        <label className="inv-equity-sidebar-note-label">
          <span className="sr-only">{name} 메모</span>
          <textarea
            className="inv-equity-sidebar-note-input"
            rows={3}
            placeholder="매수 근거, 목표가, 체크리스트… (기기에만 저장)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={persistNote}
          />
        </label>
        <p className="inv-equity-sidebar-note-hint text-muted-sm">
          포커스를 벗어나면 자동 저장됩니다.
        </p>
      </WidgetShell>

      <WidgetShell title="시장 도구">
        <ul className="inv-equity-quote-link-list inv-equity-sidebar-bottom-links">
          <li>
            <Link href={market === "korea" ? "/korea" : "/us"}>
              {market === "korea" ? "한국" : "미국"} 스크리너
            </Link>
          </li>
          <li>
            <Link href="/stocks">전체 스크리너</Link>
          </li>
          <li>
            <Link href="/news">시장 뉴스</Link>
          </li>
          <li>
            <Link href="/portfolio">포트폴리오</Link>
          </li>
        </ul>
      </WidgetShell>
    </div>
  );
}
