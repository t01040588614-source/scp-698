"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { krStockApi } from "@/services/krStockApi";
import { getStockKeyStats, type ChartMarket } from "@/services/chartApi";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";

type Props = {
  symbol: string;
  market: "korea" | "us";
  changePercent: number;
  currentPrice: number;
  /** 종목 상세 사이드 — 한 카드에 밀도 있게 */
  compact?: boolean;
};

type UserSentiment = "bull" | "bear" | null;

function loadSentiment(symbol: string): UserSentiment {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`ml-user-sentiment-${symbol}`);
  return raw === "bull" || raw === "bear" ? raw : null;
}

export default function InvestingEquityInsightsPanel({
  symbol,
  market,
  changePercent,
  currentPrice,
  compact = false,
}: Props) {
  const [userSentiment, setUserSentiment] = useState<UserSentiment>(null);

  useEffect(() => {
    setUserSentiment(loadSentiment(symbol));
  }, [symbol]);

  const { data: consensus } = useQuery({
    queryKey: ["kr-consensus-panel", symbol],
    queryFn: () => krStockApi.getConsensus(symbol).then((r) => r.data),
    enabled: market === "korea",
  });

  const { data: keyStats } = useQuery({
    queryKey: ["stockKeyStats", symbol, market],
    queryFn: () => getStockKeyStats({ symbol, market: market as ChartMarket }),
    staleTime: 60_000,
  });

  const insights = keyStats?.insights;
  const target = insights?.fairValue ?? consensus?.targetPriceAvg;
  const upside =
    insights?.fairValueUpsidePct ??
    (target && currentPrice > 0 ? ((target - currentPrice) / currentPrice) * 100 : null);

  const techLabel =
    changePercent > 2 ? "적극 매수" : changePercent < -2 ? "적극 매도" : "중립";
  const techDeg = changePercent > 2 ? 75 : changePercent < -2 ? 25 : 50;

  const score = insights?.companyScore ?? 50;
  const scoreLabel = insights?.companyScoreLabel ?? "보통";
  const analystLabel = insights?.analystSentiment ?? "중립";
  const proTip = insights?.proTip ?? "주요 통계와 차트를 함께 확인하세요.";

  const setSentiment = useCallback(
    (value: UserSentiment) => {
      setUserSentiment(value);
      if (typeof window === "undefined") return;
      if (value) {
        localStorage.setItem(`ml-user-sentiment-${symbol}`, value);
      } else {
        localStorage.removeItem(`ml-user-sentiment-${symbol}`);
      }
    },
    [symbol]
  );

  if (compact) {
    return (
      <aside className="inv-equity-insights inv-equity-insights--compact">
        <section className="inv-widget inv-equity-insights-compact-card">
          <header className="inv-widget-head">
            <h2 className="inv-widget-title">투자 인사이트</h2>
            <span className="inv-equity-insights-score-badge tabular">{score}</span>
          </header>
          <div className="inv-equity-insights-compact-body">
            <div className="inv-equity-insights-compact-block">
              <p className="inv-equity-insights-label">
                {symbol} · 회사 상태 <strong>{scoreLabel}</strong>
              </p>
              <div className="inv-equity-insights-bar-wrap inv-equity-insights-bar-wrap--compact">
                <div className="inv-equity-insights-bar" aria-hidden>
                  <span className="seg seg--bad" />
                  <span className="seg seg--mid" />
                  <span className="seg seg--good" />
                  <span className="seg seg--best" />
                </div>
                <span
                  className="inv-equity-insights-bar-marker"
                  style={{ left: `${score}%` }}
                  aria-hidden
                />
              </div>
            </div>
            <div className="inv-equity-insights-compact-block">
              <h3 className="inv-equity-insights-subtitle">적정가치</h3>
              {target ? (
                <>
                  <p className="inv-equity-insights-row">
                    <span>참고 적정가</span>
                    <strong className="tabular">
                      {formatPrice(target, market === "us" ? 2 : 0)}
                    </strong>
                  </p>
                  {upside != null && (
                    <p className={`inv-equity-insights-row ${priceClass(upside)}`}>
                      <span>상승 여력</span>
                      <strong className="tabular">{formatPercent(upside)}</strong>
                    </p>
                  )}
                </>
              ) : (
                <p className="inv-equity-insights-muted">컨센서스·참고 목표가 준비 중</p>
              )}
            </div>
            <div className="inv-equity-insights-compact-block inv-equity-insights-compact-block--inline">
              <div>
                <h3 className="inv-equity-insights-subtitle">기술적</h3>
                <p className="inv-equity-insights-strong">{techLabel}</p>
              </div>
              <div>
                <h3 className="inv-equity-insights-subtitle">애널리스트</h3>
                <p
                  className={`inv-equity-insights-strong ${priceClass(analystLabel.includes("매수") ? 1 : analystLabel.includes("매도") ? -1 : 0)}`}
                >
                  {analystLabel}
                </p>
              </div>
            </div>
            <div className="inv-equity-insights-compact-block">
              <h3 className="inv-equity-insights-subtitle">내 센티멘트</h3>
              <div className="inv-equity-sentiment-btns">
                <button
                  type="button"
                  className={`inv-equity-sentiment inv-equity-sentiment--bear${userSentiment === "bear" ? " is-active" : ""}`}
                  onClick={() => setSentiment(userSentiment === "bear" ? null : "bear")}
                >
                  🐻 하락
                </button>
                <button
                  type="button"
                  className={`inv-equity-sentiment inv-equity-sentiment--bull${userSentiment === "bull" ? " is-active" : ""}`}
                  onClick={() => setSentiment(userSentiment === "bull" ? null : "bull")}
                >
                  🐂 상승
                </button>
              </div>
            </div>
            <p className="inv-equity-insights-tip inv-equity-insights-tip--compact">{proTip}</p>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="inv-equity-insights">
      <section className="inv-equity-insights-card">
        <header className="inv-equity-insights-head">
          <h2 className="inv-equity-insights-title">{symbol} 점수</h2>
          <span className="inv-equity-insights-score-badge tabular">{score}</span>
        </header>
        <p className="inv-equity-insights-label">
          회사의 상태 · <strong>{scoreLabel}</strong>
        </p>
        <div className="inv-equity-insights-bar-wrap">
          <div className="inv-equity-insights-bar" aria-hidden>
            <span className="seg seg--bad" />
            <span className="seg seg--mid" />
            <span className="seg seg--good" />
            <span className="seg seg--best" />
          </div>
          <span
            className="inv-equity-insights-bar-marker"
            style={{ left: `${score}%` }}
            aria-hidden
          />
        </div>
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">적정가치</h3>
        {target ? (
          <>
            <p className="inv-equity-insights-row">
              <span>참고 적정가</span>
              <strong className="tabular">{formatPrice(target, market === "us" ? 2 : 0)}</strong>
            </p>
            {upside != null && (
              <p className={`inv-equity-insights-row ${priceClass(upside)}`}>
                <span>상승 여력</span>
                <strong className="tabular">{formatPercent(upside)}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="inv-equity-insights-muted">컨센서스·참고 목표가 준비 중</p>
        )}
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">기술적 분석</h3>
        <div className="inv-equity-gauge">
          <div
            className="inv-equity-gauge-needle"
            style={{ transform: `rotate(${(techDeg / 100) * 180 - 90}deg)` }}
          />
          <span className="inv-equity-gauge-label">{techLabel}</span>
        </div>
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">애널리스트 센티멘트</h3>
        <p className={`inv-equity-insights-strong ${priceClass(analystLabel.includes("매수") ? 1 : analystLabel.includes("매도") ? -1 : 0)}`}>
          {analystLabel}
        </p>
        {consensus && consensus.targetPriceAvg ? (
          <>
            <p className="inv-equity-insights-row">
              <span>목표 주가</span>
              <strong className="tabular">{formatPrice(consensus.targetPriceAvg, 0)}</strong>
            </p>
            {upside != null && (
              <p className={`inv-equity-insights-row ${priceClass(upside)}`}>
                <span>상승 여력</span>
                <strong className="tabular">{formatPercent(upside)}</strong>
              </p>
            )}
          </>
        ) : target ? null : (
          <p className="inv-equity-insights-muted">컨센서스 데이터 준비 중</p>
        )}
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">유저들의 센티멘트</h3>
        <div className="inv-equity-sentiment-btns">
          <button
            type="button"
            className={`inv-equity-sentiment inv-equity-sentiment--bear${userSentiment === "bear" ? " is-active" : ""}`}
            onClick={() => setSentiment(userSentiment === "bear" ? null : "bear")}
          >
            🐻 하락
          </button>
          <button
            type="button"
            className={`inv-equity-sentiment inv-equity-sentiment--bull${userSentiment === "bull" ? " is-active" : ""}`}
            onClick={() => setSentiment(userSentiment === "bull" ? null : "bull")}
          >
            🐂 상승
          </button>
        </div>
        {userSentiment ? (
          <p className="inv-equity-insights-muted">내 의견이 저장되었습니다 (이 기기)</p>
        ) : null}
      </section>

      <section className="inv-equity-insights-card inv-equity-insights-card--tips">
        <h3 className="inv-equity-insights-subtitle">Insights</h3>
        <p className="inv-equity-insights-tip">{proTip}</p>
      </section>
    </aside>
  );
}
