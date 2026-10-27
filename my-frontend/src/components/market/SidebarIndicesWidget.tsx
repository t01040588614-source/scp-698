"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketIndicesResilient } from "@/services/marketApi";
import {
  DEFAULT_SIDEBAR_CHART_PERIOD,
  SIDEBAR_INDEX_TABS,
  defaultIndexIdForMarket,
  indexIdsForTab,
  type SidebarChartPeriod,
  type SidebarIndexTabId,
} from "@/lib/indexCatalog";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import IndexInvestingChart from "@/components/chart/IndexInvestingChart";
import { formatChange, formatIndexPrice, formatPercent, priceClass } from "@/lib/format";
import { pendingIndexQuote, seedHubIndexQuote } from "@/lib/hubIndexSeeds";
import type { MarketIndexQuote } from "@/types/stock";
import { CHART_HEIGHT } from "@/config/chartLayout";

type SidebarIndicesWidgetProps = {
  market?: "korea" | "us";
  /** 보드에서 공유 WS 사용 시 (중복 연결 방지) */
  liveIndices?: MarketIndexQuote[];
  indicesStreamConnected?: boolean;
  subscribeIndexIds?: string[];
  /** 종목 상세 등 좁은 사이드 — 차트·목록 높이 축소 */
  compact?: boolean;
};

function formatSidebarPrice(id: string, price: number) {
  if (id.includes("krw") || id === "usd-krw" || id === "eur-krw" || id === "jpy-krw") {
    return formatIndexPrice(id, price);
  }
  return formatIndexPrice(id, price);
}

function mergeIndexRows(
  rest: MarketIndexQuote[],
  live: MarketIndexQuote[]
): MarketIndexQuote[] {
  if (live.length === 0) return rest;
  const map = new Map<string, MarketIndexQuote>();
  for (const row of rest) map.set(row.id, row);
  for (const row of live) {
    if (row.price <= 0) continue;
    const prev = map.get(row.id);
    if (!prev) {
      map.set(row.id, row);
      continue;
    }
    const prevFlat = prev.changePercent === 0 && prev.change === 0;
    const liveFlat = row.changePercent === 0 && row.change === 0;
    if (!prevFlat && liveFlat) continue;
    map.set(row.id, { ...prev, ...row });
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
  return ids.map((id) => {
    const row = map.get(id);
    if (row && row.price > 0) return row;
    return pendingIndexQuote(id);
  });
}

export default function SidebarIndicesWidget({
  market = "korea",
  liveIndices: liveIndicesProp,
  indicesStreamConnected: streamConnectedProp,
  subscribeIndexIds,
  compact = false,
}: SidebarIndicesWidgetProps) {
  const [tabId, setTabId] = useState<SidebarIndexTabId>("indices");
  const [selectedId, setSelectedId] = useState(() => defaultIndexIdForMarket(market));
  const [sidebarChartPeriod, setSidebarChartPeriod] =
    useState<SidebarChartPeriod>(DEFAULT_SIDEBAR_CHART_PERIOD);
  const pathname = usePathname();

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
  const pendingCount = items.filter((i) => i.status === "pending" || i.price <= 0).length;

  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    setSidebarChartPeriod(DEFAULT_SIDEBAR_CHART_PERIOD);
  }, [selectedId]);

  useEffect(() => {
    setSelectedId(defaultIndexIdForMarket(market));
    setTabId("indices");
  }, [market]);

  useEffect(() => {
    const match = pathname.match(/\/markets\/indices\/([^/?#]+)/);
    if (!match?.[1]) return;
    const fromUrl = decodeURIComponent(match[1]);
    if (tabIndexIds.includes(fromUrl)) setSelectedId(fromUrl);
  }, [pathname, tabIndexIds]);

  const selected =
    items.find((i) => i.id === selectedId) ??
    items.find((i) => i.price > 0) ??
    items[0];

  const chartLivePrice = selected.price > 0 ? selected.price : seedHubIndexQuote(selected.id).price;

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) map[item.id] = item.price;
    return map;
  }, [items]);

  const flash = usePriceFlash(priceMap);

  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  if (!selected) {
    return (
      <section className="inv-widget inv-sidebar-indices inv-sidebar-indices--live">
        <div className="inv-sidebar-error">표시할 지수가 없습니다.</div>
      </section>
    );
  }

  const chartHeight = compact ? CHART_HEIGHT.sidebarCompact : CHART_HEIGHT.sidebar;

  return (
    <section
      className={`inv-widget inv-sidebar-indices inv-sidebar-indices--live${compact ? " inv-sidebar-indices--compact" : ""}`}
    >
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
          <IndexInvestingChart
            compact
            height={chartHeight}
            indexId={selected.id}
            indexName={selected.name}
            category={selected.category}
            country={selected.country}
            livePrice={chartLivePrice}
            liveChange={selected.price > 0 ? selected.change : 0}
            streamConnected={streamConnected}
            period={sidebarChartPeriod}
            onPeriodChange={setSidebarChartPeriod}
          />
        </div>

        <ul className="inv-sidebar-index-list inv-sidebar-index-list--live">
          {items.map((item) => {
            const isSelected = item.id === selected.id;
            const flashDir = flash[item.id];
            const pending = item.status === "pending" || item.price <= 0;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`inv-sidebar-index-row inv-sidebar-index-row--btn${isSelected ? " is-selected" : ""}${pending ? " is-pending" : ""}`}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="inv-sidebar-index-name">{item.name}</span>
                  <span className="inv-sidebar-index-metrics">
                    <span
                      className={`inv-sidebar-index-price tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
                    >
                      {pending ? "…" : formatSidebarPrice(item.id, item.price)}
                    </span>
                    <span
                      className={`inv-sidebar-index-change tabular ${pending ? "" : priceClass(item.change)}`}
                    >
                      {pending ? "—" : formatChange(item.change, item.price > 100 ? 2 : 4)}
                    </span>
                    <span
                      className={`inv-sidebar-index-chgpct tabular ${pending ? "" : priceClass(item.changePercent)}`}
                    >
                      {pending ? "—" : formatPercent(item.changePercent)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={`inv-sidebar-live-meta tabular${streamConnected ? " is-stream-live" : ""}`}>
          {streamConnected ? "WebSocket · " : "폴링 · "}
          {pendingCount > 0
            ? `지수 ${pendingCount}개 로딩…`
            : dataUpdatedAt
              ? `REST ${new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")}`
              : "갱신 대기"}
          {!indicesFromApi && pendingCount === 0 && (isError || !dataUpdatedAt)
            ? " · API 지연"
            : ""}
          {isError && indicesFromApi ? " · 일부 갱신 실패" : ""}
        </p>
      </div>
    </section>
  );
}
