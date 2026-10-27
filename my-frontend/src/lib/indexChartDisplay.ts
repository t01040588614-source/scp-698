import type { OhlcPoint, ChartHistoryResult } from "@/services/chartApi";
import { syntheticFromPrice } from "@/services/chartApi";
import { normalizeCalendarPeriodPoints, syncLastPointToLivePrice } from "@/lib/chartSeries";
import { chartDataIntervalForPeriod } from "@/lib/indexChartUtils";

export type IndexChartDisplay = {
  displayPoints: OhlcPoint[];
  usingFallback: boolean;
  statusNote: string | null;
};

export function buildIndexChartDisplay(input: {
  history: ChartHistoryResult | undefined;
  chartLoading: boolean;
  chartError: boolean;
  period: string;
  livePrice: number;
  /** REST·WS 전 — 차트·fallback 앵커 (시드 시세) */
  anchorPrice?: number;
}): IndexChartDisplay {
  const { history, chartLoading, chartError, period, livePrice, anchorPrice } = input;
  const displayInterval = chartDataIntervalForPeriod(period, history?.interval);
  const raw = history?.points ?? [];
  const calendarReady = normalizeCalendarPeriodPoints(raw, period, displayInterval);
  const tailPrice =
    livePrice > 0 ? livePrice : anchorPrice != null && anchorPrice > 0 ? anchorPrice : 0;

  const synced =
    calendarReady.length >= 2 && tailPrice > 0
      ? syncLastPointToLivePrice(calendarReady, tailPrice)
      : calendarReady;

  const insufficientBars =
    !chartLoading && Boolean(history) && raw.length > 0 && raw.length < 2;

  const usingFallback =
    !chartLoading &&
    synced.length < 2 &&
    tailPrice > 0 &&
    (chartError || history?.source === "synthetic" || insufficientBars);

  if (chartLoading && synced.length < 2) {
    return { displayPoints: [], usingFallback: false, statusNote: null };
  }

  if (synced.length >= 2) {
    const note =
      history?.source === "synthetic"
        ? "참고 차트(근사)입니다. 시세는 실시간으로 갱신됩니다."
        : history?.source === "mock"
          ? "오프라인 참고 차트입니다."
          : null;
    return { displayPoints: synced, usingFallback: false, statusNote: note };
  }

  if (usingFallback && tailPrice > 0) {
    return {
      displayPoints: syntheticFromPrice(tailPrice, period),
      usingFallback: true,
      statusNote:
        chartError || insufficientBars
          ? "실제 차트를 불러오지 못해 당일 추세 근사선을 표시합니다. 시세는 WebSocket·REST로 갱신됩니다."
          : "참고 차트(근사)입니다. 시세는 실시간으로 갱신됩니다.",
    };
  }

  return { displayPoints: [], usingFallback: false, statusNote: null };
}
