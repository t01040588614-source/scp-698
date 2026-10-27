"use client";

import { useEffect, useMemo } from "react";
import type { MarketIndexQuote } from "@/types/stock";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { useStableSymbolList } from "@/hooks/useStableSymbolList";
import type { LiveStockTick } from "@/lib/wsNormalize";
import { pickWsQuote, pickWsTick } from "@/lib/wsSymbolKey";

export function useMarketWebSocket(symbols: string[] = [], indexIds: string[] = []) {
  const ctx = useMarketWebSocketContext();

  const stableSymbols = useStableSymbolList(symbols);
  const stableIndexIds = useStableSymbolList(indexIds);

  useEffect(() => {
    if (!ctx) return;
    return ctx.register({ symbols: stableSymbols, indexIds: stableIndexIds });
  }, [ctx, stableSymbols, stableIndexIds]);

  const quotes = useMemo(() => {
    if (!ctx) return {};
    const out: Record<string, number> = {};
    for (const s of stableSymbols) {
      const tick = pickWsTick(s, ctx.ticks);
      const t = tick?.price;
      const q = pickWsQuote(s, ctx.quotes);
      if (t !== undefined && Number.isFinite(t) && t > 0) out[s] = t;
      else if (q !== undefined && Number.isFinite(q)) out[s] = q;
    }
    return out;
  }, [ctx, stableSymbols]);

  const indices = useMemo((): MarketIndexQuote[] => {
    if (!ctx || stableIndexIds.length === 0) return [];
    const allowed = new Set(stableIndexIds);
    return ctx.indices.filter((i) => allowed.has(i.id));
  }, [ctx, stableIndexIds]);

  const ticks = useMemo((): Record<string, LiveStockTick> => {
    if (!ctx) return {};
    const out: Record<string, LiveStockTick> = {};
    for (const s of stableSymbols) {
      const t = pickWsTick(s, ctx.ticks);
      if (t) out[s] = t;
    }
    return out;
  }, [ctx, stableSymbols]);

  return {
    quotes,
    ticks,
    indices,
    isConnected: ctx?.isConnected ?? false,
  };
}

/** @deprecated use useMarketWebSocket — symbols only */
export function useStockWebSocket(symbols: string[] = []) {
  const { quotes, isConnected } = useMarketWebSocket(symbols, []);
  return { quotes, isConnected };
}
