"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockKeyStats, type KeyStatsRow } from "@/services/chartApi";
import type { ChartMarket } from "@/services/chartApi";
import LoadingState from "@/components/common/LoadingState";
import { formatCompactVolume } from "@/lib/format";
import { buildSymbolTrendPrompt, openMarketAiChat } from "@/lib/marketAiChatEvents";

type Props = {
  symbol: string;
  market: ChartMarket;
  /** WebSocket·캐시 당일 누적 거래량 (REST보다 최신) */
  liveVolume?: number;
  /** 종목 상세 우측 — 단일 열 요약 */
  sidebar?: boolean;
};

function StatCell({ row }: { row: KeyStatsRow }) {
  return (
    <div className="inv-key-stats-row">
      <span className="inv-key-stats-label">{row.label}</span>
      <span className="inv-key-stats-value tabular">{row.value ?? "-"}</span>
    </div>
  );
}

export default function ChartMajorStatistics({
  symbol,
  market,
  liveVolume,
  sidebar = false,
}: Props) {
  const [compactView, setCompactView] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stockKeyStats", symbol, market],
    queryFn: () => getStockKeyStats({ symbol, market }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className={sidebar ? "inv-widget inv-key-stats inv-key-stats--sidebar" : "inv-key-stats"}>
        <LoadingState rows={sidebar ? 5 : 3} />
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
  const flatRows = columns.flat();
  const sidebarRows = (() => {
    const filled = flatRows.filter((row) => row.value && row.value !== "-");
    if (filled.length >= 6) return filled.slice(0, 14);
    const labels = new Set(filled.map((r) => r.label));
    const rest = flatRows.filter((row) => !labels.has(row.label));
    return [...filled, ...rest].slice(0, 14);
  })();

  if (sidebar) {
    return (
      <section
        className="inv-widget inv-key-stats inv-key-stats--sidebar"
        aria-labelledby="inv-key-stats-sidebar-title"
      >
        <header className="inv-key-stats-head">
          <div className="inv-key-stats-head-left">
            <h3 id="inv-key-stats-sidebar-title" className="inv-widget-title inv-key-stats-title">
              주요 통계 요약
            </h3>
          </div>
          <Link href={quoteHref} className="inv-key-stats-more inv-key-stats-more--sidebar">
            전체 보기
          </Link>
        </header>
        <div className="inv-key-stats-grid">
          <div className="inv-key-stats-col">
            {sidebarRows.map((row, ri) => (
              <StatCell key={`sb-${ri}-${row.label}`} row={row} />
            ))}
          </div>
        </div>
        <p className="inv-equity-quote-sidebar-stats-note">
          값이 있는 항목 우선 · 왼쪽 「주요 통계」에서 전체 확인
        </p>
      </section>
    );
  }

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
            aria-label={`AI ${symbol} 상승 혹은 하락 분석`}
            onClick={() => {
              openMarketAiChat({
                symbol,
                market,
                message: buildSymbolTrendPrompt(symbol),
                autoSend: true,
              });
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
              <StatCell key={`${ci}-${ri}-${row.label}`} row={row} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
