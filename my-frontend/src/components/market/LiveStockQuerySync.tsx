"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import type { IntlStock, KoreaStock, USStock } from "@/types/stock";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import { normalizeStockQuoteFields } from "@/lib/stockQuoteFields";
import type { LiveStockTick } from "@/lib/wsNormalize";

function patchStockList<T extends { symbol: string; price: number }>(
  list: T[] | undefined,
  ticks: Record<string, LiveStockTick>,
  quotes: Record<string, number>
): T[] | undefined {
  if (!list?.length) return list;
  let changed = false;
  const next = list.map((item) => {
    const tick = ticks[item.symbol];
    const quote = quotes[item.symbol];
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
    if (
      item.price === merged.price &&
      "changePercent" in item &&
      (item as { changePercent?: number }).changePercent === merged.changePercent
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

  useEffect(() => {
    const ticks = ctx?.ticks ?? {};
    const quotes = ctx?.quotes ?? {};
    if (Object.keys(ticks).length === 0 && Object.keys(quotes).length === 0) return;

    const now = Date.now();
    if (now - lastAt.current < 80) return;
    lastAt.current = now;

    queryClient.setQueryData<KoreaStock[]>(["koreaStocks"], (old) =>
      patchStockList(old, ticks, quotes)
    );
    queryClient.setQueryData<USStock[]>(["usStocks"], (old) => patchStockList(old, ticks, quotes));
    queryClient.setQueryData<IntlStock[]>(["asiaStocks"], (old) => patchStockList(old, ticks, quotes));
    queryClient.setQueryData<IntlStock[]>(["europeStocks"], (old) =>
      patchStockList(old, ticks, quotes)
    );
  }, [ctx?.quotes, ctx?.ticks, queryClient]);

  return null;
}
