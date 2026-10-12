"use client";

import { useQuery } from "@tanstack/react-query";
import { krStockApi } from "@/services/krStockApi";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";

type Props = {
  symbol: string;
  market: "korea" | "us";
  changePercent: number;
  currentPrice: number;
};

export default function InvestingEquityInsightsPanel({
  symbol,
  market,
  changePercent,
  currentPrice,
}: Props) {
  const { data: consensus } = useQuery({
    queryKey: ["kr-consensus-panel", symbol],
    queryFn: () => krStockApi.getConsensus(symbol).then((r) => r.data),
    enabled: market === "korea",
  });

  const target = consensus?.targetPriceAvg;
  const upside =
    target && currentPrice > 0 ? ((target - currentPrice) / currentPrice) * 100 : null;

  const techLabel =
    changePercent > 2 ? "적극 매수" : changePercent < -2 ? "적극 매도" : "중립";
  const techDeg = changePercent > 2 ? 75 : changePercent < -2 ? 25 : 50;

  return (
    <aside className="inv-equity-insights">
      <section className="inv-equity-insights-card">
        <header className="inv-equity-insights-head">
          <h2 className="inv-equity-insights-title">
            {symbol} 점수
            <span className="inv-equity-insights-pro">Pro</span>
          </h2>
        </header>
        <p className="inv-equity-insights-label">회사의 상태</p>
        <div className="inv-equity-insights-bar" aria-hidden>
          <span className="seg seg--bad" />
          <span className="seg seg--mid" />
          <span className="seg seg--good" />
          <span className="seg seg--best" />
        </div>
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">적정가치</h3>
        <button type="button" className="inv-equity-insights-lock" disabled>
          🔒 가격 확인하기
        </button>
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
        <p className={`inv-equity-insights-strong ${priceClass(1)}`}>적극 매수</p>
        {consensus && target ? (
          <>
            <p className="inv-equity-insights-row">
              <span>목표 주가</span>
              <strong className="tabular">{formatPrice(target, 0)}</strong>
            </p>
            {upside != null && (
              <p className={`inv-equity-insights-row ${priceClass(upside)}`}>
                <span>상승 여력</span>
                <strong className="tabular">{formatPercent(upside)}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="inv-equity-insights-muted">컨센서스 데이터 준비 중</p>
        )}
      </section>

      <section className="inv-equity-insights-card">
        <h3 className="inv-equity-insights-subtitle">유저들의 센티멘트</h3>
        <div className="inv-equity-sentiment-btns">
          <button type="button" className="inv-equity-sentiment inv-equity-sentiment--bear" disabled>
            🐻 하락
          </button>
          <button type="button" className="inv-equity-sentiment inv-equity-sentiment--bull" disabled>
            🐂 상승
          </button>
        </div>
      </section>

      <section className="inv-equity-insights-card inv-equity-insights-card--tips">
        <h3 className="inv-equity-insights-subtitle">ProTips</h3>
        <p className="inv-equity-insights-tip">🔒 올해 순이익이 증가할 것입니다</p>
      </section>
    </aside>
  );
}
