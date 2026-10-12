"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";

const CARD_IDS = ["kospi", "nasdaq", "dow"] as const;

const CARD_META: Record<(typeof CARD_IDS)[number], { name: string; desc: string }> = {
  kospi: { name: "KOSPI", desc: "한국 종합주가지수" },
  nasdaq: { name: "NASDAQ", desc: "미국 나스닥 종합" },
  dow: { name: "DOW", desc: "다우존스 산업평균" },
};

export default function MarketSummary() {
  const { indices: wsIndices, isConnected } = useMarketWebSocket([], ALL_WS_INDEX_IDS);

  const cards = useMemo(() => {
    const byId = new Map(wsIndices.map((i) => [i.id, i]));
    return CARD_IDS.map((id) => {
      const live = byId.get(id);
      const meta = CARD_META[id];
      return {
        id,
        name: meta.name,
        desc: meta.desc,
        value: live?.price ?? 0,
        change: live?.change ?? 0,
        changePercent: live?.changePercent ?? 0,
        status: live?.status ?? "live",
      };
    });
  }, [wsIndices]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <LiveStreamBadge connected={isConnected} showOffline className="inv-live-badge--inline" />
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isConnected ? "지수 WebSocket 반영" : "지수 REST·시드 — WS 연결 대기"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((index) => {
          const isPositive = index.change >= 0;
          return (
            <div key={index.id} className="card p-5">
              <p className="stock-name">{index.name}</p>
              <p className="stock-symbol mb-3">{index.desc}</p>
              <p className="text-2xl font-bold tabular" style={{ color: "var(--text-primary)" }}>
                {index.value > 0 ? formatPrice(index.value) : "—"}
              </p>
              <div
                className={`flex items-center mt-2 text-sm font-semibold ${priceClass(index.change)}`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1.5" />
                )}
                <span className="tabular">
                  {formatChange(index.change)} ({formatPercent(index.changePercent)})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
