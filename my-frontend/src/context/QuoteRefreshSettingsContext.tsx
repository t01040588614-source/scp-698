"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  QUOTE_REFRESH_PRESETS,
  defaultQuoteRefreshPreset,
  effectiveQuoteRefreshPreset,
  isAutoYahooThrottleActive,
  readQuoteRefreshPreset,
  writeQuoteRefreshPreset,
  type QuoteRefreshPreset,
} from "@/lib/marketRefreshSettings";

type QuoteRefreshSettingsContextValue = {
  /** 실제 적용 프리셋 (Yahoo 제한 시 eco) */
  preset: QuoteRefreshPreset;
  /** 사용자가 고른 프리셋 */
  userPreset: QuoteRefreshPreset;
  autoYahooThrottled: boolean;
  setPreset: (next: QuoteRefreshPreset) => void;
  presets: typeof QUOTE_REFRESH_PRESETS;
};

const QuoteRefreshSettingsContext = createContext<QuoteRefreshSettingsContextValue | null>(null);

const MARKET_QUERY_PREFIXES = [
  "marketCacheStatus",
  "koreaStocks",
  "usStocks",
  "asiaStocks",
  "europeStocks",
  "health",
  "quote",
] as const;

export function QuoteRefreshSettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [userPreset, setUserPreset] = useState<QuoteRefreshPreset>(defaultQuoteRefreshPreset);
  const [autoYahooThrottled, setAutoYahooThrottled] = useState(false);

  useEffect(() => {
    setUserPreset(readQuoteRefreshPreset());
    setAutoYahooThrottled(isAutoYahooThrottleActive());
  }, []);

  const invalidateMarketQueries = useCallback(() => {
    for (const key of MARKET_QUERY_PREFIXES) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  useEffect(() => {
    const onPreset = (event: Event) => {
      const detail = (event as CustomEvent<QuoteRefreshPreset>).detail;
      if (detail) setUserPreset(detail);
    };
    const onThrottle = (event: Event) => {
      setAutoYahooThrottled(Boolean((event as CustomEvent<boolean>).detail));
      invalidateMarketQueries();
    };
    window.addEventListener("quote-refresh-preset", onPreset);
    window.addEventListener("quote-refresh-auto-throttle", onThrottle);
    return () => {
      window.removeEventListener("quote-refresh-preset", onPreset);
      window.removeEventListener("quote-refresh-auto-throttle", onThrottle);
    };
  }, [invalidateMarketQueries]);

  const setPreset = useCallback(
    (next: QuoteRefreshPreset) => {
      writeQuoteRefreshPreset(next);
      setUserPreset(next);
      invalidateMarketQueries();
    },
    [invalidateMarketQueries]
  );

  const preset = autoYahooThrottled ? "eco" : userPreset;

  const value = useMemo(
    () => ({
      preset,
      userPreset,
      autoYahooThrottled,
      setPreset,
      presets: QUOTE_REFRESH_PRESETS,
    }),
    [preset, userPreset, autoYahooThrottled, setPreset]
  );

  return (
    <QuoteRefreshSettingsContext.Provider value={value}>{children}</QuoteRefreshSettingsContext.Provider>
  );
}

export function useQuoteRefreshSettings(): QuoteRefreshSettingsContextValue {
  const ctx = useContext(QuoteRefreshSettingsContext);
  if (!ctx) {
    throw new Error("useQuoteRefreshSettings must be used within QuoteRefreshSettingsProvider");
  }
  return ctx;
}

/** Yahoo 자동 완화 반영된 프리셋 (컨텍스트 밖 훅·유틸용) */
export function useEffectiveQuoteRefreshPreset(): QuoteRefreshPreset {
  return effectiveQuoteRefreshPreset();
}
