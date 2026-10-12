"use client";

import { formatPrice } from "@/lib/format";

type InvestingEquityRangeBarProps = {
  label: string;
  low: number;
  high: number;
  current: number;
  decimals?: number;
};

export default function InvestingEquityRangeBar({
  label,
  low,
  high,
  current,
  decimals = 0,
}: InvestingEquityRangeBarProps) {
  const span = high - low;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((current - low) / span) * 100)) : 50;

  return (
    <div className="inv-equity-range">
      <div className="inv-equity-range-head">
        <span className="inv-equity-range-label">{label}</span>
        <span className="inv-equity-range-values tabular">
          {formatPrice(low, decimals)} — {formatPrice(high, decimals)}
        </span>
      </div>
      <div className="inv-equity-range-track" aria-hidden>
        <div className="inv-equity-range-fill" style={{ width: `${pct}%` }} />
        <div className="inv-equity-range-marker" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
