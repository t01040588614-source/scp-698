"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketOverview } from "@/services/marketApi";
import { marketTabs } from "@/data/mockData";
import MarketTable from "./MarketTable";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";

export default function MarketOverview() {
  const [activeTab, setActiveTab] = useState(marketTabs[0].id);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["marketOverview", activeTab],
    queryFn: () => getMarketOverview({ tab: activeTab }),
  });

  const symbols = useMemo(
    () => (data?.data ?? []).map((r) => r.symbol).filter(Boolean),
    [data?.data]
  );
  const { quotes, isConnected } = useLiveSymbols(symbols);

  return (
    <section className="panel inv-table-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          시장 현황
          <LiveStreamBadge connected={isConnected} className="inv-live-badge--inline" />
        </h2>
        {data?.updatedAt && (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {data.status === "live" ? "API · " : "mock · "}
            {isFetching ? "갱신 중..." : `업데이트 ${new Date(data.updatedAt).toLocaleTimeString("ko-KR")}`}
          </span>
        )}
      </div>

      <div className="market-tabs" role="tablist" aria-label="시장 카테고리">
        {marketTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`market-tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState rows={4} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          title="표시할 시장 데이터가 없습니다."
          description="잠시 후 다시 확인해주세요."
        />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <MarketTable rows={data.data} liveQuotes={quotes} investingExact />
      )}
    </section>
  );
}
