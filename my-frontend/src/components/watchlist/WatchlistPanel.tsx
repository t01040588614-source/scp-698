"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { stockApi } from "@/lib/api";
import { applyLiveToPortfolio } from "@/lib/liveQuoteMerge";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { pickWsQuote } from "@/lib/wsSymbolKey";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import LocalWatchlistPanel from "@/components/watchlist/LocalWatchlistPanel";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";
import PriceAlertsPanel from "@/components/watchlist/PriceAlertsPanel";
import FcmPushSetup from "@/components/watchlist/FcmPushSetup";
import { buildLoginHref } from "@/lib/authNavigation";

export default function WatchlistPanel() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portfolioWatchlist"],
    queryFn: () => stockApi.getPortfolio().then((res) => res.data),
    enabled: isAuthenticated,
    retry: false,
  });

  const items = useMemo(() => data ?? [], [data]);
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { quotes, flash, isConnected } = useLiveSymbols(symbols);
  const liveItems = useMemo(
    () => items.map((item) => applyLiveToPortfolio(item, pickWsQuote(item.symbol, quotes))),
    [items, quotes]
  );

  if (!isAuthenticated) {
    return (
      <>
        <LocalWatchlistPanel />
        <PriceAlertsPanel />
        <FcmPushSetup />
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">클라우드 관심목록</h2>
          </div>
          <EmptyState
            title="로그인 시 기기 간 동기화"
            description="로그인하면 포트폴리오·관심목록을 계정에 저장할 수 있습니다."
            actionLabel="로그인"
            onAction={() => {
              window.location.href = buildLoginHref("/watchlist");
            }}
          />
        </section>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <LocalWatchlistPanel />
        <section className="panel">
          <h2 className="panel-title">관심목록</h2>
          <LoadingState rows={3} />
        </section>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <LocalWatchlistPanel />
        <section className="panel">
          <h2 className="panel-title">관심목록</h2>
          <ErrorState onRetry={() => void refetch()} />
        </section>
      </>
    );
  }

  return (
    <>
      <LocalWatchlistPanel />
      <PriceAlertsPanel />
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            관심목록
            <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
          </h2>
          <Link href="/portfolio" className="panel-action">
            관리
          </Link>
        </div>

        {liveItems.length === 0 ? (
          <EmptyState
            title="아직 관심 종목이 없습니다."
            description="자주 확인하는 종목을 추가해보세요."
            actionLabel="종목 추가"
            onAction={() => {
              window.location.href = "/portfolio";
            }}
          />
        ) : (
          liveItems.map((item) => {
            const flashDir = flash[item.symbol];
            const decimals = item.stockType === "korea" ? 0 : 2;
            return (
              <Link
                key={item.id}
                href={`/quote/${item.stockType}/${item.symbol}`}
                className={`watchlist-item watchlist-item--link${
                  flashDir ? ` is-flash-${flashDir}` : ""
                }`}
              >
                <div className="watchlist-item-brand">
                  <StockCompanyLogo
                    market={item.stockType === "us" ? "us" : "korea"}
                    symbol={item.symbol}
                    name={item.name}
                    size={28}
                  />
                  <div>
                    <p className="watchlist-item-name">{item.name}</p>
                    <p className="watchlist-item-meta">{item.symbol}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong
                    className={`tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
                  >
                    {formatPrice(item.currentPrice, decimals)}
                  </strong>
                  <p className={`watchlist-item-meta ${priceClass(item.profitLossPercent)}`}>
                    {formatPercent(item.profitLossPercent)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </section>
      <FcmPushSetup />
    </>
  );
}
