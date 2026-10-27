import type { IntradayIntervalId } from "@/config/chartIntraday";
import type { ChartHubPeriodId } from "@/config/chartPeriods";
import type { ChartHistoryResult } from "@/services/chartApi";
import {
  chartDataIntervalForPeriod,
  isIntradayDataInterval,
} from "@/lib/indexChartUtils";

/** 툴바·하단 기간 버튼 — period + intraday 상태 일치 */
export function syncIntradayForChartPeriod(
  period: ChartHubPeriodId,
  setIntraday: (id: IntradayIntervalId) => void,
): void {
  if (period === "1m" || period === "1w") {
    setIntraday("1d");
    return;
  }
  if (period === "1d") {
    setIntraday("5m");
  }
}

export function historyMatchesPeriod(
  history: ChartHistoryResult | undefined,
  period: string,
): boolean {
  if (!history) return false;
  if (history.period && history.period !== period) return false;
  if (period === "1w" || period === "1m") {
    const iv = history.interval?.trim();
    if (iv && isIntradayDataInterval(iv)) return false;
  }
  return true;
}

export function alignedStockHistory(
  history: ChartHistoryResult | undefined,
  period: string,
): ChartHistoryResult | undefined {
  if (!historyMatchesPeriod(history, period)) return undefined;
  return history;
}

export function chartDisplayInterval(
  period: string,
  history: ChartHistoryResult | undefined,
): string | undefined {
  return chartDataIntervalForPeriod(period, history?.interval);
}
