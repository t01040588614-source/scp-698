"use client";

import type { MarketBreadth } from "@/lib/regionalMarkets";

type MarketSummaryBarProps = {
  breadth: MarketBreadth;
  className?: string;
};

/** Investing.com 시장 요약 막대 (상승·보합·하락 비율) */
export default function MarketSummaryBar({ breadth, className = "" }: MarketSummaryBarProps) {
  const adv = Math.round(breadth.advancePct * 100);
  const flat = Math.round(breadth.unchangedPct * 100);
  const dec = Math.max(0, 100 - adv - flat);

  return (
    <div
      className={`inv-market-summary-bar ${className}`.trim()}
      role="img"
      aria-label={`상승 ${adv}%, 보합 ${flat}%, 하락 ${dec}%`}
    >
      <span className="inv-market-summary-seg inv-market-summary-seg--up" style={{ flex: adv || 0.001 }} />
      <span className="inv-market-summary-seg inv-market-summary-seg--flat" style={{ flex: flat || 0.001 }} />
      <span className="inv-market-summary-seg inv-market-summary-seg--down" style={{ flex: dec || 0.001 }} />
    </div>
  );
}
