"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { IntlStock, KoreaStock, USStock } from "@/types/stock";
import { readWatchlist } from "@/lib/watchlistFacade";
import { readPriceAlerts } from "@/lib/priceAlerts";
import { stockApi } from "@/lib/api";

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
    for (const entry of readWatchlist()) {
      if (entry.symbol) set.add(entry.symbol);
    }
    for (const alert of readPriceAlerts()) {
      if (alert.enabled && !alert.triggeredAt && alert.symbol) {
        set.add(alert.symbol);
      }
    }
  }
  return Array.from(set).sort();
}

function sameSymbolList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** React Query·관심종목·백엔드 캐시 전 종목 — 전역 WS 구독용 */
export function useAllCachedStockSymbols(): string[] {
  const qc = useQueryClient();
  const [fromLists, setFromLists] = useState<string[]>(() => collectStockSymbols(qc));
  const [fromApi, setFromApi] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    const next = collectStockSymbols(qc);
    setFromLists((prev) => (sameSymbolList(prev, next) ? prev : next));
  }, [qc]);

  useEffect(() => {
    refresh();
    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        refresh();
      }, 400);
    };
    const unsub = qc.getQueryCache().subscribe((event) => {
      const head = event.query.queryKey[0];
      if (
        typeof head === "string" &&
        (STOCK_QUERY_KEYS as readonly string[]).includes(head)
      ) {
        scheduleRefresh();
      }
    });
    const onWatchlist = () => scheduleRefresh();
    window.addEventListener("local-watchlist-changed", onWatchlist);
    window.addEventListener("price-alerts-changed", onWatchlist);
    return () => {
      unsub();
      window.removeEventListener("local-watchlist-changed", onWatchlist);
      window.removeEventListener("price-alerts-changed", onWatchlist);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qc, refresh]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void stockApi
        .getMarketSymbols()
        .then((res) => {
          if (cancelled) return;
          const list = res.data?.symbols;
          if (!Array.isArray(list) || !list.length) return;
          const sorted = Array.from(new Set(list.filter(Boolean))).sort();
          setFromApi((prev) => (sameSymbolList(prev, sorted) ? prev : sorted));
        })
        .catch(() => {
          /* 백엔드 준비 전 — 목록 쿼리만 사용 */
        });
    };
    load();
    const timer = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return useMemo(() => {
    const set = new Set<string>([...fromLists, ...fromApi]);
    return Array.from(set).sort();
  }, [fromLists, fromApi]);
}
