"use client";

import Link from "next/link";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import WatchlistStar from "@/components/market/WatchlistStar";
import {
  directionSymbol,
  formatChange,
  formatPercent,
  formatPrice,
  priceClass,
} from "@/lib/format";

type Props = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchangeLabel?: string;
  isLive: boolean;
  priceDecimals?: number;
  priceFlash?: "up" | "down" | null;
};

export default function TossEquityHeader({
  symbol,
  name,
  price,
  change,
  changePercent,
  exchangeLabel = "KOSPI",
  isLive,
  priceDecimals = 0,
  priceFlash,
}: Props) {
  const flashClass =
    priceFlash === "up" ? " price-flash-up" : priceFlash === "down" ? " price-flash-down" : "";

  return (
    <header className="toss-quote-header">
      <Link href="/markets" className="toss-quote-back">
        ← 국내 정규장
      </Link>
      <div className="toss-quote-title-row">
        <StockNameWithLogo
          market="korea"
          symbol={symbol}
          name={name}
          size={36}
          className="toss-quote-name-wrap"
          nameClassName="toss-quote-name"
        />
        <div className="toss-quote-title-actions">
          <WatchlistStar symbol={symbol} market="korea" name={name} />
          <LiveStreamBadge connected={isLive} className="inv-live-badge--inline" />
        </div>
      </div>
      <p className="toss-quote-venue">
        {exchangeLabel} · 실시간
      </p>
      <div className={`toss-quote-price-block${flashClass}`}>
        <span className="toss-quote-price tabular">{formatPrice(price, priceDecimals)}</span>
        <span className={`toss-quote-chg tabular ${priceClass(change)}`}>
          {directionSymbol(change)}
          {formatChange(change)} ({formatPercent(changePercent)})
        </span>
      </div>
    </header>
  );
}
