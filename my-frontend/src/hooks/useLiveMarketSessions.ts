"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getKoreaMarketSession,
  getUSMarketSession,
  type MarketRegionCode,
  type MarketSession,
} from "@/lib/marketHours";
import { stockApi, type MarketRegionSessionPayload, type MarketSessionResponse } from "@/lib/api";

export type LiveMarketSessions = {
  ready: boolean;
  kr: MarketSession;
  us: MarketSession;
  krTooltip: string;
  usTooltip: string;
  krDetail: string | null;
  usDetail: string | null;
  fromApi: boolean;
};

function mapRegion(payload: MarketRegionSessionPayload | undefined, region: MarketRegionCode, now: Date) {
  const session = region === "kr" ? getKoreaMarketSession(now) : getUSMarketSession(now);
  return {
    session,
    tooltip: payload?.tooltip ?? "",
    detail: payload?.detail ?? null,
  };
}

/** 백엔드 /market/session 우선, 실패 시 로컬 캘린더 fallback */
export function useLiveMarketSessions(): LiveMarketSessions {
  const [now, setNow] = useState<Date | null>(null);

  const { data, isSuccess } = useQuery({
    queryKey: ["marketSession"],
    queryFn: async () => {
      const res = await stockApi.getMarketSession();
      return res.data as MarketSessionResponse;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    let timeoutId = 0;
    const schedule = () => {
      const msUntilNextMinute = 60_000 - (Date.now() % 60_000) + 250;
      timeoutId = window.setTimeout(() => {
        tick();
        schedule();
      }, msUntilNextMinute);
    };
    schedule();
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!now) {
    return {
      ready: false,
      kr: "closed",
      us: "closed",
      krTooltip: "",
      usTooltip: "",
      krDetail: null,
      usDetail: null,
      fromApi: false,
    };
  }

  const fromApi = isSuccess && !!data;
  const kr = mapRegion(data?.kr, "kr", now);
  const us = mapRegion(data?.us, "us", now);

  return {
    ready: true,
    kr: kr.session,
    us: us.session,
    krTooltip: kr.tooltip,
    usTooltip: us.tooltip,
    krDetail: kr.detail,
    usDetail: us.detail,
    fromApi,
  };
}
