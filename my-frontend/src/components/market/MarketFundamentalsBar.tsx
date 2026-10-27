"use client";

import { coverageLabel, fundamentalsCoverage } from "@/lib/fundamentalsDisplay";
import type { StocksSourceLabel } from "@/lib/mapStocksSource";
import type { EquityQuote } from "@/lib/equityQuotes";

type MarketFundamentalsBarProps = {
  rows: EquityQuote[];
  stocksSource?: StocksSourceLabel;
  market: "korea" | "us";
};

export default function MarketFundamentalsBar({
  rows,
  stocksSource,
  market,
}: MarketFundamentalsBarProps) {
  if (rows.length === 0) return null;

  const cov = fundamentalsCoverage(rows);
  const mcapPct = Math.round(cov.marketCap * 100);
  const pePct = Math.round(cov.pe * 100);
  const lowMcap = cov.marketCap < 0.35;
  const lowPe = cov.pe < 0.2;

  if (!lowMcap && !lowPe && stocksSource !== "reference") return null;

  return (
    <div className="market-fundamentals-bar" role="status">
      {stocksSource === "reference" && (
        <span className="market-fundamentals-bar__chip market-fundamentals-bar__chip--warn">
          참고 시세 · 가격은 FDR/Yahoo 반영 대기
        </span>
      )}
      {market === "korea" && lowMcap && (
        <span className="market-fundamentals-bar__chip">
          시가총액 {mcapPct}% · {coverageLabel(cov.marketCap)}
          {stocksSource === "reference" ? " (KRX Marcap 우선 반영)" : ""}
        </span>
      )}
      {lowPe && (
        <span className="market-fundamentals-bar__chip">
          PER {pePct}% · {coverageLabel(cov.pe)}
        </span>
      )}
    </div>
  );
}
