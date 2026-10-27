/** lightweight-charts timeScale — 종목 차트 공통 (좌·우 빈 여백 최소, 가로폭 채움) */

export type ChartTimeScaleChart = {
  timeScale: () => {
    applyOptions: (options: object) => void;
    setVisibleLogicalRange: (range: { from: number; to: number }) => void;
  };
};

export type ChartTimeScaleFitOpts = {
  period?: string;
  dataInterval?: string;
};

/** 1주·1달 — 항상 7·31칸으로 fit (봉 수 불일치 시에도 축 고정) */
export function chartFitBarCount(period: string | undefined, actualBarCount: number): number {
  if (period === "1m") return 31;
  if (period === "1w") return 7;
  return actualBarCount;
}

export function isIntradayChartPeriod(period?: string, dataInterval?: string): boolean {
  if (period === "1d") return true;
  if (period === "1m") return false;
  if (!dataInterval) return false;
  if (dataInterval === "1d" || dataInterval === "1wk" || dataInterval === "1mo") return false;
  const intradayIv = /m$/.test(dataInterval) || dataInterval.endsWith("h");
  if (period === "1w" && intradayIv) return true;
  return intradayIv;
}

function isFixedOrdinalPeriod(period: string, barCount: number): boolean {
  return (
    (period === "1w" && barCount >= 7) ||
    (period === "1m" && barCount >= 28 && barCount <= 31)
  );
}

function isMonthOrdinalChart(period: string, barCount: number): boolean {
  return period === "1m" && barCount >= 28 && barCount <= 31;
}

function rightGutterPx(compact: boolean, intraday: boolean): number {
  return compact ? (intraday ? 2 : 4) : 6;
}

/** 양끝에 남기는 논리 봉 폭 (0.5 ≈ 반 봉) */
const EDGE_BARS = 0.5;

/** 봉이 적을 때(1시간봉 등) 캔들이 화면 전체를 덮지 않도록 */
function maxBarSpacing(compact: boolean, intraday: boolean, barCount: number): number {
  if (!intraday) return compact ? 14 : 18;
  if (barCount <= 8) return compact ? 8 : 12;
  if (barCount <= 24) return compact ? 10 : 14;
  return compact ? 12 : 16;
}

const ORDINAL_MONTH_SLOTS = 31;

/** layoutTimeScaleFit(1m)과 동일한 visible range */
export function ordinalMonthVisibleRange(slotCount = ORDINAL_MONTH_SLOTS) {
  const edge = Math.min(EDGE_BARS, 0.35);
  return { from: -edge, to: slotCount - 1 + edge, edge };
}

/**
 * 1달 — layout 직후·timeScale 숨기기 **전**에만 호출 (캔들 중심 px).
 */
export function measureOrdinalMonthBarCenters(
  chart: ChartTimeScaleChart,
  slotCount = ORDINAL_MONTH_SLOTS,
): number[] {
  try {
    const toX = (
      chart.timeScale() as { logicalToCoordinate?: (logical: number) => number | null }
    ).logicalToCoordinate;
    if (!toX) return [];
    const out: number[] = [];
    for (let i = 0; i < slotCount; i += 1) {
      const x = toX(i);
      out.push(x != null && Number.isFinite(x) ? x : NaN);
    }
    return out;
  } catch {
    return [];
  }
}

/** measure 실패 시 — layoutTimeScaleFit과 같은 spacing·range로 근사 */
export function fallbackOrdinalMonthBarCenters(
  chartWidth: number,
  compact: boolean,
  slotCount = ORDINAL_MONTH_SLOTS,
): number[] {
  const rightGutter = rightGutterPx(compact, false);
  const { from } = ordinalMonthVisibleRange(slotCount);
  const visibleBars = slotCount - 1 + 2 * Math.min(EDGE_BARS, 0.35);
  const priceScaleReserve = compact ? 54 : 60;
  const plotWidth = Math.max(32, chartWidth - rightGutter - priceScaleReserve);
  const spacing = Math.max(3, plotWidth / visibleBars);
  const out: number[] = [];
  for (let i = 0; i < slotCount; i += 1) {
    out.push((i - from) * spacing + spacing / 2);
  }
  return out;
}

export function resolveOrdinalMonthBarCenters(
  chart: ChartTimeScaleChart,
  chartWidth: number,
  compact: boolean,
  slotCount = ORDINAL_MONTH_SLOTS,
): number[] {
  const measured = measureOrdinalMonthBarCenters(chart, slotCount);
  const ok = measured.filter((x) => Number.isFinite(x)).length;
  if (ok >= Math.min(slotCount, 28)) return measured;
  return fallbackOrdinalMonthBarCenters(chartWidth, compact, slotCount);
}

/**
 * visible logical range와 barSpacing을 plotWidth에 맞춰 계산한다.
 * barSpacing 상한으로 1시간봉·소량 데이터에서 거대 캔들을 방지한다.
 */
export function layoutTimeScaleFit(
  chart: ChartTimeScaleChart,
  chartWidth: number,
  barCount: number,
  compact: boolean,
  opts?: ChartTimeScaleFitOpts,
): void {
  if (barCount < 1 || chartWidth < 40) return;

  const intraday = isIntradayChartPeriod(opts?.period, opts?.dataInterval);
  const period = opts?.period ?? "";
  const rightGutter = rightGutterPx(compact, intraday);

  const edge =
    isFixedOrdinalPeriod(period, barCount) ? Math.min(EDGE_BARS, 0.35) : EDGE_BARS;
  const from = -edge;
  const to = barCount - 1 + edge;
  const visibleBars = to - from;
  const plotWidth = Math.max(32, chartWidth - rightGutter);

  const monthOrdinal = isMonthOrdinalChart(period, barCount);
  let spacing = plotWidth / visibleBars;
  spacing = Math.max(intraday ? 0.35 : 0.25, spacing);
  if (monthOrdinal) {
    spacing = Math.max(3, plotWidth / visibleBars);
  } else {
    spacing = Math.min(spacing, maxBarSpacing(compact, intraday, barCount));
  }
  if (intraday && barCount >= 48) {
    spacing = Math.max(0.45, Math.min(spacing, 3.2));
  }

  chart.timeScale().applyOptions({
    barSpacing: spacing,
    minBarSpacing: monthOrdinal ? 1.5 : intraday ? 0.2 : 0.25,
    rightOffset: rightGutter,
    fixLeftEdge: true,
    fixRightEdge: true,
    tickMarkMaxCharacterLength: monthOrdinal ? 2 : intraday ? 10 : 8,
  });
  chart.timeScale().setVisibleLogicalRange({ from, to });
}
