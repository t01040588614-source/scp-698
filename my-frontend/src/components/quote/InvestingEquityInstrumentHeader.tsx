"use client";

import Link from "next/link";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import { krxBidAsk } from "@/lib/krxTickSize";
import { formatVolumeShort } from "@/lib/chartSeries";
import InvestingEquityRangeBar from "@/components/quote/InvestingEquityRangeBar";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

export type InvestingEquityInstrumentHeaderProps = {
  name: string;
  symbol: string;
  market: "korea" | "us";
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  priceDecimals?: number;
  priceFlash?: "up" | "down" | null;
  exchangeLabel?: string;
  isLive?: boolean;
  updatedAt?: Date | null;
  week52Low?: number;
  week52High?: number;
  showTradeButtons?: boolean;
};

export default function InvestingEquityInstrumentHeader({
  name,
  symbol,
  market,
  price,
  change,
  changePercent,
  open,
  high,
  low,
  previousClose,
  volume,
  priceDecimals = 0,
  priceFlash,
  exchangeLabel,
  isLive = false,
  updatedAt,
  week52Low,
  week52High,
  showTradeButtons = true,
}: InvestingEquityInstrumentHeaderProps) {
  const pctClass = priceClass(changePercent);
  const quoteHref = `/quote/${market}/${symbol}`;
  const currency = market === "korea" ? "KRW" : "USD";
  const venue = market === "korea" ? "서울" : exchangeLabel ?? "US";
  const { bid, ask } = market === "korea" ? krxBidAsk(price) : { bid: price, ask: price };

  const w52Lo = week52Low ?? low;
  const w52Hi = week52High ?? high;

  const timeStr = updatedAt
    ? updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <header className="inv-equity-instrument">
      <div className="inv-equity-instrument-top">
        <div className="inv-equity-instrument-identity">
          <h1 className="inv-equity-instrument-name inv-stock-name-with-logo">
            <StockCompanyLogo market={market} symbol={symbol} name={name} size={40} />
            <span>{name}</span>
          </h1>
          <p className="inv-equity-instrument-venue">
            {venue} · {currency} · 실시간
            <LiveStreamBadge connected={isLive} className="inv-live-badge--inline" />
            {timeStr ? <span className="inv-equity-instrument-time tabular"> · {timeStr}</span> : null}
          </p>
        </div>
      </div>

      <div className="inv-equity-instrument-main">
        <div className="inv-equity-instrument-quote-block">
          <div className="inv-equity-instrument-quote">
            <span
              className={`inv-equity-instrument-price tabular${priceFlash ? ` is-flash-${priceFlash}` : ""}`}
            >
              {formatPrice(price, priceDecimals)}
            </span>
            <span className={`inv-equity-instrument-change tabular ${pctClass}`}>
              {formatChange(change)} ({formatPercent(changePercent)})
            </span>
          </div>

          <button
            type="button"
            className="inv-equity-hero-ai"
            title="차트 구간 요약"
            onClick={() => document.getElementById("chart")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="inv-equity-hero-ai-icon" aria-hidden>
              ✦
            </span>
            AI 차트 분석
            <span className="inv-equity-hero-ai-info" title="베타">
              ⓘ
            </span>
          </button>

          <div className="inv-equity-instrument-ranges">
            <InvestingEquityRangeBar
              label="금일 변동"
              low={low}
              high={high}
              current={price}
              decimals={priceDecimals}
            />
            <InvestingEquityRangeBar
              label="52주 변동폭"
              low={w52Lo}
              high={w52Hi}
              current={price}
              decimals={priceDecimals}
            />
          </div>
        </div>

        {showTradeButtons && (
          <div className="inv-equity-instrument-trade">
            <p className="inv-equity-instrument-spread tabular">
              매수/매도 {formatPrice(bid, priceDecimals)} / {formatPrice(ask, priceDecimals)}
            </p>
            <Link href={quoteHref} className="inv-equity-btn inv-equity-btn--buy">
              매수
            </Link>
            <Link href={quoteHref} className="inv-equity-btn inv-equity-btn--sell">
              매도
            </Link>
          </div>
        )}
      </div>

      <dl className="inv-equity-instrument-quick">
        <div>
          <dt>전일 종가</dt>
          <dd className="tabular">{formatPrice(previousClose, priceDecimals)}</dd>
        </div>
        <div>
          <dt>금일 시가</dt>
          <dd className="tabular">{formatPrice(open, priceDecimals)}</dd>
        </div>
        <div>
          <dt>거래량</dt>
          <dd className="tabular">{formatVolumeShort(volume)}</dd>
        </div>
        <div>
          <dt>통화</dt>
          <dd>{currency}</dd>
        </div>
      </dl>
    </header>
  );
}
