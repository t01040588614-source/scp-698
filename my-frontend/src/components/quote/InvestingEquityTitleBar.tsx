"use client";

import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import WatchlistStar from "@/components/market/WatchlistStar";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

type Props = {
  name: string;
  symbol: string;
  market: "korea" | "us";
  price: number;
  change: number;
  changePercent: number;
  decimals?: number;
  priceFlash?: "up" | "down" | null;
};

/** Investing 상단: SK하이닉스 1,827,000 +51,000 (+2.87%) */
export default function InvestingEquityTitleBar({
  name,
  symbol,
  market,
  price,
  change,
  changePercent,
  decimals = 0,
  priceFlash,
}: Props) {
  const pctClass = priceClass(changePercent);

  return (
    <div className="inv-equity-titlebar">
      <h1 className="inv-equity-titlebar-heading inv-stock-name-with-logo">
        <StockCompanyLogo market={market} symbol={symbol} name={name} size={36} />
        <span className="inv-equity-titlebar-name">{name}</span>
        <span
          className={`inv-equity-titlebar-price tabular${priceFlash ? ` is-flash-${priceFlash}` : ""}`}
        >
          {formatPrice(price, decimals)}
        </span>
        <span className={`inv-equity-titlebar-chg tabular ${pctClass}`}>
          {formatChange(change)} ({formatPercent(changePercent)})
        </span>
      </h1>
      <div className="inv-equity-titlebar-actions">
        <WatchlistStar symbol={symbol} market={market} name={name} />
      </div>
    </div>
  );
}
