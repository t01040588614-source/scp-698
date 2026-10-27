"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import type { IntlStock, KoreaStock, USStock } from "@/types/stock";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import { normalizeStockQuoteFields } from "@/lib/stockQuoteFields";
import type { LiveStockTick } from "@/lib/wsNormalize";
import { pickWsQuote, pickWsTick } from "@/lib/wsSymbolKey";

const THROTTLE_MS = 120;

function patchStockList<T extends { symbol: string; price: number }>(
  list: T[] | undefined,
  ticks: Record<string, LiveStockTick>,
  quotes: Record<string, number>
): T[] | undefined {
  if (!list?.length) return list;
  let changed = false;
  const next = list.map((item) => {
    const tick = pickWsTick(item.symbol, ticks);
    const quote = pickWsQuote(item.symbol, quotes);
    if (!tick && quote === undefined) return item;
    const merged = mergeLiveStockQuote(
      {
        price: item.price,
        change: (item as { change?: number }).change ?? 0,
        changePercent: (item as { changePercent?: number }).changePercent ?? 0,
        previousClose: (item as { previousClose?: number }).previousClose,
        volume: (item as { volume?: number }).volume,
      },
      quote,
      tick
    );
    const prevVol = (item as { volume?: number }).volume ?? 0;
    const prevChange = (item as { change?: number }).change;
    if (
      item.price === merged.price &&
      "changePercent" in item &&
      (item as { changePercent?: number }).changePercent === merged.changePercent &&
      (prevChange === undefined || prevChange === merged.change) &&
      prevVol === merged.volume
    ) {
      return item;
    }
    changed = true;
    return normalizeStockQuoteFields({
      ...item,
      price: merged.price,
      change: merged.change,
      changePercent: merged.changePercent,
      volume: merged.volume > 0 ? merged.volume : (item as { volume?: number }).volume,
    }) as T;
  });
  return changed ? next : list;
}

/** WebSocket 틱·quotes → React Query 종목 목록 (표·순위·허브 실시간 반영) */
export default function LiveStockQuerySync() {
  const ctx = useMarketWebSocketContext();
  const queryClient = useQueryClient();
  const lastAt = useRef(0);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<{
    ticks: Record<string, LiveStockTick>;
    quotes: Record<string, number>;
  }>({ ticks: {}, quotes: {} });

  useEffect(() => {
    if (!ctx?.isConnected) return;
    const ticks = ctx.ticks ?? {};
    const quotes = ctx.quotes ?? {};
    if (Object.keys(ticks).length === 0 && Object.keys(quotes).length === 0) return;
    latestRef.current = { ticks, quotes };
    const flush = () => {
      pendingTimer.current = null;
      lastAt.current = Date.now();
      const { ticks: t, quotes: q } = latestRef.current;
      queryClient.setQueryData<KoreaStock[]>(["koreaStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<USStock[]>(["usStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<IntlStock[]>(["asiaStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<IntlStock[]>(["europeStocks"], (old) => patchStockList(old, t, q));
    };
    flush();
  }, [ctx?.isConnected, queryClient]);

  useEffect(() => {
    const ticks = ctx?.ticks ?? {};
    const quotes = ctx?.quotes ?? {};
    latestRef.current = { ticks, quotes };
    if (Object.keys(ticks).length === 0 && Object.keys(quotes).length === 0) return;

    const flush = () => {
      pendingTimer.current = null;
      lastAt.current = Date.now();
      const { ticks: t, quotes: q } = latestRef.current;
      queryClient.setQueryData<KoreaStock[]>(["koreaStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<USStock[]>(["usStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<IntlStock[]>(["asiaStocks"], (old) => patchStockList(old, t, q));
      queryClient.setQueryData<IntlStock[]>(["europeStocks"], (old) => patchStockList(old, t, q));
    };

    const now = Date.now();
    const elapsed = now - lastAt.current;
    if (elapsed >= THROTTLE_MS) {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
      flush();
      return;
    }

    if (!pendingTimer.current) {
      pendingTimer.current = setTimeout(flush, THROTTLE_MS - elapsed);
    }
  }, [ctx?.quotes, ctx?.ticks, queryClient]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []);

  return null;
}
