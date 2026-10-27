"use client";

import { SPARKLINE_SIZE } from "@/config/chartLayout";
import { buildSparklineAreaPath, buildSparklinePath } from "@/lib/sparklinePath";

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

  const line = buildSparklinePath(points, width, height);
  const area = buildSparklineAreaPath(points, width, height);
  const stroke = positive ? "var(--market-up)" : "var(--market-down)";
  const fill = positive ? "rgba(214, 64, 69, 0.14)" : "rgba(0, 107, 246, 0.14)";

  return (
    <svg
      className="inv-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
