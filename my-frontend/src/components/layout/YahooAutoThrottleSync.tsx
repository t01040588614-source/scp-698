"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { cacheStatusRefetchMs } from "@/lib/marketRefreshIntervals";
import { setAutoYahooThrottle } from "@/lib/marketRefreshSettings";

function cacheIndicatesYahooThrottle(data: {
  yahooThrottled?: boolean;
  refreshMode?: string;
  lastError?: string | null;
} | null | undefined): boolean {
  if (!data) return false;
  if (data.yahooThrottled === true || data.refreshMode === "yahoo_throttled") return true;
  const err = data.lastError;
  return err === "yahoo_rate_limit" || err === "yahoo_timeout";
}

/** 백엔드 Yahoo 429·쿨다운 → 프론트 절약 프리셋·폴링 자동 완화 */
export default function YahooAutoThrottleSync() {
  const wsConnected = useMarketWebSocketContext()?.isConnected ?? false;
  const { data } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data;
      const regular = Boolean(status?.krMarketOpen || status?.usMarketOpen);
      return cacheStatusRefetchMs(wsConnected, regular);
    },
    staleTime: 1_000,
  });

  useEffect(() => {
    setAutoYahooThrottle(cacheIndicatesYahooThrottle(data));
  }, [data?.yahooThrottled, data?.refreshMode, data?.lastError, data]);

  return null;
}
