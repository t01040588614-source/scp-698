"use client";

import { CHART_HUB_PERIODS, type ChartHubPeriodId } from "@/config/chartPeriods";
import { formatPerformancePercent, priceClass } from "@/lib/format";

type Props = {
  activePeriod: ChartHubPeriodId;
  onSelect: (period: ChartHubPeriodId) => void;
  returns: Partial<Record<ChartHubPeriodId, number | null | undefined>>;
  loading?: boolean;
};

export default function ChartPeriodPerformanceStrip({
  activePeriod,
  onSelect,
  returns,
  loading,
}: Props) {
  return (
    <div className="inv-chart-period-strip" role="tablist" aria-label="차트 기간 및 수익률">
      {CHART_HUB_PERIODS.map((p) => {
        const pct = returns[p.id];
        const active = activePeriod === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inv-chart-period-cell${active ? " is-active" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <span className="inv-chart-period-cell-label">{p.label}</span>
            <span
              className={`inv-chart-period-cell-pct tabular${pct == null || loading ? " is-muted" : ` ${priceClass(pct)}`}`}
            >
              {pct == null || loading ? "…" : formatPerformancePercent(pct)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
