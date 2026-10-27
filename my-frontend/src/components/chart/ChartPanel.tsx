"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import {
  getStockChartEvents,
  getStockHistory,
  type ChartMarket,
} from "@/services/chartApi";
import { resolveChartHistoryInterval, type IntradayIntervalId } from "@/config/chartIntraday";
import {
  directionSymbol,
  formatChange,
  formatPercent,
  formatPrice,
  priceClass,
  priceDecimalsForEquity,
} from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import {
  chartAuxQuoteRefetchMs,
  quoteDetailRefetchMs,
} from "@/lib/marketRefreshSettings";
import InvestingStyleChart, { type InvestingChartType } from "@/components/chart/InvestingStyleChart";
import ChartPeriodPerformanceStrip from "@/components/chart/ChartPeriodPerformanceStrip";
import ChartMajorStatistics from "@/components/chart/ChartMajorStatistics";
import { patchLastPointWithLiveQuote, resolveChartLegendOhlc } from "@/lib/chartSeries";
import type { Stock } from "@/types/stock";
import {
  DEFAULT_CHART_PERIOD,
  chartHistoryRefetchMs,
  normalizeChartPeriod,
  type ChartHubPeriodId,
} from "@/config/chartPeriods";
import {
  alignedStockHistory,
  chartDisplayInterval,
  syncIntradayForChartPeriod,
} from "@/lib/chartPeriodSelection";
import { useChartPeriodReturns } from "@/hooks/useChartPeriodReturns";
import { chartHeightForViewport } from "@/config/chartLayout";

type ChartPanelProps = {
  showSymbolPicker?: boolean;
  /** 종목 상세 등 — Investing 차트 블록(기간·통계)만, 헤더/피커 없음 */
  investingEmbed?: boolean;
  /** Investing.com 종목 페이지 — 기간 스트립 차트 위 */
  investingEquityPage?: boolean;
  initialSymbol?: string;
  initialMarket?: ChartMarket;
  /** 종목 상세 — 상위에서 이미 fetch·WS 병합한 시세 (중복 REST 방지) */
  parentQuote?: Pick<
    Stock,
    "symbol" | "price" | "change" | "changePercent" | "volume" | "open" | "high" | "low" | "previousClose" | "name"
  >;
};

export default function ChartPanel({
  showSymbolPicker = false,
  investingEmbed = false,
  investingEquityPage = false,
  initialSymbol,
  initialMarket,
  parentQuote,
}: ChartPanelProps) {
  const isHub = showSymbolPicker;
  const isInvestingBlock = isHub || investingEmbed;
  const searchParams = useSearchParams();
  const heightVariant = investingEquityPage ? "equity" : isInvestingBlock ? "embed" : "panel";
  const [chartHeight, setChartHeight] = useState(() =>
    chartHeightForViewport(heightVariant, false)
  );
  const [period, setPeriod] = useState<ChartHubPeriodId>(() =>
    investingEquityPage ? "1d" : DEFAULT_CHART_PERIOD,
  );
  const [market, setMarket] = useState<ChartMarket>(initialMarket ?? "korea");
  const [symbol, setSymbol] = useState<string | null>(initialSymbol ?? null);
  const [chartType, setChartType] = useState<InvestingChartType>(
    investingEmbed || showSymbolPicker ? "candle" : "area"
  );
  const [intradayInterval, setIntradayInterval] = useState<IntradayIntervalId>("5m");

  const selectChartPeriod = useCallback((p: ChartHubPeriodId) => {
    const next = normalizeChartPeriod(p);
    setPeriod(next);
    syncIntradayForChartPeriod(next, setIntradayInterval);
    if (next === "1m" || next === "1w") {
      setChartType("candle");
    }
  }, []);

  const historyInterval = resolveChartHistoryInterval(period, intradayInterval);

  useEffect(() => {
    const m = searchParams.get("market");
    const s = searchParams.get("symbol");
    if (m === "korea" || m === "us") setMarket(m);
    if (s) setSymbol(s);
  }, [searchParams]);

  useEffect(() => {
    if (initialMarket) setMarket(initialMarket);
    if (initialSymbol) setSymbol(initialSymbol);
  }, [initialMarket, initialSymbol]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setChartHeight(chartHeightForViewport(heightVariant, mq.matches));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [heightVariant]);

  const wsConnected = useMarketWebSocketContext()?.isConnected ?? false;

  const { data: koreaStocks, isLoading: koreaLoading, isError: koreaError, refetch: refetchKorea } = useQuery({
    queryKey: ["chartKoreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    refetchInterval: chartAuxQuoteRefetchMs(wsConnected),
    staleTime: 2_000,
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const {
    data: usStocks,
    isLoading: usLoading,
    isError: usError,
    refetch: refetchUs,
  } = useQuery({
    queryKey: ["chartUsStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    enabled: showSymbolPicker,
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const marketList = market === "korea" ? koreaStocks : usStocks;
  const marketListLoading = isHub && (market === "korea" ? koreaLoading : usLoading);
  const marketListError = isHub && (market === "korea" ? koreaError : usError);
  const marketListReady = !isHub || (marketList?.length ?? 0) > 0;

  const activeSymbol = useMemo(() => {
    if (symbol) return symbol;
    if (market === "korea") return koreaStocks?.[0]?.symbol ?? null;
    return usStocks?.[0]?.symbol ?? null;
  }, [symbol, market, koreaStocks, usStocks]);

  useEffect(() => {
    if (!isHub || typeof window === "undefined" || !activeSymbol) return;
    const params = new URLSearchParams(window.location.search);
    const nextMarket = market === "us" ? "us" : "korea";
    if (params.get("market") === nextMarket && params.get("symbol") === activeSymbol) return;
    params.set("market", nextMarket);
    params.set("symbol", activeSymbol);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", next);
  }, [isHub, market, activeSymbol]);

  const lead = useMemo(() => {
    const list = market === "korea" ? koreaStocks : usStocks;
    return list?.find((s) => s.symbol === activeSymbol) ?? list?.[0];
  }, [market, koreaStocks, usStocks, activeSymbol]);

  const { quotes, ticks, flash, isConnected } = useLiveSymbols(
    activeSymbol ? [activeSymbol] : []
  );
  const wsTick = activeSymbol ? ticks[activeSymbol] : undefined;
  const wsPrice = activeSymbol ? quotes[activeSymbol] : undefined;

  const useParentQuote =
    investingEmbed &&
    parentQuote != null &&
    activeSymbol != null &&
    parentQuote.symbol === activeSymbol;

  const { data: liveDetail, dataUpdatedAt: liveQuoteAt } = useQuery({
    queryKey: ["liveStockDetail", market, activeSymbol],
    queryFn: async () => {
      if (market === "korea") {
        return (await stockApi.getKoreaStockDetail(activeSymbol!)).data;
      }
      return (await stockApi.getUSStockDetail(activeSymbol!)).data;
    },
    enabled: Boolean(activeSymbol) && !useParentQuote,
    refetchInterval: quoteDetailRefetchMs(isConnected),
    staleTime: 0,
  });

  const leadLive = useParentQuote ? parentQuote : liveDetail ?? lead;

  const {
    data: history,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["stockHistory", activeSymbol, market, period, historyInterval],
    queryFn: () => {
      const list = market === "korea" ? koreaStocks : usStocks;
      const row = list?.find((s) => s.symbol === activeSymbol);
      return getStockHistory({
        symbol: activeSymbol!,
        market,
        period,
        basePrice: row?.price,
        interval: historyInterval,
        requireLiveData: isInvestingBlock,
      });
    },
    enabled: Boolean(activeSymbol) && marketListReady,
    refetchInterval: chartHistoryRefetchMs(period, isConnected),
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const { data: chartEventsData } = useQuery({
    queryKey: ["chartEvents", activeSymbol, market, period],
    queryFn: () =>
      getStockChartEvents({
        symbol: activeSymbol!,
        market,
        period,
      }),
    enabled: Boolean(activeSymbol) && isInvestingBlock,
    staleTime: 300_000,
  });

  const historyAligned = alignedStockHistory(history, period);
  const historyPeriodMismatch = Boolean(history && !historyAligned);
  const historyBusy =
    historyLoading ||
    historyPeriodMismatch ||
    (historyFetching && !historyAligned);
  const summary = historyAligned?.summary;
  const chartDataInterval = chartDisplayInterval(period, historyAligned);

  const quoteMerged = useMemo(() => {
    const basePrice = leadLive?.price ?? summary?.close ?? 0;
    const baseChange = leadLive?.change ?? summary?.change ?? 0;
    const basePct = leadLive?.changePercent ?? summary?.changePercent ?? 0;
    const prevClose = leadLive?.previousClose ?? basePrice - baseChange;
    const baseVol = leadLive?.volume ?? summary?.totalVolume ?? 0;
    return mergeLiveStockQuote(
      {
        price: basePrice,
        change: baseChange,
        changePercent: basePct,
        previousClose: prevClose,
        volume: baseVol,
      },
      wsPrice,
      wsTick
    );
  }, [leadLive, summary, wsPrice, wsTick]);

  const isIntradaySession = useMemo(() => {
    const iv = chartDataInterval ?? "";
    return period === "1d" && /m$|h$/.test(iv);
  }, [chartDataInterval, period]);

  const useSessionHighLow = period === "1d" || isIntradaySession;

  const chartPoints = useMemo(() => {
    return patchLastPointWithLiveQuote(
      historyAligned?.points ?? [],
      {
        price: quoteMerged.price,
        volume: quoteMerged.volume,
        open: leadLive?.open,
        high: leadLive?.high,
        low: leadLive?.low,
      },
      { useSessionHighLow, isIntradaySession },
    );
  }, [
    historyAligned?.points,
    quoteMerged.price,
    quoteMerged.volume,
    leadLive?.open,
    leadLive?.high,
    leadLive?.low,
    useSessionHighLow,
    isIntradaySession,
  ]);

  const chartPointsForDisplay =
    chartPoints.length >= 2 ? chartPoints : (historyAligned?.points ?? []);

  const { returns: periodReturns, loading: perfLoading } = useChartPeriodReturns({
    symbol: activeSymbol,
    market,
    enabled: Boolean(activeSymbol),
    activePeriod: period,
    activePoints: chartPointsForDisplay,
    livePrice: quoteMerged.price,
  });

  const priceDecimals = priceDecimalsForEquity(
    market === "us" ? "us" : "korea",
    quoteMerged.price,
  );
  const priceFlash = activeSymbol ? flash[activeSymbol] : undefined;

  const hasChartData = (historyAligned?.points?.length ?? 0) >= 2;
  const isLoading =
    marketListLoading ||
    (Boolean(activeSymbol) &&
      marketListReady &&
      (historyBusy) &&
      !hasChartData);
  const isError =
    marketListError ||
    (Boolean(activeSymbol) && marketListReady && historyError && !hasChartData);

  const sourceLabel =
    history?.source === "yahoo"
      ? "Yahoo Finance"
      : history?.source === "fdr"
        ? "KRX 일봉 (실제 종가)"
        : history?.source === "synthetic"
          ? "추정 곡선 (실제 차트 아님)"
          : "mock";

  const chartDataWarning =
    history?.source === "synthetic"
      ? "Yahoo·KRX 차트를 불러오지 못해 추정 곡선을 표시 중입니다. 투자 판단용 실제 차트가 아닙니다."
      : history?.source === "fdr" && period === "1d" && !isIntradaySession
        ? "당일 분봉 대신 KRX 일봉으로 표시합니다."
        : history?.source === "fdr" && period !== "1d"
          ? "Yahoo 제한 시 KRX·FDR 일봉으로 표시합니다."
          : null;

  const stockName = lead?.name ?? activeSymbol ?? "";

  if (!activeSymbol) {
    return (
      <section className="inv-chart-hub">
        {marketListLoading ? <LoadingState rows={2} /> : <ErrorState onRetry={() => { void refetchKorea(); void refetchUs(); }} />}
      </section>
    );
  }

  const chartBlock = (
    <InvestingStyleChart
      symbolLabel={activeSymbol}
      subtitle={stockName}
      points={chartPointsForDisplay}
      loading={historyBusy}
      height={chartHeight}
      period={period}
      onPeriodChange={(p) => selectChartPeriod(normalizeChartPeriod(p))}
      hidePeriodToolbar
      chartType={chartType}
      onChartTypeChange={setChartType}
      priceDecimals={priceDecimals}
      hideChartTypes={isInvestingBlock}
      showVolume
      referencePrice={
        leadLive?.previousClose ??
        (chartPointsForDisplay[0]?.open ?? summary?.open)
      }
      chartEvents={chartEventsData?.events}
      eventsLegend={chartEventsData?.legend}
      showIntradayToolbar={isInvestingBlock}
      intradayInterval={intradayInterval}
      onIntradayIntervalChange={setIntradayInterval}
      streamingLayout={isInvestingBlock}
      market={market === "us" ? "us" : "korea"}
      venueLabel={
        market === "korea"
          ? "서울"
          : lead && "exchange" in lead
            ? String(lead.exchange)
            : "NASDAQ"
      }
      equityHub={false}
      equityPage={investingEquityPage}
      enableLiveTail={
        chartPointsForDisplay.length >= 2 &&
        quoteMerged.price > 0 &&
        (isConnected || period !== "1d" || isIntradaySession || chartDataInterval === "1d")
      }
      dataInterval={chartDataInterval}
      liveVolume={isIntradaySession ? undefined : quoteMerged.volume}
      liveOhlc={
        resolveChartLegendOhlc(chartPointsForDisplay, quoteMerged.price, {
          open: leadLive?.open ?? chartPointsForDisplay.at(-1)?.open,
          high: useSessionHighLow ? leadLive?.high : undefined,
          low: useSessionHighLow ? leadLive?.low : undefined,
        }) ?? undefined
      }
    />
  );

  const periodStrip = (
    <ChartPeriodPerformanceStrip
      activePeriod={period}
      onSelect={(p) => selectChartPeriod(normalizeChartPeriod(p))}
      returns={periodReturns}
      loading={perfLoading}
    />
  );

  const chartFrame = (
    <div className="inv-chart-frame" id="chart">
      {chartBlock}
      {periodStrip}
    </div>
  );

  const investingBody = (
    <>
      {chartDataWarning && (
        <p className="inv-chart-data-notice" role="status">
          {chartDataWarning}
        </p>
      )}
      {chartFrame}
      <ChartMajorStatistics symbol={activeSymbol} market={market} liveVolume={quoteMerged.volume} />
    </>
  );

  if (isInvestingBlock) {
    return (
      <section
        className={`inv-chart-hub${investingEquityPage ? " inv-chart-hub--equity-page" : ""}`}
      >
        {isLoading && <LoadingState rows={2} />}
        {isError && (
          <ErrorState
            onRetry={() => {
              if (market === "korea") void refetchKorea();
              else void refetchUs();
              void refetchHistory();
            }}
          />
        )}

        {!isLoading && !isError && (
          <>
            {isHub && (
            <div className="inv-chart-hub-toolbar">
              <div className="inv-chart-hub-pickers">
                <label>
                  시장
                  <select
                    value={market}
                    onChange={(e) => {
                      setMarket(e.target.value as ChartMarket);
                      setSymbol(null);
                    }}
                  >
                    <option value="korea">한국</option>
                    <option value="us">미국</option>
                  </select>
                </label>
                <label>
                  종목
                  <select value={activeSymbol} onChange={(e) => setSymbol(e.target.value)}>
                    {marketList?.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="inv-chart-hub-meta inv-chart-hub-meta--inline">
                <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
                {!isConnected ? (
                  <>
                    <span className="inv-chart-hub-meta-sep">·</span>
                    <span className="market-meta-muted">REST 폴링</span>
                  </>
                ) : null}
                <span className="inv-chart-hub-meta-sep">·</span>
                {sourceLabel}
                {history?.interval ? ` · ${history.interval}` : ""}
                {history?.points?.length ? ` · ${history.points.length}봉` : ""}
                {liveQuoteAt ? (
                  <>
                    <span className="inv-chart-hub-meta-sep">·</span>
                    시세{" "}
                    {new Date(liveQuoteAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    {isConnected ? " WS" : ""}
                  </>
                ) : null}
              </div>
            </div>
            )}

            <div className="inv-chart-hub-body">{investingBody}</div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="panel chart-panel chart-panel--investing">
      {isLoading && <LoadingState rows={2} />}
      {isError && (
        <ErrorState
          onRetry={() => {
            void refetchKorea();
            void refetchHistory();
          }}
        />
      )}

      {!isLoading && !isError && (
        <>
          <div className="chart-header chart-header--investing">
            <div className="chart-summary">
              <span
                className={`chart-price tabular${priceFlash ? ` is-flash-${priceFlash}` : ""}`}
              >
                {formatPrice(quoteMerged.price, priceDecimals)}
              </span>
              <span className={`chart-change tabular ${priceClass(quoteMerged.change)}`}>
                {directionSymbol(quoteMerged.change)} {formatChange(quoteMerged.change)} (
                {formatPercent(quoteMerged.changePercent)})
              </span>
            </div>
            <span className="chart-meta">
              <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
              {!isConnected ? " REST · " : " "}
              {sourceLabel}
              {history?.interval ? ` · ${history.interval}` : ""}
            </span>
          </div>
          {chartFrame}
        </>
      )}
    </section>
  );
}
