"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readPriceAlerts } from "@/lib/priceAlerts";
import { readWatchlist } from "@/lib/watchlistFacade";

/** WS 구독 — 관심·알림 종목만 (캐시 밖 종목 refresh 유도, 전 종목 목록 subscribe 폭주 방지) */
export function useWatchlistAlertStreamSymbols(): string[] {
  const [symbols, setSymbols] = useState<string[]>([]);

  const sync = useCallback(() => {
    const set = new Set<string>();
    for (const entry of readWatchlist()) {
      if (entry.symbol) set.add(entry.symbol);
    }
    for (const alert of readPriceAlerts()) {
      if (alert.enabled && !alert.triggeredAt && alert.symbol) {
        set.add(alert.symbol);
      }
    }
    const next = Array.from(set).sort();
    setSymbols((prev) => (prev.join("|") === next.join("|") ? prev : next));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("local-watchlist-changed", sync);
    window.addEventListener("price-alerts-changed", sync);
    return () => {
      window.removeEventListener("local-watchlist-changed", sync);
      window.removeEventListener("price-alerts-changed", sync);
    };
  }, [sync]);

  return useMemo(() => symbols, [symbols]);
}
