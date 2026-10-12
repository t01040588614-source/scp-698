"use client";

import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { useStableSymbolList } from "@/hooks/useStableSymbolList";

/** 종목 심볼 목록에 대한 WS 현재가 + 플래시 */
export function useLiveSymbols(symbols: string[]) {
  const unique = useStableSymbolList(symbols);
  const { quotes, ticks, isConnected } = useMarketWebSocket(unique, []);
  const flash = usePriceFlash(quotes);
  return { quotes, ticks, flash, isConnected, symbols: unique };
}
