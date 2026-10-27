"use client";

import { useQueries } from "@tanstack/react-query";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { useWatchlistAlertStreamSymbols } from "@/hooks/useWatchlistAlertStreamSymbols";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";
import { stockApi } from "@/lib/api";

/** 앱 전역 WS — 지수 + 관심·알림 + 목록 프리페치(REST). 시세 push는 서버 캐시 전체 + 화면별 register. */
export default function GlobalMarketStreamBoot() {
  useQueries({
    queries: [
      {
        queryKey: ["koreaStocks"],
        queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
        staleTime: 2_000,
      },
      {
        queryKey: ["usStocks"],
        queryFn: () => stockApi.getUSStocks().then((r) => r.data),
        staleTime: 2_000,
      },
      {
        queryKey: ["asiaStocks"],
        queryFn: () => stockApi.getAsiaStocks().then((r) => r.data),
        staleTime: 2_000,
      },
      {
        queryKey: ["europeStocks"],
        queryFn: () => stockApi.getEuropeStocks().then((r) => r.data),
        staleTime: 2_000,
      },
    ],
  });

  const watchlistAlertSymbols = useWatchlistAlertStreamSymbols();
  useMarketWebSocket(watchlistAlertSymbols, ALL_WS_INDEX_IDS);
  return null;
}
