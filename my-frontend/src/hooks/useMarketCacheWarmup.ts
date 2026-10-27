"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useQuoteRefreshSettings } from "@/context/QuoteRefreshSettingsContext";
import {
  cacheStaleThresholdSec,
  cacheWarmupMinGapMs,
  cacheWarmupStatusRefetchMs,
  isAutoCacheWarmupEnabled,
} from "@/lib/marketRefreshSettings";

const STOCK_QUERY_KEYS = [
  ["koreaStocks"],
  ["usStocks"],
  ["asiaStocks"],
  ["europeStocks"],
] as const;

function isReferenceSource(source?: string | null): boolean {
  return source === "reference" || source === "none";
}

/** 참고 시세(reference)일 때 백엔드 갱신을 요청하고 종목 쿼리를 다시 불러옵니다. */
export function useMarketCacheWarmup() {
  const queryClient = useQueryClient();
  const { preset } = useQuoteRefreshSettings();
  const refreshInFlight = useRef(false);
  const lastRefreshAt = useRef(0);

  const { data: cacheStatus } = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: cacheWarmupStatusRefetchMs(preset),
    staleTime: 1_000,
  });

  const needsLive =
    isReferenceSource(cacheStatus?.koreaSource) ||
    isReferenceSource(cacheStatus?.usSource);

  const sessionOpen = Boolean(cacheStatus?.krMarketOpen || cacheStatus?.usMarketOpen);
  const staleSec = cacheStaleThresholdSec(preset);
  const cacheStale =
    sessionOpen &&
    cacheStatus?.cacheAgeSeconds != null &&
    cacheStatus.cacheAgeSeconds > staleSec &&
    !needsLive;

  useEffect(() => {
    if (!isAutoCacheWarmupEnabled(preset)) return;
    if (!needsLive && !cacheStale) return;
    const now = Date.now();
    const minGap = cacheWarmupMinGapMs(needsLive, preset);
    if (refreshInFlight.current || now - lastRefreshAt.current < minGap) return;

    refreshInFlight.current = true;
    lastRefreshAt.current = now;

    void (async () => {
      try {
        await stockApi.refreshMarketCache();
      } catch {
        // ignore — 다음 주기에 재시도
      } finally {
        for (const key of STOCK_QUERY_KEYS) {
          await queryClient.invalidateQueries({ queryKey: key });
        }
        refreshInFlight.current = false;
      }
    })();
  }, [
    needsLive,
    cacheStale,
    preset,
    cacheStatus?.koreaSource,
    cacheStatus?.usSource,
    cacheStatus?.cacheAgeSeconds,
    queryClient,
  ]);

  return {
    cacheStatus,
    needsLive,
    isLiveKorea:
      cacheStatus?.koreaSource === "yahoo" || cacheStatus?.koreaSource === "fdr",
    isLiveUs: cacheStatus?.usSource === "yahoo",
  };
}
