"use client";

import Link from "next/link";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";
type ChartEquityHeroProps = {
  name: string;
  symbol: string;
  market: "korea" | "us";
  price: number;
  change: number;
  changePercent: number;
  priceDecimals?: number;
  priceFlash?: "up" | "down" | null;
  exchangeLabel?: string;
  showTradeButtons?: boolean;
};

export default function ChartEquityHero({
  name,
  symbol,
  market,
  price,
  change,
  changePercent,
  priceDecimals = 0,
  priceFlash,
  exchangeLabel,
  showTradeButtons = true,
}: ChartEquityHeroProps) {
  const pctClass = priceClass(changePercent);
  const quoteHref = `/quote/${market}/${symbol}`;

  return (
    <div className="inv-equity-hero">
      <div className="inv-equity-hero-main">
        <div className="inv-equity-hero-title-row">
          <div className="inv-stock-name-with-logo">
            <StockCompanyLogo market={market} symbol={symbol} name={name} size={36} />
            <Link href={quoteHref} className="inv-equity-hero-name">
              {name}
            </Link>
            <p className="inv-equity-hero-meta">
              {symbol}
              {exchangeLabel ? ` · ${exchangeLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="inv-equity-hero-quote">
          <span
            className={`inv-equity-hero-price tabular${priceFlash ? ` is-flash-${priceFlash}` : ""}`}
          >
            {formatPrice(price, priceDecimals)}
          </span>
          <span className={`inv-equity-hero-change tabular ${pctClass}`}>
            <span className="inv-equity-hero-arrow" aria-hidden>
              {change >= 0 ? "▲" : "▼"}
            </span>
            {formatChange(change)} ({formatPercent(changePercent)})
          </span>
        </div>

        <button type="button" className="inv-equity-hero-ai" disabled title="준비 중">
          <span className="inv-equity-hero-ai-icon" aria-hidden>
            ✦
          </span>
          AI 차트 분석
          <span className="inv-equity-hero-ai-info" title="베타">
            ⓘ
          </span>
        </button>
      </div>

      {showTradeButtons && (
        <div className="inv-equity-hero-trade">
          <Link href={quoteHref} className="inv-equity-btn inv-equity-btn--buy">
            매수
          </Link>
          <Link href={quoteHref} className="inv-equity-btn inv-equity-btn--sell">
            매도
          </Link>
        </div>
      )}
    </div>
  );
}
