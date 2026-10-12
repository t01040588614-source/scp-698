"use client";

import { useMemo } from "react";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";

/** REST 시세 + 전역 WS 캐시 병합 */
export function useLiveStockDisplay(
  symbol: string,
  base: {
    price: number;
    change: number;
    changePercent: number;
    previousClose?: number;
  } | null
) {
  useMarketWebSocket(symbol ? [symbol] : [], []);

  const ctx = useMarketWebSocketContext();
  const live = ctx?.quotes[symbol];
  const tick = ctx?.ticks[symbol];

  return useMemo(() => {
    if (!base) {
      if (tick) {
        return {
          price: tick.price,
          change: tick.change,
          changePercent: tick.changePercent,
          isLive: true,
        };
      }
      if (live !== undefined) {
        return { price: live, change: 0, changePercent: 0, isLive: true };
      }
      return null;
    }
    const merged = mergeLiveStockQuote(
      {
        price: base.price,
        change: base.change,
        changePercent: base.changePercent,
        previousClose: base.previousClose,
      },
      live,
      tick
    );
    return {
      ...merged,
      isLive: live !== undefined || tick !== undefined,
    };
  }, [base, live, tick]);
}
