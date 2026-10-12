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

export function isIntradayChartPeriod(period?: string, dataInterval?: string): boolean {
  if (period === "1d") return true;
  if (!dataInterval) return false;
  if (dataInterval === "1d" || dataInterval === "1wk" || dataInterval === "1mo") return false;
  return /m$/.test(dataInterval) || dataInterval.endsWith("h");
}

function isFixedOrdinalPeriod(period: string, barCount: number): boolean {
  return (
    (period === "1w" && barCount === 7) ||
    (period === "1m" && barCount >= 28 && barCount <= 31)
  );
}

function rightGutterPx(compact: boolean, intraday: boolean): number {
  return compact ? (intraday ? 2 : 4) : 6;
}

/** 양끝에 남기는 논리 봉 폭 (0.5 ≈ 반 봉) */
const EDGE_BARS = 0.5;

/**
 * visible logical range와 barSpacing을 plotWidth에 맞춰 계산한다.
 * spacing 상한을 두지 않아 봉이 적을 때도 양쪽 빈 공간이 생기지 않는다.
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

  let spacing = plotWidth / visibleBars;
  spacing = Math.max(intraday ? 0.35 : 0.25, spacing);

  chart.timeScale().applyOptions({
    barSpacing: spacing,
    minBarSpacing: 0.25,
    rightOffset: rightGutter,
    fixLeftEdge: true,
    fixRightEdge: true,
  });
  chart.timeScale().setVisibleLogicalRange({ from, to });
}
