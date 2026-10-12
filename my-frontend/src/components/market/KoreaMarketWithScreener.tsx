"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KoreaEquitiesBoard from "@/components/market/KoreaEquitiesBoard";
import KoreaScreenerPanel from "@/components/screener/KoreaScreenerPanel";
import EquitiesTable from "@/components/market/EquitiesTable";
import LoadingState from "@/components/common/LoadingState";
import { krStockApi, type KrScreenerConditions } from "@/services/krStockApi";
import type { EquityQuote } from "@/lib/equityQuotes";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";

type Props = { sectorFilter?: string | null };

export default function KoreaMarketWithScreener({ sectorFilter }: Props) {
  const [conditions, setConditions] = useState<KrScreenerConditions>({
    sortBy: "marketCap",
    sortOrder: "DESC",
  });
  const [screenerActive, setScreenerActive] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["kr-screener-list", conditions, screenerActive],
    enabled: screenerActive,
    queryFn: () =>
      krStockApi.listStocks({ ...conditions, limit: 200, offset: 0 }).then((r) => r.data),
  });

  const screenerRows: EquityQuote[] = useMemo(() => {
    if (!data?.stocks) return [];
    return data.stocks.map((s) => {
      const price = s.price ?? 0;
      const change = s.change ?? 0;
      return {
      symbol: s.code,
      name: s.name,
      price,
      change,
      changePercent: s.changePercent ?? 0,
      previousClose: price - change,
      high: s.price ?? 0,
      low: s.price ?? 0,
      open: s.price ?? 0,
      volume: 0,
      market: s.market ?? "KOSPI",
      sector: s.sector,
      currency: "KRW" as const,
      marketCap: s.marketCap,
      peRatio: s.per,
    };
    });
  }, [data]);

  const screenerSymbols = useMemo(() => screenerRows.map((r) => r.symbol), [screenerRows]);
  const { quotes: screenerLiveQuotes, ticks: screenerLiveTicks } = useMarketWebSocket(
    screenerSymbols,
    []
  );

  if (!screenerActive) {
    return (
      <>
        <KoreaScreenerPanel
          value={conditions}
          onChange={setConditions}
          onApply={() => setScreenerActive(true)}
        />
        <KoreaEquitiesBoard sectorFilter={sectorFilter} />
      </>
    );
  }

  return (
    <>
      <KoreaScreenerPanel
        value={conditions}
        onChange={setConditions}
        onApply={() => {
          setScreenerActive(true);
          void refetch();
        }}
      />
      <p className="inv-page-desc">
        스크리너 결과 {data?.total ?? 0}종목
        <button
          type="button"
          className="inv-btn"
          style={{ marginLeft: 12 }}
          onClick={() => setScreenerActive(false)}
        >
          전체 보드로
        </button>
      </p>
      {isLoading ? (
        <LoadingState rows={8} />
      ) : (
        <EquitiesTable
          rows={screenerRows}
          market="korea"
          investingExact
          liveQuotes={screenerLiveQuotes}
          liveTicks={screenerLiveTicks}
        />
      )}
    </>
  );
}
