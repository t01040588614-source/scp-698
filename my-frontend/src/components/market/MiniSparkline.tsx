"use client";

import { SPARKLINE_SIZE } from "@/config/chartLayout";

type MiniSparklineProps = {
  /** 등락률 — 방향·크기로 미니 차트 형태 생성 */
  changePercent: number;
  width?: number;
  height?: number;
  className?: string;
};

/** Investing 스타일 미니 영역 차트 (당일 추세 근사) */
export default function MiniSparkline({
  changePercent,
  width = SPARKLINE_SIZE.mini.width,
  height = SPARKLINE_SIZE.mini.height,
  className = "",
}: MiniSparklineProps) {
  const up = changePercent >= 0;
  const magnitude = Math.min(Math.abs(changePercent) * 4, 18);
  const mid = height * 0.55;
  const endY = up ? mid - magnitude : mid + magnitude;
  const stroke = up ? "var(--market-up)" : "var(--market-down)";
  const fillId = `spark-fill-${up ? "u" : "d"}-${Math.round(magnitude)}`;

  const points = [
    [0, mid + (up ? 4 : -4)],
    [width * 0.22, mid + (up ? 2 : -2)],
    [width * 0.45, mid + (up ? -2 : 2)],
    [width * 0.68, mid + (up ? -4 : 4)],
    [width, endY],
  ];
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`inv-mini-sparkline ${className}`.trim()}
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${fillId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
