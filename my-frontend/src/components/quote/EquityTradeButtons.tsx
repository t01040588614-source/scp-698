"use client";

import { useEquityTradeAction } from "@/hooks/useEquityTradeAction";

type EquityTradeButtonsProps = {
  market: "korea" | "us";
  symbol: string;
  name?: string;
  price?: number;
  size?: "sm";
  className?: string;
};

export default function EquityTradeButtons({
  market,
  symbol,
  name,
  price,
  size,
  className,
}: EquityTradeButtonsProps) {
  const { startTrade, tradeBusy } = useEquityTradeAction({
    market,
    symbol,
    name,
    price,
  });
  const sm = size === "sm" ? " inv-equity-btn--sm" : "";
  const wrapStyle = className ? undefined : ({ display: "contents" } as const);

  return (
    <div className={className} style={wrapStyle}>
      <button
        type="button"
        disabled={tradeBusy}
        className={`inv-equity-btn inv-equity-btn--buy${sm}`}
        onClick={() => void startTrade("BUY")}
      >
        매수
      </button>
      <button
        type="button"
        disabled={tradeBusy}
        className={`inv-equity-btn inv-equity-btn--sell${sm}`}
        onClick={() => void startTrade("SELL")}
      >
        매도
      </button>
    </div>
  );
}
