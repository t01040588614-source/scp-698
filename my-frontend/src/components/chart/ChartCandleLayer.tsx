"use client";

import type { EnrichedOhlcPoint } from "@/lib/chartSeries";

export type CandleLayerProps = {
  xAxisMap?: Record<string, { scale: (v: string) => number; bandwidth?: () => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
  data?: EnrichedOhlcPoint[];
  offset?: { left?: number; top?: number };
  upColor: string;
  downColor: string;
};

export function ChartCandleLayer({
  xAxisMap,
  yAxisMap,
  data,
  offset,
  upColor,
  downColor,
}: CandleLayerProps) {
  if (!xAxisMap || !yAxisMap || !data?.length) return null;

  const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
  const yAxis = yAxisMap[Object.keys(yAxisMap)[0]];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const band = xAxis.bandwidth?.() ?? 6;
  const left = offset?.left ?? 0;
  const top = offset?.top ?? 0;
  const bodyWidth = Math.max(3, Math.min(12, band * 0.65));

  return (
    <g className="chart-candles">
      {data.map((d) => {
        const xCenter = xScale(d.time) + band / 2 + left;
        const yHigh = yScale(d.high) + top;
        const yLow = yScale(d.low) + top;
        const yOpen = yScale(d.open) + top;
        const yClose = yScale(d.close) + top;
        const isUp = d.close >= d.open;
        const color = isUp ? upColor : downColor;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

        return (
          <g key={`${d.time}-${d.close}`}>
            <line x1={xCenter} x2={xCenter} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1.2} />
            <rect
              x={xCenter - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={isUp ? color : color}
              stroke={color}
              strokeWidth={1}
              opacity={isUp ? 0.95 : 0.85}
            />
          </g>
        );
      })}
    </g>
  );
}
