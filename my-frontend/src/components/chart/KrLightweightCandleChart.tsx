"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockChartEvents, getStockHistory } from "@/services/chartApi";
import InvestingStyleChart from "@/components/chart/InvestingStyleChart";
import ChartPeriodPerformanceStrip from "@/components/chart/ChartPeriodPerformanceStrip";
import { CHART_HEIGHT } from "@/config/chartLayout";
import {
  DEFAULT_CHART_PERIOD,
  chartHistoryRefetchMs,
  normalizeChartPeriod,
  type ChartHubPeriodId,
} from "@/config/chartPeriods";
import type { IntradayIntervalId } from "@/config/chartIntraday";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { useChartPeriodReturns } from "@/hooks/useChartPeriodReturns";
import { mergeLiveStockPrice } from "@/lib/liveQuoteMerge";
import { stockApi } from "@/lib/api";

type Props = {
  code: string;
  height?: number;
  name?: string;
};

export default function KrLightweightCandleChart({ code, height = CHART_HEIGHT.stockDetail, name }: Props) {
  const [period, setPeriod] = useState<ChartHubPeriodId>(DEFAULT_CHART_PERIOD);
  const [intradayInterval, setIntradayInterval] = useState<IntradayIntervalId>("5m");

  const { quotes, isConnected } = useLiveSymbols([code]);
  const historyInterval = period === "1d" || period === "1w" ? intradayInterval : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["kr-lwc-chart", code, period, historyInterval],
    queryFn: () =>
      getStockHistory({
        symbol: code,
        market: "korea",
        period,
        interval: historyInterval,
      }),
    refetchInterval: chartHistoryRefetchMs(period, isConnected),
  });

  const { data: chartEventsData } = useQuery({
    queryKey: ["chartEvents", code, "korea", period],
    queryFn: () => getStockChartEvents({ symbol: code, market: "korea", period }),
    staleTime: 300_000,
  });

  const { data: koreaRow } = useQuery({
    queryKey: ["kr-lwc-quote", code],
    queryFn: async () => {
      const list = await stockApi.getKoreaStocks().then((r) => r.data);
      return list.find((s) => s.symbol === code);
    },
  });

  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const summary = data?.summary;
  const wsPrice = quotes[code];

  const live = useMemo(() => {
    const basePrice = koreaRow?.price ?? summary?.close ?? 0;
    const baseChange = koreaRow?.change ?? summary?.change ?? 0;
    const basePct = koreaRow?.changePercent ?? summary?.changePercent ?? 0;
    const prevClose = koreaRow?.previousClose ?? basePrice - baseChange;
    return mergeLiveStockPrice(basePrice, baseChange, basePct, prevClose, wsPrice);
  }, [koreaRow, summary, wsPrice]);

  const chartPoints = useMemo(() => {
    if (points.length < 2) return points;
    const last = points[points.length - 1];
    return [
      ...points.slice(0, -1),
      {
        ...last,
        close: live.price,
        high: Math.max(last.high, live.price),
        low: Math.min(last.low, live.price),
        value: live.price,
      },
    ];
  }, [points, live.price]);

  const displayPoints = chartPoints.length >= 2 ? chartPoints : points;

  const { returns: periodReturns, loading: perfLoading } = useChartPeriodReturns({
    symbol: code,
    market: "korea",
    activePeriod: period,
    activePoints: displayPoints,
    livePrice: live.price,
  });

  return (
    <div className="inv-chart-frame">
      <InvestingStyleChart
        symbolLabel={code}
        subtitle={name ?? koreaRow?.name ?? code}
        points={displayPoints}
        loading={isLoading}
        height={height}
        period={period}
        onPeriodChange={(p) => setPeriod(normalizeChartPeriod(p))}
        priceDecimals={0}
        hideChartTypes
        hidePeriodToolbar
        showVolume
        chartType="area"
        streamingLayout
        market="korea"
        venueLabel="서울"
        referencePrice={koreaRow?.previousClose ?? summary?.open}
        chartEvents={chartEventsData?.events}
        eventsLegend={chartEventsData?.legend}
        showIntradayToolbar
        intradayInterval={intradayInterval}
        onIntradayIntervalChange={setIntradayInterval}
        enableLiveTail={isConnected}
        dataInterval={data?.interval}
        liveOhlc={
          summary
            ? {
                open: summary.open,
                high: Math.max(summary.high, live.price),
                low: Math.min(summary.low, live.price),
                close: live.price,
              }
            : undefined
        }
      />
      <ChartPeriodPerformanceStrip
        activePeriod={period}
        onSelect={(p) => setPeriod(normalizeChartPeriod(p))}
        returns={periodReturns}
        loading={perfLoading}
      />
    </div>
  );
}
