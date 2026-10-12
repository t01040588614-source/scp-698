"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MarketIndexQuote } from "@/types/stock";
import { getWsStocksUrl } from "@/lib/apiBase";
import { patchTickFromLivePrice } from "@/lib/liveQuoteMerge";
import {
  mergeTicksIntoMaps,
  normalizeWsIndex,
  normalizeWsTick,
  type LiveStockTick,
} from "@/lib/wsNormalize";

const RECONNECT_MS = 4000;

export type MarketStreamSubscription = {
  symbols: string[];
  indexIds: string[];
};

type MarketWebSocketContextValue = {
  quotes: Record<string, number>;
  ticks: Record<string, LiveStockTick>;
  indices: MarketIndexQuote[];
  isConnected: boolean;
  register: (payload: MarketStreamSubscription) => () => void;
};

const MarketWebSocketContext = createContext<MarketWebSocketContextValue | null>(null);

function unionSubscriptions(map: Map<number, MarketStreamSubscription>): MarketStreamSubscription {
  const symSet = new Set<string>();
  const idxSet = new Set<string>();
  map.forEach((sub) => {
    for (const s of sub.symbols) symSet.add(s);
    for (const id of sub.indexIds) idxSet.add(id);
  });
  return {
    symbols: Array.from(symSet).sort(),
    indexIds: Array.from(idxSet).sort(),
  };
}

export function MarketWebSocketProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const [ticks, setTicks] = useState<Record<string, LiveStockTick>>({});
  const [indices, setIndices] = useState<MarketIndexQuote[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const subsMap = useRef(new Map<number, MarketStreamSubscription>());
  const subCounter = useRef(0);
  const mergedRef = useRef<MarketStreamSubscription>({ symbols: [], indexIds: [] });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const sendSubscribe = useCallback((ws: WebSocket, payload: MarketStreamSubscription) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        action: "subscribe",
        symbols: payload.symbols,
        indexIds: payload.indexIds,
      })
    );
  }, []);

  const flushSubscribe = useCallback(() => {
    mergedRef.current = unionSubscriptions(subsMap.current);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      sendSubscribe(ws, mergedRef.current);
    }
  }, [sendSubscribe]);

  const register = useCallback(
    (payload: MarketStreamSubscription) => {
      const id = subCounter.current++;
      subsMap.current.set(id, {
        symbols: [...payload.symbols],
        indexIds: [...payload.indexIds],
      });
      flushSubscribe();
      return () => {
        subsMap.current.delete(id);
        flushSubscribe();
      };
    },
    [flushSubscribe]
  );

  useEffect(() => {
    unmounted.current = false;
    const wsUrl = getWsStocksUrl();

    const connect = () => {
      if (unmounted.current) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted.current) return;
          setIsConnected(true);
          sendSubscribe(ws, mergedRef.current);
        };

        const applyTicksArray = (data: unknown) => {
          if (!Array.isArray(data)) return;
          const next: Record<string, LiveStockTick> = {};
          const pricePatch: Record<string, number> = {};
          for (const raw of data as Record<string, unknown>[]) {
            const tick = normalizeWsTick(raw);
            if (tick) {
              next[tick.symbol] = tick;
              pricePatch[tick.symbol] = tick.price;
            }
          }
          if (Object.keys(next).length === 0) return;
          setTicks((prev) => ({ ...prev, ...next }));
          setQuotes((prev) => ({ ...prev, ...pricePatch }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as {
              type?: string;
              data?: unknown;
            };
            if (message.type === "ticks") {
              applyTicksArray(message.data);
            }
            if (message.type === "quotes" && message.data && typeof message.data === "object") {
              const pricePatch = message.data as Record<string, number>;
              setQuotes((prev) => ({
                ...prev,
                ...pricePatch,
              }));
              setTicks((prev) => {
                let next: Record<string, LiveStockTick> | null = null;
                for (const [sym, price] of Object.entries(pricePatch)) {
                  if (!Number.isFinite(price)) continue;
                  const patched = patchTickFromLivePrice(prev[sym], price);
                  if (!patched) continue;
                  patched.symbol = sym;
                  const cur = (next ?? prev)[sym];
                  if (cur?.price === patched.price && cur?.changePercent === patched.changePercent) {
                    continue;
                  }
                  if (!next) next = { ...prev };
                  next[sym] = patched;
                }
                return next ?? prev;
              });
            }
            if (message.type === "all_stocks" && Array.isArray(message.data)) {
              const next: Record<string, LiveStockTick> = {};
              const pricePatch: Record<string, number> = {};
              mergeTicksIntoMaps(message.data as Record<string, unknown>[], next, pricePatch);
              setTicks((prev) => ({ ...prev, ...next }));
              setQuotes((prev) => ({ ...prev, ...pricePatch }));
            }
            if (message.type === "indices" && Array.isArray(message.data)) {
              const parsed = (message.data as Record<string, unknown>[]).map(normalizeWsIndex);
              setIndices((prev) => {
                const map = new Map(prev.map((i) => [i.id, i]));
                for (const item of parsed) {
                  if (item.id) map.set(item.id, item);
                }
                return Array.from(map.values());
              });
            }
          } catch {
            // ignore malformed frames
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          if (!unmounted.current) {
            reconnectTimer.current = setTimeout(connect, RECONNECT_MS);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        reconnectTimer.current = setTimeout(connect, RECONNECT_MS);
      }
    };

    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sendSubscribe]);

  const value = useMemo(
    () => ({ quotes, ticks, indices, isConnected, register }),
    [quotes, ticks, indices, isConnected, register]
  );

  return (
    <MarketWebSocketContext.Provider value={value}>{children}</MarketWebSocketContext.Provider>
  );
}

export function useMarketWebSocketContext() {
  return useContext(MarketWebSocketContext);
}
