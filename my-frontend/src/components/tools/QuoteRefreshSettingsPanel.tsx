"use client";

import { useQuoteRefreshSettings } from "@/context/QuoteRefreshSettingsContext";
import { scaleRefreshMs, type QuoteRefreshPreset } from "@/lib/marketRefreshSettings";
import { stocksListRefetchMs } from "@/lib/marketRefreshIntervals";

export default function QuoteRefreshSettingsPanel() {
  const { preset, userPreset, autoYahooThrottled, setPreset, presets } = useQuoteRefreshSettings();
  const exampleListMs = stocksListRefetchMs(true, false, true);

  return (
    <section className="panel inv-table-panel quote-refresh-panel" aria-labelledby="quote-refresh-title">
      <div className="inv-toolbar system-status-toolbar">
        <div>
          <h2 id="quote-refresh-title" className="system-status-title">
            자동 시세 새로고침
          </h2>
          <p className="text-muted-sm quote-refresh-desc">
            현재가·등락은 WebSocket(장중 ~0.35초)이 기준입니다. 아래는 REST·캐시 보조 동기화입니다.
            {autoYahooThrottled ? (
              <>
                {" "}
                <strong>Yahoo 429·지연 — 절약 모드 자동 적용 중</strong> (복구 시{" "}
                {userPreset === "live" ? "실시간" : userPreset === "eco" ? "절약" : "균형"}으로 복귀).
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="quote-refresh-options" role="radiogroup" aria-label="시세 폴링 프리셋">
        {presets.map((row) => {
          const id = row.id as QuoteRefreshPreset;
          const active = preset === id;
          return (
            <label
              key={id}
              className={`quote-refresh-option${active ? " is-active" : ""}`}
            >
              <input
                type="radio"
                name="quote-refresh-preset"
                value={id}
                checked={active}
                onChange={() => setPreset(id)}
              />
              <span className="quote-refresh-option-label">{row.label}</span>
              <span className="quote-refresh-option-hint">{row.description}</span>
            </label>
          );
        })}
      </div>
      <p className="system-status-note quote-refresh-foot">
        장중·WS 연결 시 종목 목록 약 {Math.round(exampleListMs / 1000)}초마다 동기화 · 캐시 자동
        갱신 {scaleRefreshMs(4_000)}ms 주기
      </p>
    </section>
  );
}
