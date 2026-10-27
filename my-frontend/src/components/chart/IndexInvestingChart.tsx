"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import InvestingStyleChart from "@/components/chart/InvestingStyleChart";
import { getIndexHistory } from "@/services/chartApi";
import {
  DEFAULT_SIDEBAR_CHART_PERIOD,
  SIDEBAR_CHART_PERIODS,
  chartHistoryRefetchMs,
  normalizeChartPeriod,
  type SidebarChartPeriod,
} from "@/lib/indexCatalog";
import type { IntradayIntervalId } from "@/config/chartIntraday";
import { buildIndexChartDisplay } from "@/lib/indexChartDisplay";
import { liveOhlcForPeriod } from "@/lib/chartSeries";
import { indexChartStreamMeta } from "@/lib/indexStrip";
import {
  indexHistoryInterval,
  priceDecimalsForIndex,
} from "@/lib/indexChartUtils";
import {
  alignedStockHistory,
  chartDisplayInterval,
  syncIntradayForChartPeriod,
} from "@/lib/chartPeriodSelection";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import { CHART_HEIGHT } from "@/config/chartLayout";

export type IndexInvestingChartProps = {
  indexId: string;
  indexName: string;
  category?: string;
  country?: string;
  livePrice: number;
  liveChange?: number;
  streamConnected?: boolean;
  /** 사이드바 — 영역 차트 · 거래량 없음 */
  compact?: boolean;
  height?: number;
  period?: SidebarChartPeriod;
  onPeriodChange?: (p: SidebarChartPeriod) => void;
};

export default function IndexInvestingChart({
  indexId,
  indexName,
  category,
  country,
  livePrice,
  liveChange,
  streamConnected = false,
  compact = false,
  height = compact ? CHART_HEIGHT.sidebar : CHART_HEIGHT.hubDesktop,
  period: periodProp,
  onPeriodChange,
}: IndexInvestingChartProps) {
  const [localPeriod, setLocalPeriod] = useState<SidebarChartPeriod>(DEFAULT_SIDEBAR_CHART_PERIOD);
  const [intradayInterval, setIntradayInterval] = useState<IntradayIntervalId>("5m");

  const period = periodProp ?? localPeriod;

  useEffect(() => {
    setLocalPeriod(DEFAULT_SIDEBAR_CHART_PERIOD);
    setIntradayInterval("5m");
  }, [indexId]);

  const setPeriod = (p: string) => {
    const next = normalizeChartPeriod(p) as SidebarChartPeriod;
    syncIntradayForChartPeriod(next, setIntradayInterval);
    if (onPeriodChange) onPeriodChange(next);
    else setLocalPeriod(next);
  };

  useEffect(() => {
    if (periodProp != null) syncIntradayForChartPeriod(periodProp, setIntradayInterval);
  }, [periodProp]);

  const historyInterval = indexHistoryInterval(period, intradayInterval);
  const anchorPrice = livePrice > 0 ? livePrice : seedHubIndexQuote(indexId).price;

  const {
    data: history,
    isLoading: chartLoading,
    isFetching: chartFetching,
    isError: chartError,
  } = useQuery({
    queryKey: ["indexHistory", indexId, period, historyInterval ?? ""],
    queryFn: () =>
      getIndexHistory(
        indexId,
        period,
        anchorPrice > 0 ? anchorPrice : undefined,
        historyInterval,
      ),
    enabled: Boolean(indexId),
    staleTime: period === "1d" ? 12_000 : 30_000,
    retry: 2,
    refetchInterval: chartHistoryRefetchMs(period, streamConnected),
  });

  const historyAligned = alignedStockHistory(history, period);
  const historyPeriodMismatch = Boolean(history && !historyAligned);
  const chartBusy =
    chartLoading || historyPeriodMismatch || (chartFetching && !historyAligned);
  const chartDataInterval = chartDisplayInterval(period, historyAligned);

  const { displayPoints, statusNote, usingFallback } = useMemo(
    () =>
      buildIndexChartDisplay({
        history: historyAligned,
        chartLoading: chartBusy,
        chartError,
        period,
        livePrice,
        anchorPrice,
      }),
    [
      historyAligned,
      chartBusy,
      chartError,
      period,
      livePrice,
      anchorPrice,
    ]
  );

  const chartLiveTail =
    period === "1d" &&
    displayPoints.length >= 2 &&
    livePrice > 0 &&
    !usingFallback;

  const liveOhlc = useMemo(() => {
    if (!chartLiveTail) return undefined;
    return liveOhlcForPeriod(displayPoints, livePrice);
  }, [displayPoints, chartLiveTail, livePrice]);

  const hasVolume = useMemo(
    () => displayPoints.some((p) => (p.volume ?? 0) > 0),
    [displayPoints]
  );

  const streamMeta = indexChartStreamMeta(indexId, { category, country });
  const decimals = priceDecimalsForIndex(indexId, livePrice);
  const referencePrice =
    liveChange != null && Number.isFinite(liveChange)
      ? livePrice - liveChange
      : undefined;

  const chartType = compact ? "area" : "candle";
  const showVolume = !compact && hasVolume;
  const showIntraday = !compact && period === "1d";

  return (
    <>
      <InvestingStyleChart
        key={`${indexId}|${period}|${historyInterval ?? "d"}`}
        compact={compact}
        indexChart={!compact}
        hideChartTypes
        chartType={chartType}
        showVolume={showVolume}
        enableLiveTail={chartLiveTail}
        symbolLabel={indexName}
        subtitle={streamMeta.venueLabel}
        points={displayPoints}
        loading={chartBusy}
        height={height}
        period={period}
        onPeriodChange={setPeriod}
        periodOptions={SIDEBAR_CHART_PERIODS}
        hidePeriodToolbar={false}
        priceDecimals={decimals}
        dataInterval={chartDataInterval}
        liveOhlc={liveOhlc}
        referencePrice={referencePrice}
        market={streamMeta.market}
        venueLabel={streamMeta.venueLabel}
        showIntradayToolbar={showIntraday}
        intradayInterval={intradayInterval}
        onIntradayIntervalChange={setIntradayInterval}
        showPageTitle={false}
      />
      {statusNote && (
        <p
          className={compact ? "inv-sidebar-chart-meta" : "inv-index-detail-chart-note"}
          role="status"
        >
          {statusNote}
        </p>
      )}
    </>
  );
}
