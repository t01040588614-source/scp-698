"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClientLocaleTime } from "@/hooks/useClientLocaleTime";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import type { OhlcPoint } from "@/services/chartApi";
import { ohlcPointsToLwcCandles } from "@/lib/lwcTime";
import { clearLightweightChartsReloadFlag, loadLightweightCharts } from "@/lib/loadLightweightCharts";
import { brand } from "@/config/brand";
import { CHART_HEIGHT } from "@/config/chartLayout";
import { LAYOUT_SYNC_EVENT } from "@/lib/layoutSync";
import {
  SIDEBAR_CHART_PERIODS,
  chartPeriodLabel,
  normalizeChartPeriod,
  type ChartHubPeriodId,
} from "@/config/chartPeriods";
import { isLwcWhitespace, type LwcCandle, type LwcSeriesPoint } from "@/lib/lwcTime";
import { buildChartMarkers, type ChartEventItem } from "@/lib/chartMarkers";
import ChartIntradayToolbar from "@/components/chart/ChartIntradayToolbar";
import ChartEventsLegend from "@/components/chart/ChartEventsLegend";
import ChartStreamingLayout from "@/components/chart/ChartStreamingLayout";
import EquityTradeButtons from "@/components/quote/EquityTradeButtons";
import type { ChartStreamToolsBinding } from "@/components/chart/chartStreamToolsTypes";
import {
  chartLegendIntervalLabel,
  investingStreamIntervalLabel,
  investingStreamVenueTag,
  type IntradayIntervalId,
} from "@/config/chartIntraday";
import {
  computeSma20,
  downloadCanvasPng,
  type DrawToolId,
  type PriceScaleModeId,
} from "@/lib/chartDrawTools";
import { normalizeCalendarPeriodPoints, ohlcForChartLegend } from "@/lib/chartSeries";
import {
  chartDataIntervalForPeriod,
  shouldUseOrdinalWeekMonthChart,
} from "@/lib/indexChartUtils";
import { syncIntradayForChartPeriod } from "@/lib/chartPeriodSelection";
import {
  chartFitBarCount,
  isIntradayChartPeriod,
  layoutTimeScaleFit,
  resolveOrdinalMonthBarCenters,
} from "@/lib/chartTimeScaleFit";
import {
  createChartTimeFormatters,
  intradayChartShowSeconds,
  isDenseOrdinalMonthAxis,
} from "@/lib/chartTimeFormat";
import ChartOrdinalMonthAxis from "@/components/chart/ChartOrdinalMonthAxis";
import { addPriceAlert, inferDirection } from "@/lib/priceAlerts";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

type LwcChartApi = {
  applyOptions: (options: object) => void;
  timeScale: () => {
    applyOptions: (options: object) => void;
    setVisibleLogicalRange: (range: { from: number; to: number }) => void;
    scrollToPosition?: (position: number, animated: boolean) => void;
  };
  priceScale: (id?: string) => { applyOptions: (options: object) => void };
  subscribeClick: (handler: (param: ChartClickParam) => void) => void;
  unsubscribeClick: (handler: (param: ChartClickParam) => void) => void;
  remove: () => void;
};

type ChartClickParam = {
  point?: { x: number; y: number };
  seriesData?: Map<unknown, unknown>;
};

type PriceLineHandle = unknown;
type CandleSeriesHandle = {
  createPriceLine: (options: {
    price: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
    axisLabelVisible?: boolean;
    title?: string;
  }) => PriceLineHandle;
  removePriceLine: (line: PriceLineHandle) => void;
  update: (bar: LwcCandle) => void;
  coordinateToPrice?: (y: number) => number | null;
};

type AreaSeriesHandle = {
  createPriceLine: (options: {
    price: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
    axisLabelVisible?: boolean;
    title?: string;
  }) => PriceLineHandle;
  removePriceLine: (line: PriceLineHandle) => void;
  update: (bar: { time: LwcCandle["time"]; value: number }) => void;
};

type LineSeriesHandle = {
  update: (bar: { time: LwcCandle["time"]; value: number }) => void;
};

type VolumeSeriesHandle = {
  update: (bar: { time: LwcCandle["time"]; value: number; color?: string }) => void;
};

export type InvestingChartType = "candle" | "line" | "area";

export type InvestingStyleChartProps = {
  title?: string;
  symbolLabel: string;
  subtitle?: string;
  points: OhlcPoint[];
  loading?: boolean;
  height?: number;
  compact?: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
  chartType?: InvestingChartType;
  onChartTypeChange?: (t: InvestingChartType) => void;
  showVolume?: boolean;
  priceDecimals?: number;
  /** 마지막 봉 대신 외부 OHLC ( 헤더) */
  liveOhlc?: { open: number; high: number; low: number; close: number };
  /** 당일 누적 거래량 (WS·캐시) — 마지막 봉/거래량 히스토그램 갱신 */
  liveVolume?: number;
  /** 페이지 제목(차트) — 상위에 제목이 있으면 false */
  showPageTitle?: boolean;
  /** 사이드바 등: 캔들/라인/영역 툴바 숨김 */
  hideChartTypes?: boolean;
  /** /charts 허브: 상단 기간 탭 숨김(하단 스트립 사용) */
  hidePeriodToolbar?: boolean;
  periodOptions?: ReadonlyArray<{ id: string; label: string }>;
  /** false면 WS·헤더 시세로 마지막 봉을 계속 덮어쓰지 않음 (사이드바 synthetic 방지) */
  enableLiveTail?: boolean;
  /** API interval (5m, 1h, 1d) — 시간축 분봉/일봉 구분 */
  dataInterval?: string;
  /** /charts 종목 허브 — Investing.com 차트 밀도 */
  equityHub?: boolean;
  /** 종목 상세 — 카드형 차트(오버레이 헤더) */
  equityPage?: boolean;
  overlayQuote?: {
    name: string;
    price: number;
    change: number;
    changePercent: number;
    market: "korea" | "us";
  };
  /** Investing.com 점선 기준선 (전일 종가 등) */
  referencePrice?: number;
  chartEvents?: ChartEventItem[];
  eventsLegend?: { key: string; label: string }[];
  showIntradayToolbar?: boolean;
  intradayInterval?: IntradayIntervalId;
  onIntradayIntervalChange?: (id: IntradayIntervalId) => void;
  /** Investing.com 스트리밍 차트 (전 종목 ) */
  streamingLayout?: boolean;
  /** 토스증권형 — 미니 툴바·워터마크 없음 */
  tossStream?: boolean;
  /** 지수 상세 — 캔들+거래량 레이아웃(종목 equityPage와 분리) */
  indexChart?: boolean;
  market?: "korea" | "us";
  venueLabel?: string;
};

function readChartColors() {
  const s = getComputedStyle(document.documentElement);
  const pick = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  return {
    background: pick("--surface", "#ffffff"),
    text: pick("--text-secondary", "#444b54"),
    grid: pick("--chart-grid", "#eceff3"),
    border: pick("--border-color", "#e6e9ef"),
    up: pick("--market-up", "#d64045"),
    down: pick("--market-down", "#006bf6"),
    primary: pick("--primary", "#006bf6"),
  };
}

type OhlcValues = { open: number; high: number; low: number; close: number };

function ChartOhlcLegend({
  ohlc,
  priceDecimals,
  className,
}: {
  ohlc: OhlcValues;
  priceDecimals: number;
  className?: string;
}) {
  const bullish = ohlc.close >= ohlc.open;
  return (
    <span className={className ?? "inv-investing-chart-ohlc"}>
      <span className="inv-ohlc-item">
        <span className="inv-ohlc-label">시</span>{" "}
        <em className={bullish ? "inv-ohlc--up" : "inv-ohlc--down"}>
          {formatPrice(ohlc.open, priceDecimals)}
        </em>
      </span>
      <span className="inv-ohlc-item">
        <span className="inv-ohlc-label">고</span>{" "}
        <em className="inv-ohlc--up">{formatPrice(ohlc.high, priceDecimals)}</em>
      </span>
      <span className="inv-ohlc-item">
        <span className="inv-ohlc-label">저</span>{" "}
        <em className="inv-ohlc--down">{formatPrice(ohlc.low, priceDecimals)}</em>
      </span>
      <span className="inv-ohlc-item">
        <span className="inv-ohlc-label">종</span>{" "}
        <em className={bullish ? "inv-ohlc--up" : "inv-ohlc--down"}>
          {formatPrice(ohlc.close, priceDecimals)}
        </em>
      </span>
    </span>
  );
}

export default function InvestingStyleChart({
  title = "차트",
  symbolLabel,
  subtitle,
  points,
  loading,
  height = CHART_HEIGHT.default,
  compact = false,
  period,
  onPeriodChange,
  chartType: chartTypeProp = "area",
  onChartTypeChange,
  showVolume = true,
  priceDecimals = 2,
  liveOhlc,
  liveVolume,
  showPageTitle = false,
  hideChartTypes = false,
  hidePeriodToolbar = false,
  periodOptions = SIDEBAR_CHART_PERIODS,
  enableLiveTail = true,
  dataInterval,
  equityHub = false,
  equityPage = false,
  overlayQuote,
  referencePrice,
  chartEvents,
  eventsLegend,
  showIntradayToolbar = false,
  intradayInterval = "5m",
  onIntradayIntervalChange,
  streamingLayout = false,
  tossStream = false,
  indexChart = false,
  market = "korea",
  venueLabel,
}: InvestingStyleChartProps) {
  const equityLayout = equityHub || equityPage;
  const hubLayout = equityLayout || indexChart;
  const activePeriod = normalizeChartPeriod(period);
  const chartCanvasHeight = compact ? height - 8 : height;
  const stageBoxHeight = compact ? height + 28 : height;
  const stageStyle = useMemo(
    () =>
      ({
        height: stageBoxHeight,
        minHeight: stageBoxHeight,
        maxHeight: stageBoxHeight,
        ["--inv-chart-stage-height" as string]: `${stageBoxHeight}px`,
      }) as React.CSSProperties,
    [stageBoxHeight]
  );
  const canvasStyle = useMemo(
    () =>
      ({
        height: chartCanvasHeight,
        minHeight: chartCanvasHeight,
        maxHeight: chartCanvasHeight,
      }) as React.CSSProperties,
    [chartCanvasHeight]
  );
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRootRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<LwcChartApi | null>(null);
  const smaSeriesRef = useRef<unknown>(null);
  const userDrawnPricesRef = useRef<number[]>([]);
  const userDrawnHandlesRef = useRef<PriceLineHandle[]>([]);
  const measureStartRef = useRef<number | null>(null);
  const candleSeriesRef = useRef<CandleSeriesHandle | null>(null);
  const areaSeriesRef = useRef<
    (AreaSeriesHandle & { setMarkers?: (markers: object[]) => void }) | null
  >(null);
  const candleMarkersRef = useRef<
    (CandleSeriesHandle & { setMarkers?: (markers: object[]) => void }) | null
  >(null);
  const lineSeriesRef = useRef<LineSeriesHandle | null>(null);
  const volumeSeriesRef = useRef<VolumeSeriesHandle | null>(null);
  const lastCandlesRef = useRef<LwcSeriesPoint[]>([]);
  const priceLineRef = useRef<PriceLineHandle | null>(null);
  const refLineRef = useRef<PriceLineHandle | null>(null);
  const [themeKey, setThemeKey] = useState("light");
  const [localChartType, setLocalChartType] = useState<InvestingChartType>(chartTypeProp);
  const chartType = onChartTypeChange ? chartTypeProp : localChartType;
  const [activeDrawTool, setActiveDrawTool] = useState<DrawToolId>("crosshair");
  const [priceScaleMode, setPriceScaleMode] = useState<PriceScaleModeId>("normal");
  const [showSma20, setShowSma20] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [volumeOn, setVolumeOn] = useState(showVolume);
  const [showGrid, setShowGrid] = useState(true);
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  const [measureHint, setMeasureHint] = useState<string | null>(null);
  const [chartLibError, setChartLibError] = useState<string | null>(null);
  const [ordinalMonthCenters, setOrdinalMonthCenters] = useState<number[]>([]);
  useEffect(() => {
    setLocalChartType(chartTypeProp);
  }, [chartTypeProp]);

  useEffect(() => {
    const read = () =>
      setThemeKey(document.documentElement.getAttribute("data-theme") || "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const syncChartWidth = () => {
      const el = containerRef.current;
      const chart = chartApiRef.current;
      if (!el || !chart || el.clientWidth < 8) return;
      chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener(LAYOUT_SYNC_EVENT, syncChartWidth);
    return () => window.removeEventListener(LAYOUT_SYNC_EVENT, syncChartWidth);
  }, []);

  const setChartType = useCallback(
    (t: InvestingChartType) => {
      if (onChartTypeChange) onChartTypeChange(t);
      else setLocalChartType(t);
    },
    [onChartTypeChange]
  );

  const ohlc = useMemo(() => {
    if (!points.length) return null;
    if (liveOhlc) return liveOhlc;
    return ohlcForChartLegend(points);
  }, [points, liveOhlc]);

  const chartInterval = chartDataIntervalForPeriod(activePeriod, dataInterval);

  const chartPoints = useMemo(() => {
    return normalizeCalendarPeriodPoints(points, activePeriod, dataInterval);
  }, [points, activePeriod, dataInterval]);

  const displayTitle = useMemo(() => {
    const name =
      subtitle && subtitle !== symbolLabel
        ? `${symbolLabel}, ${subtitle}`
        : subtitle || symbolLabel;
    const intervalLabel = chartLegendIntervalLabel(activePeriod, {
      dataInterval,
      intradayInterval,
    });
    return `${name}, ${intervalLabel}`;
  }, [symbolLabel, subtitle, activePeriod, dataInterval, intradayInterval]);

  const seriesKey = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${activePeriod}|${chartPoints.length}|${first.timestamp ?? first.time}|${last.timestamp ?? last.time}`;
  }, [chartPoints, activePeriod]);

  const chartSeries = useMemo(() => {
    if (!seriesKey) return null;
    const candles = ohlcPointsToLwcCandles(chartPoints, activePeriod, chartInterval);
    return { candles, pointsSnapshot: chartPoints };
  }, [seriesKey, chartPoints, activePeriod, chartInterval]);

  const useOrdinalDayAxis = useMemo(() => {
    if (!chartSeries || chartPoints.length < 2) return false;
    return shouldUseOrdinalWeekMonthChart(activePeriod, chartInterval, chartPoints);
  }, [chartSeries, activePeriod, chartInterval, chartPoints]);

  const denseOrdinalMonthAxis = isDenseOrdinalMonthAxis(activePeriod, useOrdinalDayAxis);

  const pickPeriod = (id: ChartHubPeriodId) => {
    onPeriodChange(id);
    if (onIntradayIntervalChange) {
      syncIntradayForChartPeriod(id, onIntradayIntervalChange);
    }
  };

  const showVolumePane = showVolume && volumeOn && chartSeries != null;

  const getMainPriceSeries = useCallback((): CandleSeriesHandle | null => {
    if (chartType === "candle") return candleSeriesRef.current;
    if (chartType === "area") return areaSeriesRef.current as unknown as CandleSeriesHandle;
    return (lineSeriesRef.current as unknown as CandleSeriesHandle) ?? null;
  }, [chartType]);

  const syncUserDrawnLines = useCallback(() => {
    const series = getMainPriceSeries();
    if (!series) return;
    for (const handle of userDrawnHandlesRef.current) {
      try {
        series.removePriceLine(handle);
      } catch {
        /* ignore */
      }
    }
    userDrawnHandlesRef.current = [];
    if (drawingsHidden) return;
    for (const price of userDrawnPricesRef.current) {
      const handle = series.createPriceLine({
        price,
        color: "#e65100",
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "",
      });
      userDrawnHandlesRef.current.push(handle);
    }
  }, [drawingsHidden, getMainPriceSeries]);

  const addDrawnPrices = useCallback(
    (prices: number[]) => {
      userDrawnPricesRef.current.push(...prices);
      syncUserDrawnLines();
    },
    [syncUserDrawnLines]
  );

  const seriesMarkers = useMemo(() => {
    if (!chartSeries?.candles.length) return [];
    const tradeBars = chartSeries.candles.filter((c): c is LwcCandle => !isLwcWhitespace(c));
    return buildChartMarkers(tradeBars, chartEvents);
  }, [chartSeries, chartEvents]);

  const showIntraday =
    showIntradayToolbar && (activePeriod === "1d" || activePeriod === "1w");

  const baselinePrice = useMemo(() => {
    if (referencePrice != null && referencePrice > 0) return referencePrice;
    const first = points[0];
    return first?.open ?? null;
  }, [referencePrice, points]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartSeries) {
      containerRef.current.replaceChildren();
      chartApiRef.current = null;
      setOrdinalMonthCenters([]);
      return;
    }
    const { candles, pointsSnapshot } = chartSeries;
    const containerEl = containerRef.current;

    let disposed = false;
    let chart: { remove: () => void } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    setChartLibError(null);

    void loadLightweightCharts()
      .then(({ createChart, ColorType }) => {
      if (disposed || !containerRef.current) return;
      clearLightweightChartsReloadFlag();
      const el = containerRef.current;
      el.replaceChildren();
      const colors = readChartColors();
      lastCandlesRef.current = candles;

      const chartTimeFormat = createChartTimeFormatters({
        market,
        period: activePeriod,
        dataInterval: chartInterval,
        useOrdinalDayAxis,
        candles,
        pointsSnapshot,
      });
      const canvasHeight = compact ? height - 8 : height;
      const lockInteraction = compact;

      const c = createChart(el, {
        width: el.clientWidth,
        height: canvasHeight,
        handleScroll: lockInteraction
          ? false
          : {
              mouseWheel: true,
              pressedMouseMove: true,
              horzTouchDrag: true,
              vertTouchDrag: false,
            },
        handleScale: lockInteraction
          ? false
          : {
              axisPressedMouseMove: { time: true, price: true },
              mouseWheel: true,
              pinch: true,
            },
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
          fontFamily: 'Arial, Helvetica, "Malgun Gothic", sans-serif',
          fontSize: 11,
        },
        localization: {
          locale: "ko-KR",
          dateFormat: "yyyy-MM-dd",
          ...(equityPage
            ? {
                priceFormatter: (p: number) => {
                  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(2)}m`;
                  if (p >= 10_000) return `${(p / 1_000).toFixed(0)}k`;
                  return `${Math.round(p)}`;
                },
              }
            : {}),
          timeFormatter: chartTimeFormat.timeFormatter,
        },
        grid: {
          vertLines: { color: colors.grid, visible: showGrid },
          horzLines: { color: colors.grid, visible: showGrid },
        },
        rightPriceScale: {
          borderColor: colors.border,
          scaleMargins: {
            top: compact ? 0.14 : 0.08,
            bottom: showVolumePane
              ? hubLayout
                ? 0.26
                : 0.2
              : compact
                ? 0.12
                : 0.06,
          },
        },
        timeScale: {
          borderColor: colors.border,
          timeVisible:
            !compact ||
            useOrdinalDayAxis ||
            isIntradayChartPeriod(activePeriod, chartInterval),
          secondsVisible: intradayChartShowSeconds(chartInterval),
          tickMarkMaxCharacterLength:
            chartTimeFormat.mode === "daily" ? 16 : chartTimeFormat.mode === "intraday" ? 18 : 12,
          tickMarkFormatter: chartTimeFormat.tickMarkFormatter,
        },
        crosshair: {
          vertLine: {
            color: colors.primary,
            width: 1,
            style: 2,
            labelBackgroundColor: colors.primary,
            labelVisible: false,
          },
          horzLine: { color: colors.primary, width: 1, style: 2, labelBackgroundColor: colors.primary },
        },
      });
      chart = c;
      chartApiRef.current = c as unknown as LwcChartApi;

      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
      refLineRef.current = null;

      const tradeCandles = candles.filter((d): d is LwcCandle => !isLwcWhitespace(d));
      const lineData = tradeCandles.map((d) => ({ time: d.time, value: d.close }));
      const areaLine = colors.primary;
      const areaTop = equityLayout ? `${colors.primary}55` : `${colors.primary}66`;
      const areaBottom = equityLayout ? `${colors.primary}06` : `${colors.primary}04`;

      if (chartType === "candle") {
        const series = c.addCandlestickSeries({
          upColor: colors.up,
          downColor: colors.down,
          borderVisible: false,
          wickUpColor: colors.up,
          wickDownColor: colors.down,
        });
        series.setData(candles as Parameters<typeof series.setData>[0]);
        candleSeriesRef.current = series as unknown as CandleSeriesHandle;
        candleMarkersRef.current = series as unknown as CandleSeriesHandle & {
          setMarkers?: (markers: object[]) => void;
        };
      } else if (chartType === "area") {
        const series = c.addAreaSeries({
          lineColor: areaLine,
          topColor: areaTop,
          bottomColor: areaBottom,
          lineWidth: 2,
          lastValueVisible: true,
          priceLineVisible: false,
          crosshairMarkerVisible: true,
        });
        series.setData(lineData as Parameters<typeof series.setData>[0]);
        areaSeriesRef.current = series as unknown as AreaSeriesHandle & {
          setMarkers?: (markers: object[]) => void;
        };
        lineSeriesRef.current = series as unknown as LineSeriesHandle;
      } else {
        const series = c.addLineSeries({
          color: colors.primary,
          lineWidth: compact ? 1 : 2,
        });
        series.setData(lineData as Parameters<typeof series.setData>[0]);
        lineSeriesRef.current = series as unknown as LineSeriesHandle;
      }

      if (showVolumePane) {
        const vol = c.addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: "",
        });
        vol.priceScale().applyOptions({
          scaleMargins: { top: hubLayout ? 0.78 : 0.76, bottom: 0 },
        });
        const volAlpha = hubLayout ? "bb" : "99";
        vol.setData(
          candles.map((bar, idx) => {
            if (isLwcWhitespace(bar)) {
              return { time: bar.time, value: 0, color: `${colors.text}22` };
            }
            const tradeBar: LwcCandle = bar;
            const pt = pointsSnapshot[idx];
            const volVal =
              pt?.volume ??
              pointsSnapshot.find((p) => {
                const t = p.timestamp ? Math.floor(Date.parse(p.timestamp) / 1000) : p.time;
                return String(t) === String(tradeBar.time) || p.time === String(tradeBar.time);
              })?.volume ??
              0;
            const up = tradeBar.close >= tradeBar.open;
            return {
              time: tradeBar.time,
              value: volVal,
              color: up ? `${colors.up}${volAlpha}` : `${colors.down}${volAlpha}`,
            };
          }) as Parameters<typeof vol.setData>[0]
        );
        volumeSeriesRef.current = vol as unknown as VolumeSeriesHandle;
      }

      if (showSma20 && tradeCandles.length > 20) {
        const smaData = computeSma20(tradeCandles);
        const sma = c.addLineSeries({
          color: "#f57c00",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma.setData(smaData as Parameters<typeof sma.setData>[0]);
        smaSeriesRef.current = sma;
      } else {
        smaSeriesRef.current = null;
      }

      const markerTarget =
        chartType === "candle" ? candleMarkersRef.current : areaSeriesRef.current;
      if (markerTarget?.setMarkers && seriesMarkers.length) {
        markerTarget.setMarkers(seriesMarkers);
      } else if (markerTarget?.setMarkers) {
        markerTarget.setMarkers([]);
      }

      const fitOrdinalMonthAxis = (chartApi: LwcChartApi, width: number, bars: number) => {
        layoutTimeScaleFit(chartApi, width, chartFitBarCount(activePeriod, bars), compact, {
          period: activePeriod,
          dataInterval: chartInterval,
        });
        if (!denseOrdinalMonthAxis) return;
        const centers = resolveOrdinalMonthBarCenters(chartApi, width, compact);
        if (!disposed) setOrdinalMonthCenters(centers);
        chartApi.timeScale().applyOptions({ visible: false, borderVisible: false });
      };

      fitOrdinalMonthAxis(c as unknown as LwcChartApi, el.clientWidth, candles.length);
      syncUserDrawnLines();

      resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current || !chartApiRef.current || disposed) return;
        const w = containerRef.current.clientWidth;
        chartApiRef.current.applyOptions({ width: w });
        fitOrdinalMonthAxis(
          chartApiRef.current,
          w,
          lastCandlesRef.current.length,
        );
      });
      resizeObserver.observe(el);
    })
      .catch((err: unknown) => {
        if (disposed) return;
        const msg = err instanceof Error ? err.message : String(err);
        setChartLibError(msg.includes("Chunk") ? "차트 파일(청크) 로드 실패 — stop-dev 후 start.bat으로 재시작" : msg);
      });

    return () => {
      disposed = true;
      setOrdinalMonthCenters([]);
      const chartApi = chart as { remove: () => void } | null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      candleMarkersRef.current = null;
      areaSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      lastCandlesRef.current = [];
      priceLineRef.current = null;
      refLineRef.current = null;
      chartApi?.remove();
      containerEl.replaceChildren();
    };
  }, [
    chartSeries,
    height,
    compact,
    chartType,
    showVolumePane,
    themeKey,
    equityLayout,
    equityPage,
    indexChart,
    hubLayout,
    seriesMarkers,
    showGrid,
    showSma20,
    syncUserDrawnLines,
    activePeriod,
    chartInterval,
    market,
    useOrdinalDayAxis,
    denseOrdinalMonthAxis,
  ]);

  useEffect(() => {
    const target =
      chartType === "candle" ? candleMarkersRef.current : areaSeriesRef.current;
    if (!target?.setMarkers) return;
    target.setMarkers(seriesMarkers.length ? seriesMarkers : []);
  }, [seriesMarkers, chartType]);

  useEffect(() => {
    if (!enableLiveTail || !liveOhlc || lastCandlesRef.current.length === 0) return;
    const lastPoint = lastCandlesRef.current[lastCandlesRef.current.length - 1];
    if (isLwcWhitespace(lastPoint)) return;
    const lastBar: LwcCandle = lastPoint;
    const nextBar: LwcCandle = {
      ...lastBar,
      close: liveOhlc.close,
      high: Math.max(lastBar.high, liveOhlc.close),
      low: Math.min(lastBar.low, liveOhlc.close),
    };
    lastCandlesRef.current = [...lastCandlesRef.current.slice(0, -1), nextBar];
    if (chartType === "candle" && candleSeriesRef.current) {
      candleSeriesRef.current.update(nextBar);
    } else if (chartType === "area" && areaSeriesRef.current) {
      areaSeriesRef.current.update({ time: lastBar.time, value: liveOhlc.close });
    } else if (lineSeriesRef.current) {
      lineSeriesRef.current.update({ time: lastBar.time, value: liveOhlc.close });
    }
    if (liveVolume != null && liveVolume > 0 && volumeSeriesRef.current) {
      const colors = readChartColors();
      const up = nextBar.close >= nextBar.open;
      const volAlpha = hubLayout ? "38" : "55";
      volumeSeriesRef.current.update({
        time: lastBar.time,
        value: liveVolume,
        color: up ? `${colors.up}${volAlpha}` : `${colors.down}${volAlpha}`,
      });
    }
  }, [liveOhlc, liveVolume, chartType, enableLiveTail, hubLayout]);

  useEffect(() => {
    const series =
      chartType === "candle"
        ? candleSeriesRef.current
        : chartType === "area"
          ? areaSeriesRef.current
          : chartType === "line"
            ? (lineSeriesRef.current as unknown as AreaSeriesHandle)
            : null;
    if (!series) return;

    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (refLineRef.current) {
      series.removePriceLine(refLineRef.current);
      refLineRef.current = null;
    }

    const colors = readChartColors();
    if (ohlc && chartType === "candle") {
      const lineColor = streamingLayout
        ? colors.primary
        : equityPage || equityHub
          ? colors.text
          : ohlc.close >= ohlc.open
            ? colors.up
            : colors.down;
      priceLineRef.current = series.createPriceLine({
        price: ohlc.close,
        color: lineColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }

    if (ohlc && chartType === "area") {
      priceLineRef.current = series.createPriceLine({
        price: ohlc.close,
        color: colors.primary,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }

    if (ohlc && chartType === "line") {
      priceLineRef.current = series.createPriceLine({
        price: ohlc.close,
        color: colors.primary,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }

    const showBaselineRef =
      baselinePrice != null &&
      baselinePrice > 0 &&
      ohlc != null &&
      Math.abs(baselinePrice - ohlc.close) / Math.max(ohlc.close, 1) > 0.00005;

    if (showBaselineRef && (equityLayout || indexChart || chartType === "area")) {
      refLineRef.current = series.createPriceLine({
        price: baselinePrice!,
        color: colors.text,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }
  }, [ohlc, chartType, equityHub, equityPage, equityLayout, indexChart, baselinePrice, streamingLayout]);

  useEffect(() => {
    syncUserDrawnLines();
  }, [drawingsHidden, syncUserDrawnLines, chartSeries]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;
    void loadLightweightCharts().then(({ PriceScaleMode }) => {
      const mode =
        priceScaleMode === "log"
          ? PriceScaleMode.Logarithmic
          : priceScaleMode === "percent"
            ? PriceScaleMode.Percentage
            : PriceScaleMode.Normal;
      chart.priceScale("right").applyOptions({ mode });
    });
  }, [priceScaleMode, chartSeries]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;
    void loadLightweightCharts().then(({ CrosshairMode }) => {
      const mode =
        activeDrawTool === "magnet"
          ? CrosshairMode.Magnet
          : CrosshairMode.Normal;
      chart.applyOptions({
        crosshair: { mode },
      });
    });
  }, [activeDrawTool, chartSeries]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!streamingLayout || !chart) return;

    const onClick = (param: ChartClickParam) => {
      const series = getMainPriceSeries();
      if (!series?.coordinateToPrice || !param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price == null || !Number.isFinite(price)) return;

      switch (activeDrawTool) {
        case "hline":
          addDrawnPrices([price]);
          break;
        case "channel":
          addDrawnPrices([price * 0.98, price, price * 1.02]);
          break;
        case "text":
          window.alert(`${symbolLabel} · ${formatPrice(price, priceDecimals)}`);
          break;
        case "measure": {
          const start = measureStartRef.current;
          if (start == null) {
            measureStartRef.current = price;
            setMeasureHint(`시작 ${formatPrice(price, priceDecimals)} — 끝 지점을 클릭하세요`);
          } else {
            const pct = ((price - start) / start) * 100;
            setMeasureHint(
              `${formatPrice(start, priceDecimals)} → ${formatPrice(price, priceDecimals)} (${formatPercent(pct)})`
            );
            measureStartRef.current = null;
          }
          break;
        }
        default:
          break;
      }
    };

    chart.subscribeClick(onClick);
    return () => chart.unsubscribeClick(onClick);
  }, [
    streamingLayout,
    activeDrawTool,
    chartSeries,
    getMainPriceSeries,
    addDrawnPrices,
    symbolLabel,
    priceDecimals,
  ]);

  const handleDrawTool = useCallback(
    (id: DrawToolId) => {
      setActiveDrawTool(id);
      if (id === "brush") setChartType("area");
      if (id === "fit") {
        const chart = chartApiRef.current;
        const el = containerRef.current;
        if (chart && el && lastCandlesRef.current.length) {
          layoutTimeScaleFit(
            chart,
            el.clientWidth,
            chartFitBarCount(activePeriod, lastCandlesRef.current.length),
            compact,
            {
              period: activePeriod,
              dataInterval: chartInterval,
            },
          );
        }
      }
      if (id === "visibility") {
        setDrawingsHidden((v) => !v);
      }
      if (id === "erase") {
        userDrawnPricesRef.current = [];
        measureStartRef.current = null;
        setMeasureHint(null);
        syncUserDrawnLines();
      }
      if (id === "crosshair" || id === "magnet") {
        measureStartRef.current = null;
        setMeasureHint(null);
      }
    },
    [compact, setChartType, syncUserDrawnLines, activePeriod, chartInterval]
  );

  const streamTools: ChartStreamToolsBinding = useMemo(
    () => ({
      activeDrawTool,
      onDrawTool: handleDrawTool,
      drawingsHidden,
      measureHint,
      priceScaleMode,
      onPriceScaleMode: setPriceScaleMode,
      showSma20,
      onToggleSma20: () => setShowSma20((v) => !v),
      settingsOpen,
      onToggleSettings: () => setSettingsOpen((v) => !v),
      showVolume: volumeOn,
      onToggleVolume: () => setVolumeOn((v) => !v),
      showGrid,
      onToggleGrid: () => setShowGrid((v) => !v),
      onCompare: () => {
        const next = window.prompt("비교할 종목 코드를 입력하세요", symbolLabel);
        if (!next?.trim()) return;
        router.push(`/charts?market=${market}&symbol=${encodeURIComponent(next.trim())}`);
      },
      onFinancials: () => {
        router.push(`/quote/${market}/${symbolLabel}#financials`);
      },
      onTemplates: () => {
        const order: InvestingChartType[] = ["area", "candle", "line"];
        const idx = order.indexOf(chartType);
        setChartType(order[(idx + 1) % order.length]);
      },
      onSnapshot: () => {
        if (containerRef.current) {
          downloadCanvasPng(containerRef.current, `${symbolLabel}-chart.png`);
        }
      },
      onSaveImage: () => {
        if (containerRef.current) {
          downloadCanvasPng(containerRef.current, `${symbolLabel}-chart.png`);
        }
      },
      onResetLayout: () => {
        const chart = chartApiRef.current;
        const el = containerRef.current;
        if (chart && el && lastCandlesRef.current.length) {
          layoutTimeScaleFit(
            chart,
            el.clientWidth,
            chartFitBarCount(activePeriod, lastCandlesRef.current.length),
            compact,
            {
              period: activePeriod,
              dataInterval: chartInterval,
            },
          );
        }
      },
      onFullscreen: () => {
        const el = streamRootRef.current ?? containerRef.current?.closest(".inv-stream-chart");
        if (el && "requestFullscreen" in el) {
          void (el as HTMLElement).requestFullscreen();
        }
      },
      onUndoDrawing: () => {
        userDrawnPricesRef.current.pop();
        syncUserDrawnLines();
      },
      onPriceAlert: () => {
        const last = points[points.length - 1]?.close;
        const raw = window.prompt("알림 가격을 입력하세요", String(last ?? ""));
        if (!raw) return;
        const targetPrice = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(targetPrice) || targetPrice <= 0) return;
        const direction = inferDirection(last ?? targetPrice, targetPrice);
        addPriceAlert({
          symbol: symbolLabel,
          market,
          name: subtitle,
          targetPrice,
          direction,
        });
        window.alert(
          `${symbolLabel} ${direction === "above" ? "≥" : "≤"} ${formatPrice(targetPrice, priceDecimals)} 알림 저장 (/watchlist에서 관리)`
        );
      },
      onAiAnalysis: () => {
        const first = points[0]?.close;
        const last = points[points.length - 1]?.close;
        if (first && last) {
          const pct = ((last - first) / first) * 100;
          window.alert(
            `${symbolLabel} · ${chartPeriodLabel(activePeriod)} 구간\n시작 ${formatPrice(first, priceDecimals)} → 현재 ${formatPrice(last, priceDecimals)} (${formatPercent(pct)})`
          );
        } else {
          document.getElementById("inv-key-stats-title")?.scrollIntoView({ behavior: "smooth" });
        }
      },
      onGoToDate: () => {
        const raw = window.prompt("이동할 날짜 (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
        if (!raw || !chartApiRef.current || !lastCandlesRef.current.length) return;
        const target = Date.parse(raw);
        if (Number.isNaN(target)) return;
        let bestIdx = 0;
        let bestDiff = Infinity;
        lastCandlesRef.current.forEach((c, i) => {
          const t = typeof c.time === "number" ? c.time * 1000 : Date.parse(String(c.time));
          const diff = Math.abs(t - target);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          }
        });
        chartApiRef.current.timeScale().scrollToPosition?.(
          -lastCandlesRef.current.length + bestIdx + 5,
          true
        );
      },
      onPanChart: (direction) => {
        const chart = chartApiRef.current;
        if (!chart) return;
        const ts = chart.timeScale() as {
          getVisibleLogicalRange?: () => { from: number; to: number };
          setVisibleLogicalRange: (range: { from: number; to: number }) => void;
        };
        const range = ts.getVisibleLogicalRange?.();
        if (!range) return;
        const span = range.to - range.from;
        const shift = span * 0.22 * direction;
        ts.setVisibleLogicalRange({ from: range.from + shift, to: range.to + shift });
      },
      onZoomChart: (direction) => {
        const chart = chartApiRef.current;
        if (!chart) return;
        const ts = chart.timeScale() as {
          getVisibleLogicalRange?: () => { from: number; to: number };
          setVisibleLogicalRange: (range: { from: number; to: number }) => void;
        };
        const range = ts.getVisibleLogicalRange?.();
        if (!range) return;
        const center = (range.from + range.to) / 2;
        const factor = direction === 1 ? 0.82 : 1.22;
        const span = (range.to - range.from) * factor;
        ts.setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 });
      },
    }),
    [
      activeDrawTool,
      handleDrawTool,
      drawingsHidden,
      measureHint,
      priceScaleMode,
      showSma20,
      settingsOpen,
      volumeOn,
      showGrid,
      symbolLabel,
      market,
      router,
      chartType,
      setChartType,
      compact,
      syncUserDrawnLines,
      points,
      priceDecimals,
      activePeriod,
      subtitle,
      chartInterval,
    ]
  );

  const clock = useClientLocaleTime("hms") ?? "—";

  const venueTag = investingStreamVenueTag(market, venueLabel);
  const intervalLegend = investingStreamIntervalLabel(intradayInterval, activePeriod);
  const streamLegendTitle = useMemo(() => {
    const name =
      subtitle && subtitle !== symbolLabel
        ? `${symbolLabel}, ${subtitle}`
        : subtitle || symbolLabel;
    return `${name}, ${intervalLegend}, (${venueTag})`;
  }, [symbolLabel, subtitle, intervalLegend, venueTag]);

  const streamLegend =
    ohlc && streamingLayout ? (
      <div className="inv-stream-legend">
        <span className="inv-stream-legend-title">
          {streamLegendTitle}
        </span>
        <ChartOhlcLegend ohlc={ohlc} priceDecimals={priceDecimals} className="inv-stream-legend-ohlc" />
      </div>
    ) : null;

  const stageContent = (
    <>
      {loading && <div className="inv-investing-chart-loading">차트 불러오는 중…</div>}
      {!loading && chartPoints.length < 2 && (
        <div className="inv-investing-chart-empty">표시할 차트 데이터가 없습니다.</div>
      )}
      {chartLibError ? (
        <div className="inv-investing-chart-empty" role="alert">
          {chartLibError}{" "}
          <button type="button" className="link-accent" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      ) : (
        <div
          className={
            denseOrdinalMonthAxis
              ? "inv-investing-chart-canvas-wrap inv-investing-chart-canvas-wrap--ordinal-month"
              : "inv-investing-chart-canvas-wrap"
          }
        >
          <div ref={containerRef} className="inv-investing-chart-canvas" style={canvasStyle} />
          {denseOrdinalMonthAxis ? (
            <ChartOrdinalMonthAxis
              centers={ordinalMonthCenters}
              dayLabels={chartPoints.map((p) => p.time)}
            />
          ) : null}
        </div>
      )}
      {streamingLayout && !tossStream ? (
        <span className="inv-investing-chart-watermark">investing.com</span>
      ) : (
        !equityPage && !tossStream && <span className="inv-investing-chart-watermark">{brand.name}</span>
      )}
    </>
  );

  if (streamingLayout) {
    return (
      <div
        ref={streamRootRef}
        className={`inv-investing-chart inv-investing-chart--stream${equityPage ? " inv-investing-chart--equity-page" : ""}${tossStream ? " inv-investing-chart--toss" : ""}`}
      >
        <ChartStreamingLayout
          symbolLabel={symbolLabel}
          subtitle={subtitle}
          market={market}
          venueLabel={venueLabel}
          activePeriod={activePeriod}
          onPeriodChange={(p) => pickPeriod(p)}
          intradayInterval={intradayInterval}
          onIntradayChange={(id) => onIntradayIntervalChange?.(id)}
          chartType={chartType}
          onChartTypeChange={setChartType}
          eventsLegend={eventsLegend}
          clock={clock}
          legend={streamLegend}
          tools={streamTools}
          streamVariant={tossStream ? "toss" : "investing"}
          hideFooterRanges={equityPage}
        >
          <div className="inv-investing-chart-stage inv-investing-chart-stage--stream" style={stageStyle}>
            {stageContent}
          </div>
        </ChartStreamingLayout>
      </div>
    );
  }

  return (
    <div
      className={`inv-investing-chart${compact ? " inv-investing-chart--compact" : ""}${equityHub ? " inv-investing-chart--equity-hub" : ""}${equityPage ? " inv-investing-chart--equity-page" : ""}`}
    >
      {showPageTitle && !compact && (
        <h3 className="inv-investing-chart-page-title">{title}</h3>
      )}

      <div className={`inv-investing-chart-toolbar${equityPage ? " inv-investing-chart-toolbar--slim" : ""}`}>
        <div className="inv-investing-chart-toolbar-left">
          {equityPage && (
            <>
              <button
                type="button"
                className={`inv-chart-tool${chartType === "candle" ? " is-active" : ""}`}
                title="캔들"
                aria-pressed={chartType === "candle"}
                onClick={() => setChartType("candle")}
              >
                ▥
              </button>
              <button
                type="button"
                className={`inv-chart-tool${chartType === "area" ? " is-active" : ""}`}
                title="영역"
                aria-pressed={chartType === "area"}
                onClick={() => setChartType("area")}
              >
                ▤
              </button>
              <button
                type="button"
                className="inv-chart-tool inv-chart-tool--compare"
                title="종목 비교"
                onClick={streamTools.onCompare}
              >
                + 비교
              </button>
            </>
          )}
          {!equityLayout && !compact && (
            <span className="inv-investing-chart-symbol" title={symbolLabel}>
              {symbolLabel.length > 12 ? symbolLabel.slice(0, 12) : symbolLabel}
            </span>
          )}
          {!hidePeriodToolbar && (
            <div className="inv-investing-chart-intervals" role="tablist" aria-label="차트 기간">
              {periodOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={activePeriod === p.id}
                  className={`inv-investing-chart-interval${activePeriod === p.id ? " is-active" : ""}`}
                  onClick={() => pickPeriod(p.id as ChartHubPeriodId)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {showIntraday && onIntradayIntervalChange && (
          <ChartIntradayToolbar active={intradayInterval} onSelect={onIntradayIntervalChange} />
        )}
        {!hideChartTypes && !equityPage && (
          <div className="inv-investing-chart-toolbar-right">
            {(
              [
                ["candle", "캔들"],
                ["line", "라인"],
                ["area", "영역"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`inv-investing-chart-type${chartType === id ? " is-active" : ""}`}
                aria-pressed={chartType === id}
                onClick={() => setChartType(id)}
                title={label}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`inv-investing-chart-icon-btn${showSma20 ? " is-active" : ""}`}
              title="이동평균 SMA 20"
              onClick={() => setShowSma20((v) => !v)}
            >
              ƒx
            </button>
          </div>
        )}
        {(equityLayout || chartEvents?.length) && (
          <ChartEventsLegend items={eventsLegend} />
        )}
      </div>

      <div className="inv-investing-chart-stage" style={stageStyle}>
        {ohlc && !equityHub && !(compact && loading) && (
          <div className={`inv-investing-chart-legend${compact ? " inv-investing-chart-legend--compact" : ""}`}>
            <span className="inv-investing-chart-legend-title">{displayTitle}</span>
            <ChartOhlcLegend ohlc={ohlc} priceDecimals={priceDecimals} />
          </div>
        )}
        {overlayQuote && (
          <div className="inv-chart-card-header">
            <div className="inv-chart-card-header-left">
              <button type="button" className="inv-equity-hero-ai inv-equity-hero-ai--sm" onClick={streamTools.onAiAnalysis}>
                <span className="inv-equity-hero-ai-icon">✦</span>
                AI 차트 분석
              </button>
              <div className="inv-chart-card-quote">
                <span className="inv-chart-card-name inv-stock-name-with-logo">
                  <StockCompanyLogo
                    market={overlayQuote.market}
                    symbol={symbolLabel}
                    name={overlayQuote.name}
                    size={28}
                  />
                  <span>{overlayQuote.name}</span>
                </span>
                <span className="inv-chart-card-price tabular">
                  {formatPrice(overlayQuote.price, priceDecimals)}
                </span>
                <span
                  className={`inv-chart-card-chg tabular ${priceClass(overlayQuote.changePercent)}`}
                >
                  {formatChange(overlayQuote.change)} (
                  {formatPercent(overlayQuote.changePercent)})
                </span>
              </div>
            </div>
            <EquityTradeButtons
              market={overlayQuote.market}
              symbol={symbolLabel}
              name={overlayQuote.name}
              price={overlayQuote.price}
              size="sm"
              className="inv-chart-card-header-trade"
            />
          </div>
        )}
        {ohlc && equityHub && !equityPage && (
          <div className="inv-investing-chart-ohlc-strip">
            <ChartOhlcLegend ohlc={ohlc} priceDecimals={priceDecimals} />
          </div>
        )}
        {stageContent}
      </div>

      {!compact && (
        <div className="inv-investing-chart-footer inv-investing-chart-footer--minimal">
          <span className="inv-investing-chart-clock tabular">{clock} (UTC+9)</span>
        </div>
      )}
    </div>
  );
}
