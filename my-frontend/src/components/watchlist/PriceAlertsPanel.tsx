"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addPriceAlert,
  inferDirection,
  readPriceAlerts,
  removePriceAlert,
  type PriceAlert,
  type PriceAlertDirection,
} from "@/lib/priceAlerts";
import { loadWatchlistForUi } from "@/lib/watchlistFacade";
import { formatPrice } from "@/lib/format";
import { pickWsQuote } from "@/lib/wsSymbolKey";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

export default function PriceAlertsPanel() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState<"korea" | "us">("korea");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<PriceAlertDirection>("above");

  const [watchlist, setWatchlist] = useState<{ symbol: string; market: string; name: string }[]>([]);

  const sync = () => {
    setAlerts(readPriceAlerts());
    void loadWatchlistForUi().then(setWatchlist);
  };
  useEffect(() => {
    sync();
    window.addEventListener("price-alerts-changed", sync);
    window.addEventListener("local-watchlist-changed", sync);
    return () => {
      window.removeEventListener("price-alerts-changed", sync);
      window.removeEventListener("local-watchlist-changed", sync);
    };
  }, []);

  const activeSymbols = useMemo(
    () =>
      alerts
        .filter((a) => a.enabled && !a.triggeredAt)
        .map((a) => a.symbol),
    [alerts]
  );
  const { quotes, isConnected } = useLiveSymbols(activeSymbols);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(target.replace(/,/g, ""));
    if (!symbol.trim() || !Number.isFinite(price) || price <= 0) return;
    const entry = watchlist.find((w) => w.symbol === symbol && w.market === market);
    addPriceAlert({
      symbol: symbol.trim(),
      market,
      name: entry?.name,
      targetPrice: price,
      direction,
    });
    setTarget("");
    sync();
  };

  const requestNotifyPermission = () => {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission();
  };

  const active = alerts.filter((a) => a.enabled && !a.triggeredAt);
  const done = alerts.filter((a) => a.triggeredAt || !a.enabled);

  return (
    <section className="panel price-alerts-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          가격 알림
          <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
        </h2>
        <button type="button" className="panel-action inv-btn inv-btn--ghost" onClick={requestNotifyPermission}>
          브라우저 알림
        </button>
      </div>
      <p className="price-alerts-desc">
        목표가에 도달하면 화면 하단 토스트와(허용 시) 브라우저 알림을 보냅니다. 차트 🔔 버튼으로 추가한 알림도
        여기에 모입니다.
      </p>

      <form className="price-alerts-form" onSubmit={onSubmit}>
        <label>
          종목
          <select
            value={`${market}:${symbol}`}
            onChange={(e) => {
              const [m, s] = e.target.value.split(":");
              setMarket(m === "us" ? "us" : "korea");
              setSymbol(s);
            }}
          >
            <option value="korea:">직접 입력 ↓</option>
            {watchlist.map((w) => (
              <option key={`${w.market}-${w.symbol}`} value={`${w.market}:${w.symbol}`}>
                {w.name} ({w.symbol})
              </option>
            ))}
          </select>
        </label>
        <label>
          코드
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="005930 / AAPL"
            required
          />
        </label>
        <label>
          시장
          <select value={market} onChange={(e) => setMarket(e.target.value as "korea" | "us")}>
            <option value="korea">한국</option>
            <option value="us">미국</option>
          </select>
        </label>
        <label>
          목표가
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="decimal"
            placeholder="예: 280000"
            required
          />
        </label>
        <label>
          조건
          <select value={direction} onChange={(e) => setDirection(e.target.value as PriceAlertDirection)}>
            <option value="above">이상 도달</option>
            <option value="below">이하 도달</option>
          </select>
        </label>
        <button type="submit" className="inv-btn">
          알림 추가
        </button>
      </form>

      {active.length === 0 ? (
        <p className="inv-widget-empty">등록된 알림이 없습니다.</p>
      ) : (
        <ul className="price-alerts-list">
          {active.map((a) => {
            const live = pickWsQuote(a.symbol, quotes);
            const decimals = a.market === "korea" ? 0 : 2;
            const hint =
              live != null
                ? `현재 ${formatPrice(live, decimals)} · ${inferDirection(live, a.targetPrice) === a.direction ? "감시 중" : "—"}`
                : "시세 대기";
            return (
              <li key={a.id} className="price-alerts-item">
                <div className="watchlist-item-brand">
                  <StockCompanyLogo
                    market={a.market}
                    symbol={a.symbol}
                    name={a.name ?? a.symbol}
                    size={24}
                  />
                  <div>
                  <strong>
                    {a.name ?? a.symbol}{" "}
                    <span className="text-muted-sm">
                      {a.direction === "above" ? "≥" : "≤"} {formatPrice(a.targetPrice, decimals)}
                    </span>
                  </strong>
                  <p className="price-alerts-meta">{hint}</p>
                  </div>
                </div>
                <button type="button" className="price-alerts-remove" onClick={() => removePriceAlert(a.id)}>
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <details className="price-alerts-history">
          <summary>발동·비활성 ({done.length})</summary>
          <ul className="price-alerts-list price-alerts-list--muted">
            {done.slice(0, 10).map((a) => (
              <li key={a.id} className="price-alerts-item">
                <span>
                  {a.symbol} {a.direction === "above" ? "≥" : "≤"}{" "}
                  {formatPrice(a.targetPrice, a.market === "korea" ? 0 : 2)}
                </span>
                <button type="button" className="price-alerts-remove" onClick={() => removePriceAlert(a.id)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
