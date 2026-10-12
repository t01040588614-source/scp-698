"use client";

import { SPARKLINE_SIZE } from "@/config/chartLayout";
import { buildSparklinePath } from "@/lib/sparklinePath";

type SparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  positive?: boolean;
};

export default function Sparkline({
  points,
  width = SPARKLINE_SIZE.table.width,
  height = SPARKLINE_SIZE.table.height,
  positive = true,
}: SparklineProps) {
  if (points.length < 2) return null;

  const d = buildSparklinePath(points, width, height);
  const stroke = positive ? "var(--market-up)" : "var(--market-down)";

  return (
    <svg
      className="inv-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
