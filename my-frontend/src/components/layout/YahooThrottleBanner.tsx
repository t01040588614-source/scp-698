"use client";

import SystemStatusLink from "@/components/navigation/SystemStatusLink";
import { useQuoteRefreshSettings } from "@/context/QuoteRefreshSettingsContext";

/** Yahoo 429 등 — 자동 절약 모드 안내 */
export default function YahooThrottleBanner() {
  const { autoYahooThrottled, userPreset } = useQuoteRefreshSettings();

  if (!autoYahooThrottled) return null;

  const presetLabel =
    userPreset === "live" ? "실시간" : userPreset === "eco" ? "절약" : "균형";

  return (
    <div className="yahoo-throttle-banner" role="status">
      <div className="container ws-offline-banner-inner">
        <span>
          Yahoo Finance 요청 제한(429) 또는 지연이 감지되어 시세 갱신·폴링을 자동으로 완화했습니다.
          복구되면 <strong>{presetLabel}</strong> 설정으로 돌아갑니다.
        </span>
        <SystemStatusLink>상태</SystemStatusLink>
      </div>
    </div>
  );
}
