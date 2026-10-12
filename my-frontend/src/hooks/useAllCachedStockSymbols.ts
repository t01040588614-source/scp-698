"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { IntlStock, KoreaStock, USStock } from "@/types/stock";
import { readLocalWatchlist } from "@/lib/localWatchlist";

const STOCK_QUERY_KEYS = ["koreaStocks", "usStocks", "asiaStocks", "europeStocks"] as const;

function collectStockSymbols(qc: QueryClient): string[] {
  const set = new Set<string>();
  for (const key of STOCK_QUERY_KEYS) {
    const data = qc.getQueryData<(KoreaStock | USStock | IntlStock)[]>([key]);
    for (const row of data ?? []) {
      if (row?.symbol) set.add(row.symbol);
    }
  }
  if (typeof window !== "undefined") {
    for (const entry of readLocalWatchlist()) {
      if (entry.symbol) set.add(entry.symbol);
    }
  }
  return Array.from(set).sort();
}

/** React Query·관심종목에 등장한 모든 심볼 — 전역 WS 구독용 */
export function useAllCachedStockSymbols(): string[] {
  const qc = useQueryClient();
  const [symbols, setSymbols] = useState<string[]>(() => collectStockSymbols(qc));

  const refresh = useCallback(() => {
    setSymbols(collectStockSymbols(qc));
  }, [qc]);

  useEffect(() => {
    refresh();
    const unsub = qc.getQueryCache().subscribe((event) => {
      const head = event.query.queryKey[0];
      if (
        typeof head === "string" &&
        (STOCK_QUERY_KEYS as readonly string[]).includes(head)
      ) {
        refresh();
      }
    });
    const onWatchlist = () => refresh();
    window.addEventListener("local-watchlist-changed", onWatchlist);
    return () => {
      unsub();
      window.removeEventListener("local-watchlist-changed", onWatchlist);
    };
  }, [qc, refresh]);

  return symbols;
}
