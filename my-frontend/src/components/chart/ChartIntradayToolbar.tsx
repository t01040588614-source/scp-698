"use client";

import { INTRADAY_INTERVALS, type IntradayIntervalId } from "@/config/chartIntraday";

type Props = {
  active: IntradayIntervalId;
  onSelect: (id: IntradayIntervalId) => void;
};

export default function ChartIntradayToolbar({ active, onSelect }: Props) {
  return (
    <div className="inv-chart-intraday" role="toolbar" aria-label="분봉 간격">
      {INTRADAY_INTERVALS.map((iv) => (
        <button
          key={iv.id}
          type="button"
          className={`inv-chart-intraday-btn${active === iv.id ? " is-active" : ""}`}
          onClick={() => onSelect(iv.id)}
        >
          {iv.label}
        </button>
      ))}
    </div>
  );
}
