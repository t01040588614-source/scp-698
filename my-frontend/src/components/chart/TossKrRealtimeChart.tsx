"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockChartEvents, getStockHistory } from "@/services/chartApi";
import InvestingStyleChart from "@/components/chart/InvestingStyleChart";
import {
  chartHistoryRefetchMs,
  normalizeChartPeriod,
  type ChartHubPeriodId,
} from "@/config/chartPeriods";
import type { IntradayIntervalId } from "@/config/chartIntraday";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { mergeLiveStockPrice } from "@/lib/liveQuoteMerge";
import { liveOhlcForPeriod, syncLastPointToLivePrice } from "@/lib/chartSeries";
import { stockApi } from "@/lib/api";
import { CHART_HEIGHT } from "@/config/chartLayout";

type Props = {
  code: string;
  name?: string;
  height?: number;
};

/** 토스증권형 국내 종목 차트 */
export default function TossKrRealtimeChart({ code, name, height = CHART_HEIGHT.tossKr }: Props) {
  const [period, setPeriod] = useState<ChartHubPeriodId>("1d");
  const [intradayInterval, setIntradayInterval] = useState<IntradayIntervalId>("5m");

  const { quotes, isConnected } = useLiveSymbols([code]);
  const historyInterval = period === "1d" || period === "1w" ? intradayInterval : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["toss-kr-chart", code, period, historyInterval],
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
    queryKey: ["toss-kr-quote", code],
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

  const chartPoints = useMemo(
    () => syncLastPointToLivePrice(points, live.price),
    [points, live.price],
  );

  const displayPoints = chartPoints.length >= 2 ? chartPoints : points;

  return (
    <div className="toss-quote-chart">
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
        showVolume={false}
        chartType="area"
        streamingLayout
        tossStream
        market="korea"
        venueLabel="정규장"
        referencePrice={koreaRow?.previousClose ?? summary?.open}
        chartEvents={chartEventsData?.events}
        eventsLegend={chartEventsData?.legend}
        showIntradayToolbar={period === "1d"}
        intradayInterval={intradayInterval}
        onIntradayIntervalChange={setIntradayInterval}
        enableLiveTail={displayPoints.length >= 2 && live.price > 0}
        dataInterval={data?.interval}
        liveOhlc={liveOhlcForPeriod(displayPoints, live.price)}
        showPageTitle={false}
      />
    </div>
  );
}
