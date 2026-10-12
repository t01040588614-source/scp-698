"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockKeyStats, type KeyStatsRow } from "@/services/chartApi";
import type { ChartMarket } from "@/services/chartApi";
import LoadingState from "@/components/common/LoadingState";
import { formatCompactVolume } from "@/lib/format";

type Props = {
  symbol: string;
  market: ChartMarket;
  /** WebSocket·캐시 당일 누적 거래량 (REST보다 최신) */
  liveVolume?: number;
};

function StatCell({ row, quoteHref }: { row: KeyStatsRow; quoteHref: string }) {
  if (row.kind === "locked") {
    return (
      <div className="inv-key-stats-row">
        <span className="inv-key-stats-label">
          {row.label}
          {row.premium ? <sup className="inv-key-stats-pro">P</sup> : null}
        </span>
        <Link href={quoteHref} className="inv-key-stats-unlock" title="종목 상세에서 더 보기">
          <span className="inv-key-stats-lock" aria-hidden />
          더 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="inv-key-stats-row">
      <span className="inv-key-stats-label">{row.label}</span>
      <span className="inv-key-stats-value tabular">{row.value ?? "-"}</span>
    </div>
  );
}

export default function ChartMajorStatistics({ symbol, market, liveVolume }: Props) {
  const [compactView, setCompactView] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stockKeyStats", symbol, market],
    queryFn: () => getStockKeyStats({ symbol, market }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="inv-key-stats">
        <LoadingState rows={3} />
      </div>
    );
  }

  if (isError || !data?.columns?.length) {
    return null;
  }

  const columns = data.columns.map((col) =>
    col.map((row) => {
      if (row.label === "거래량" && liveVolume != null && liveVolume > 0) {
        return { ...row, value: formatCompactVolume(liveVolume) };
      }
      return row;
    })
  );

  const quoteHref = market === "korea" ? `/quote/korea/${symbol}` : `/quote/us/${symbol}`;

  return (
    <section className="inv-key-stats" aria-labelledby="inv-key-stats-title">
      <header className="inv-key-stats-head">
        <div className="inv-key-stats-head-left">
          <h3 id="inv-key-stats-title" className="inv-key-stats-title">
            주요 통계
          </h3>
          <button type="button" className="inv-key-stats-help" title="시세·일봉·참고 재무 기준" aria-label="도움말">
            ?
          </button>
          <button
            type="button"
            className="inv-key-stats-edit"
            onClick={() => setCompactView((v) => !v)}
          >
            {compactView ? "전체 보기" : "편집하기"}
          </button>
        </div>
        <div className="inv-key-stats-head-right">
          <button
            type="button"
            className="inv-key-stats-ai"
            onClick={() => {
              document.getElementById("chart")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="inv-key-stats-ai-icon" aria-hidden>
              ✦
            </span>
            AI {symbol} 상승 혹은 하락?
          </button>
          <Link href={quoteHref} className="inv-key-stats-more">
            {symbol}의 지표 더 보기
          </Link>
        </div>
      </header>

      <div className={`inv-key-stats-grid${compactView ? " inv-key-stats-grid--compact" : ""}`}>
        {columns.map((col, ci) => (
          <div key={ci} className="inv-key-stats-col">
            {(compactView ? col.slice(0, 4) : col).map((row, ri) => (
              <StatCell key={`${ci}-${ri}-${row.label}`} row={row} quoteHref={quoteHref} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
