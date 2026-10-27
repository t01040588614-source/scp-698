"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPARKLINE_SIZE } from "@/config/chartLayout";

const SIDEBAR_CHART_PAD = { left: 2, right: 26, y: 4, yGutter: 20 } as const;

type SidebarAreaChartProps = {
  closes: number[];
  times?: string[];
  width?: number;
  height?: number;
  positive?: boolean;
};

export default function SidebarAreaChart({
  closes,
  times = [],
  width: widthProp,
  height = SPARKLINE_SIZE.sidebar.height,
  positive = true,
}: SidebarAreaChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? 280);

  useEffect(() => {
    if (widthProp != null) {
      setMeasuredWidth(widthProp);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setMeasuredWidth(Math.max(200, Math.floor(el.clientWidth) || 280));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthProp]);

  const width = widthProp ?? measuredWidth;

  const { linePath, areaPath, yLabels, xLabels, lastPriceY } = useMemo(() => {
    if (closes.length < 2) {
      return {
        linePath: "",
        areaPath: "",
        yLabels: [] as string[],
        xLabels: [] as string[],
        lastPriceY: null as number | null,
      };
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const pad = (max - min) * 0.08 || max * 0.01 || 1;
    const yMin = min - pad;
    const yMax = max + pad;
    const range = yMax - yMin || 1;
    const { left, right, y: yPad, yGutter } = SIDEBAR_CHART_PAD;
    const innerH = height - yGutter;
    const innerW = width - left - right;
    const step = innerW / (closes.length - 1);

    const pts = closes.map((c, i) => {
      const x = left + i * step;
      const y = yPad + innerH - ((c - yMin) / range) * innerH;
      return { x, y, c };
    });

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(yPad + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(yPad + innerH).toFixed(1)} Z`;

    const yLabels = [yMax, (yMax + yMin) / 2, yMin].map((v) =>
      v >= 1000 ? v.toFixed(0) : v.toFixed(2)
    );

    const xLabels = [times[0], times[Math.floor(times.length / 2)], times[times.length - 1]].filter(
      Boolean
    ) as string[];

    return {
      linePath: line,
      areaPath: area,
      yLabels,
      xLabels,
      lastPriceY: pts[pts.length - 1].y,
    };
  }, [closes, times, width, height]);

  if (closes.length < 2) {
    return (
      <div className="inv-sidebar-chart inv-sidebar-chart--empty" style={{ height }}>
        차트 데이터를 불러오는 중…
      </div>
    );
  }

  const stroke = positive ? "var(--market-up)" : "var(--market-down)";
  const fill = positive ? "rgba(0, 180, 80, 0.14)" : "rgba(232, 64, 64, 0.14)";
  const { left, right } = SIDEBAR_CHART_PAD;

  return (
    <div
      ref={wrapRef}
      className="inv-sidebar-chart"
      style={{
        width: widthProp ?? "100%",
        maxWidth: "100%",
        height,
        minHeight: height,
        maxHeight: height,
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {[0, 1, 2].map((i) => {
          const { left, right, y: yPad, yGutter } = SIDEBAR_CHART_PAD;
          const y = yPad + ((height - yGutter) * i) / 2;
          return (
            <line
              key={i}
              x1={left}
              x2={width - right}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray="3 3"
            />
          );
        })}
        <path d={areaPath} fill={fill} stroke="none" />
        {lastPriceY != null && (
          <line
            x1={left}
            x2={width - right}
            y1={lastPriceY}
            y2={lastPriceY}
            stroke="var(--primary)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        )}
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="inv-sidebar-chart-y" aria-hidden>
        {yLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      {xLabels.length > 0 && (
        <div className="inv-sidebar-chart-x tabular" aria-hidden>
          {xLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
