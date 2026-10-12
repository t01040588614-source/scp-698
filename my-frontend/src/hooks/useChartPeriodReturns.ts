"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CHART_HUB_PERIODS,
  type ChartHubPeriodId,
} from "@/config/chartPeriods";
import { getStockPeriodReturns, type ChartMarket } from "@/services/chartApi";
import type { OhlcPoint } from "@/services/chartApi";

function liveReturnFromPoints(points: OhlcPoint[], livePrice: number): number | null {
  if (!points.length || !Number.isFinite(livePrice) || livePrice <= 0) return null;
  const firstOpen = points[0].open;
  if (!Number.isFinite(firstOpen) || firstOpen <= 0) return null;
  return ((livePrice - firstOpen) / firstOpen) * 100;
}

type Options = {
  symbol: string | null;
  market: ChartMarket;
  enabled?: boolean;
  /** 선택된 기간 차트 — WS 시세로 해당 칸 수익률  보정 */
  activePeriod?: ChartHubPeriodId;
  activePoints?: OhlcPoint[];
  livePrice?: number;
};

export function useChartPeriodReturns({
  symbol,
  market,
  enabled = true,
  activePeriod,
  activePoints,
  livePrice,
}: Options) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["stockPeriodReturns", symbol, market],
    queryFn: () =>
      getStockPeriodReturns({ symbol: symbol!, market }),
    enabled: Boolean(symbol) && enabled,
    staleTime: 90_000,
    refetchInterval: 180_000,
  });

  const returns = useMemo(() => {
    const out: Partial<Record<ChartHubPeriodId, number>> = {
      ...(data?.returns as Partial<Record<ChartHubPeriodId, number>>),
    };
    if (activePeriod && activePoints?.length && livePrice != null && livePrice > 0) {
      const livePct = liveReturnFromPoints(activePoints, livePrice);
      if (livePct != null) out[activePeriod] = livePct;
    }
    return out;
  }, [data?.returns, activePeriod, activePoints, livePrice]);

  const filled = Object.keys(returns).length;
  const loading = isLoading || (filled < 4 && (isFetching || !data));

  return { returns, loading, source: data?.source ?? "" };
}

export { CHART_HUB_PERIODS };
