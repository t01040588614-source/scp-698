"use client";

import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { useAllCachedStockSymbols } from "@/hooks/useAllCachedStockSymbols";
import { ALL_WS_INDEX_IDS } from "@/lib/indexCatalog";

/** 앱 전역 WS — 캐시·관심종목 전체 심볼 + 지수 (AppShell 1회) */
export default function GlobalMarketStreamBoot() {
  const symbols = useAllCachedStockSymbols();
  useMarketWebSocket(symbols, ALL_WS_INDEX_IDS);
  return null;
}
