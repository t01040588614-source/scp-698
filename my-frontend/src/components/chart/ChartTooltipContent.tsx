"use client";

import type { EnrichedOhlcPoint } from "@/lib/chartSeries";
import { formatVolumeShort } from "@/lib/chartSeries";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";

type Props = {
  active?: boolean;
  payload?: { payload: EnrichedOhlcPoint }[];
  label?: string;
  priceDecimals: number;
};

export default function ChartTooltipContent({ active, payload, label, priceDecimals }: Props) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const fmt = (v: number) => formatPrice(v, priceDecimals);

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {row.timestamp && (
        <p className="chart-tooltip-sub">{new Date(row.timestamp).toLocaleString("ko-KR")}</p>
      )}
      <dl className="chart-tooltip-grid">
        <div>
          <dt>시가</dt>
          <dd className="tabular">{fmt(row.open)}</dd>
        </div>
        <div>
          <dt>고가</dt>
          <dd className="tabular">{fmt(row.high)}</dd>
        </div>
        <div>
          <dt>저가</dt>
          <dd className="tabular">{fmt(row.low)}</dd>
        </div>
        <div>
          <dt>종가</dt>
          <dd className="tabular">{fmt(row.close)}</dd>
        </div>
        <div>
          <dt>거래량</dt>
          <dd className="tabular">{formatVolumeShort(row.volume)}</dd>
        </div>
        {row.changeFromPrev != null && (
          <div>
            <dt>전봉 대비</dt>
            <dd className={`tabular ${priceClass(row.changeFromPrev)}`}>
              {formatChange(row.changeFromPrev)} ({formatPercent(row.changePercentFromPrev ?? 0)})
            </dd>
          </div>
        )}
      </dl>
      {(row.ma5 != null || row.ma20 != null) && (
        <p className="chart-tooltip-ma">
          {row.ma5 != null && <span>MA5 {fmt(row.ma5)}</span>}
          {row.ma20 != null && <span>MA20 {fmt(row.ma20)}</span>}
          {row.ma60 != null && <span>MA60 {fmt(row.ma60)}</span>}
        </p>
      )}
    </div>
  );
}
