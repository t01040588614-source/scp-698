"use client";

/** Client-only re-export — webpack이 단일 청크로 묶도록 loadLightweightCharts에서 dynamic import */
export {
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  createChart,
} from "lightweight-charts";

export type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
