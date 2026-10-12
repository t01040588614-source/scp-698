"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketIndicesResilient } from "@/services/marketApi";
import { getIndexHistory, syntheticFromPrice } from "@/services/chartApi";
import {
  SIDEBAR_INDEX_TABS,
  defaultIndexIdForMarket,
  indexIdsForTab,
  chartHistoryRefetchMs,
  normalizeChartPeriod,
  type SidebarChartPeriod,
  type SidebarIndexTabId,
} from "@/lib/indexCatalog";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import InvestingStyleChart from "@/components/chart/InvestingStyleChart";
import { formatChange, formatIndexPrice, formatPercent, priceClass } from "@/lib/format";
import { liveOhlcForPeriod, syncLastPointToLivePrice } from "@/lib/chartSeries";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import type { MarketIndexQuote } from "@/types/stock";
import { CHART_HEIGHT } from "@/config/chartLayout";

type SidebarIndicesWidgetProps = {
  market?: "korea" | "us";
  /** 보드에서 공유 WS 사용 시 (중복 연결 방지) */
  liveIndices?: MarketIndexQuote[];
  indicesStreamConnected?: boolean;
  subscribeIndexIds?: string[];
};

function formatSidebarPrice(id: string, price: number) {
  if (id.includes("krw") || id === "usd-krw" || id === "eur-krw" || id === "jpy-krw") {
    return formatIndexPrice(id, price);
  }
  return formatIndexPrice(id, price);
}

function chartDataCaption(source?: string, interval?: string): string | null {
  if (!source || !interval) return null;
  if (source === "yahoo" && /m$|h$/.test(interval)) {
    return `${interval} · Yahoo (당일·근거래일)`;
  }
  if (source === "yahoo" && interval === "1d") return "일봉 · Yahoo";
  if (source === "fdr") return "일봉 · FDR (Yahoo 제한 시)";
  return null;
}

function mergeIndexRows(
  rest: MarketIndexQuote[],
  live: MarketIndexQuote[]
): MarketIndexQuote[] {
  if (live.length === 0) return rest;
  const map = new Map<string, MarketIndexQuote>();
  for (const row of rest) map.set(row.id, row);
  for (const row of live) {
    map.set(row.id, { ...(map.get(row.id) as MarketIndexQuote | undefined), ...row });
  }
  return Array.from(map.values());
}

/** 탭 고정 id 순서 · API/WS 없을 때 참고 시세 */
function orderedIndexRows(
  ids: string[],
  api: MarketIndexQuote[],
  live: MarketIndexQuote[]
): MarketIndexQuote[] {
  const merged = mergeIndexRows(api, live);
  const map = new Map(merged.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id) ?? seedHubIndexQuote(id));
}

export default function SidebarIndicesWidget({
  market = "korea",
  liveIndices: liveIndicesProp,
  indicesStreamConnected: streamConnectedProp,
  subscribeIndexIds,
}: SidebarIndicesWidgetProps) {
  const [tabId, setTabId] = useState<SidebarIndexTabId>("indices");
  const [selectedId, setSelectedId] = useState(() => defaultIndexIdForMarket(market));
  const [period, setPeriod] = useState<SidebarChartPeriod>("1d");

  const tab = SIDEBAR_INDEX_TABS.find((t) => t.id === tabId) ?? SIDEBAR_INDEX_TABS[1];
  const tabIndexIds = useMemo(() => indexIdsForTab(tab), [tab]);

  const ownStream = liveIndicesProp === undefined;
  const wsIndexIds = subscribeIndexIds ?? tabIndexIds;
  const { indices: ownWsIndices, isConnected: ownWsConnected } = useMarketWebSocket(
    [],
    ownStream ? wsIndexIds : []
  );

  const liveIndices = liveIndicesProp ?? ownWsIndices;
  const streamConnected = streamConnectedProp ?? ownWsConnected;

  const {
    data: indices,
    isError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["sidebarIndices", tabId, tab.category, tab.ids?.join(",")],
    queryFn: async () => {
      if (tab.ids?.length) {
        return fetchMarketIndicesResilient(tab.ids.join(",")).then((r) => r.rows);
      }
      if (tab.category) {
        return fetchMarketIndicesResilient(undefined, tab.category).then((r) => r.rows);
      }
      return fetchMarketIndicesResilient().then((r) => r.rows);
    },
    refetchInterval: streamConnected ? 60_000 : 5_000,
    retry: 1,
  });

  const items = useMemo(
    () => orderedIndexRows(tabIndexIds, indices ?? [], liveIndices),
    [tabIndexIds, indices, liveIndices]
  );

  const indicesFromApi = (indices?.length ?? 0) > 0;

  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    setSelectedId(defaultIndexIdForMarket(market));
    setTabId("indices");
  }, [market]);

  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) map[item.id] = item.price;
    return map;
  }, [items]);

  const flash = usePriceFlash(priceMap);

  const {
    data: history,
    isLoading: chartLoading,
    isError: chartError,
  } = useQuery({
    queryKey: ["sidebarIndexChart", selected?.id, period],
    queryFn: () => getIndexHistory(selected!.id, period, selected!.price),
    enabled: Boolean(selected?.id),
    staleTime: 30_000,
    retry: 1,
    refetchInterval: chartHistoryRefetchMs(period, streamConnected),
  });

  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  const chartPoints = useMemo(() => {
    const pts = history?.points ?? [];
    if (pts.length < 2 || !selected) return pts;
    const p = selected.price;
    return syncLastPointToLivePrice(pts, p);
  }, [history?.points, selected]);

  const insufficientHistoryBars =
    !chartLoading &&
    Boolean(history) &&
    (history?.points?.length ?? 0) > 0 &&
    (history?.points?.length ?? 0) < 2;

  const usingClientFallbackCurve =
    !chartLoading &&
    chartPoints.length < 2 &&
    Boolean(selected?.price && selected.price > 0) &&
    (chartError || history?.source === "synthetic" || insufficientHistoryBars);

  const chartDisplayPoints = useMemo(() => {
    if (chartLoading && chartPoints.length < 2) return [];
    if (chartPoints.length >= 2) return chartPoints;
    if (!selected?.price || selected.price <= 0) return [];
    if (usingClientFallbackCurve) {
      return syntheticFromPrice(selected.price, period);
    }
    return [];
  }, [
    chartLoading,
    chartPoints,
    selected?.price,
    usingClientFallbackCurve,
    period,
  ]);

  const sidebarLiveOhlc = useMemo(() => {
    if (history?.source !== "yahoo" && history?.source !== "fdr") return undefined;
    const px = selected?.price;
    if (px == null || !Number.isFinite(px)) return undefined;
    return liveOhlcForPeriod(chartDisplayPoints, px);
  }, [history?.source, chartDisplayPoints, selected?.price]);

  const chartLiveTail =
    chartDisplayPoints.length >= 2 &&
    selected != null &&
    Number.isFinite(selected.price) &&
    selected.price > 0;

  if (!selected) {
    return (
      <section className="inv-widget inv-sidebar-indices inv-sidebar-indices--live">
        <div className="inv-sidebar-error">표시할 지수가 없습니다.</div>
      </section>
    );
  }

  const priceDecimals =
    selected.id.includes("krw") || selected.price > 1000 ? 2 : selected.price > 100 ? 2 : 2;

  return (
    <section className="inv-widget inv-sidebar-indices inv-sidebar-indices--live">
      <header className="inv-widget-head inv-sidebar-live-head">
        <div className="inv-sidebar-tabs" role="tablist" aria-label="지수 카테고리">
          {SIDEBAR_INDEX_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={tabId === t.id ? "is-active" : undefined}
              aria-selected={tabId === t.id}
              onClick={() => setTabId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="inv-widget-body inv-sidebar-indices-body">
        <div className="inv-sidebar-chart-block inv-sidebar-realtime-chart">
          <InvestingStyleChart
            compact
            hideChartTypes
            chartType="area"
            showVolume={false}
            enableLiveTail={chartLiveTail}
            symbolLabel={selected.id === "oil" ? "CL" : selected.name}
            points={chartDisplayPoints}
            loading={chartLoading}
            height={CHART_HEIGHT.sidebar}
            period={period}
            onPeriodChange={(p) => setPeriod(normalizeChartPeriod(p) as SidebarChartPeriod)}
            priceDecimals={priceDecimals}
            dataInterval={history?.interval}
            liveOhlc={sidebarLiveOhlc}
            referencePrice={
              Number.isFinite(selected.change)
                ? selected.price - selected.change
                : undefined
            }
          />
          {(() => {
            const cap = chartDataCaption(history?.source, history?.interval);
            return cap ? (
              <p className="inv-sidebar-chart-meta" role="status">
                {cap}
              </p>
            ) : null;
          })()}
          {(chartError ||
            history?.source === "synthetic" ||
            insufficientHistoryBars ||
            usingClientFallbackCurve) && (
            <p className="inv-sidebar-chart-warn">
              {insufficientHistoryBars
                ? "차트 봉이 부족해 참고 곡선을 표시합니다. 목록·WS 시세는 WS와 함께 갱신됩니다."
                : history?.source === "synthetic" || usingClientFallbackCurve
                  ? "실제 차트를 불러오지 못해 참고 곡선입니다. 목록·WS 시세는 WS와 함께 갱신됩니다."
                  : "차트 API 실패 — 근사 데이터를 표시합니다."}
            </p>
          )}
        </div>

        <ul className="inv-sidebar-index-list inv-sidebar-index-list--live">
          {items.map((item) => {
            const isSelected = item.id === selected.id;
            const flashDir = flash[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`inv-sidebar-index-row inv-sidebar-index-row--btn${isSelected ? " is-selected" : ""}${flashDir ? ` is-flash-${flashDir}` : ""}`}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="inv-sidebar-index-name">{item.name}</span>
                  <span className="inv-sidebar-index-metrics">
                    <span
                      className={`inv-sidebar-index-price tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
                    >
                      {formatSidebarPrice(item.id, item.price)}
                    </span>
                    <span className={`tabular ${priceClass(item.change)}`}>
                      {formatChange(item.change, item.price > 100 ? 2 : 4)}
                    </span>
                    <span className={`tabular ${priceClass(item.changePercent)}`}>
                      {formatPercent(item.changePercent)}
                    </span>
                    <span
                      className={`inv-index-clock ${item.changePercent >= 0 ? "is-up" : "is-down"}`}
                      title={streamConnected ? "WebSocket" : "폴링 갱신"}
                      aria-hidden
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="inv-sidebar-live-meta tabular">
          {streamConnected ? "WebSocket · " : "폴링 · "}
          {dataUpdatedAt
            ? `REST ${new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")}`
            : "갱신 대기"}
          {!indicesFromApi && (isError || !dataUpdatedAt) ? " · API 지연 — 참고 시세" : ""}
          {isError && indicesFromApi ? " · 일부 갱신 실패" : ""}
        </p>
      </div>
    </section>
  );
}
