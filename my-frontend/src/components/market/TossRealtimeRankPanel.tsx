"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import TossRankSparkline from "@/components/market/TossRankSparkline";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { useSmoothReorder } from "@/hooks/useSmoothReorder";
import { rankMovePriceClass, useRankMoveTone } from "@/hooks/useRankMoveTone";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import type { KoreaStock, USStock } from "@/types/stock";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import { formatVolumeShort } from "@/lib/chartSeries";

type StockRow = KoreaStock | USStock;

export type TossRankSort = "turnover" | "volume" | "gainers" | "losers";

const SORT_OPTIONS: { id: TossRankSort; label: string }[] = [
  { id: "turnover", label: "거래대금" },
  { id: "volume", label: "거래량" },
  { id: "gainers", label: "급상승" },
  { id: "losers", label: "급하락" },
];

type TossRealtimeRankPanelProps = {
  koreaStocks: StockRow[];
  usStocks: StockRow[];
  /** 한국 정규장 전용 — 미국 세그먼트 숨김 */
  domesticOnly?: boolean;
  /** 차트 탭 — 종목별 당일 미니 차트 */
  sparklines?: boolean;
};

function turnover(row: StockRow): number {
  return (row.price ?? 0) * (row.volume ?? 0);
}

function liveRowMetrics(row: StockRow, livePrice?: number) {
  const price =
    livePrice !== undefined && Number.isFinite(livePrice) ? livePrice : (row.price ?? 0);
  const prev =
    row.previousClose > 0 ? row.previousClose : price - (row.change ?? 0);
  const change = price - prev;
  const changePercent = prev > 0 ? (change / prev) * 100 : (row.changePercent ?? 0);
  return { price, changePercent, volume: row.volume ?? 0, turnover: price * (row.volume ?? 0) };
}

function compareRankRows(
  a: StockRow,
  b: StockRow,
  sort: TossRankSort,
  liveQuotes: Record<string, number>
): number {
  const ma = liveRowMetrics(a, liveQuotes[a.symbol]);
  const mb = liveRowMetrics(b, liveQuotes[b.symbol]);
  let primary = 0;
  if (sort === "turnover") {
    primary = mb.turnover - ma.turnover;
  } else if (sort === "volume") {
    primary = mb.volume - ma.volume;
  } else if (sort === "gainers") {
    primary = mb.changePercent - ma.changePercent;
  } else {
    primary = ma.changePercent - mb.changePercent;
  }
  if (primary !== 0) return primary;
  const byTurnover = turnover(b) - turnover(a);
  if (byTurnover !== 0) return byTurnover;
  return (b.volume ?? 0) - (a.volume ?? 0);
}

function formatTurnover(value: number, market: "korea" | "us"): string {
  if (!value || value <= 0) return "—";
  if (market === "korea") {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
    if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString("ko-KR")}억`;
    if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  }
  return formatVolumeShort(value);
}

function formatMcap(value: number, market: "korea" | "us"): string {
  if (!value || value <= 0) return "—";
  if (market === "korea") {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
    if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return formatVolumeShort(value);
}

export default function TossRealtimeRankPanel({
  koreaStocks,
  usStocks,
  domesticOnly = false,
  sparklines = false,
}: TossRealtimeRankPanelProps) {
  const [market, setMarket] = useState<"korea" | "us">("korea");
  const [sort, setSort] = useState<TossRankSort>(() => (sparklines ? "gainers" : "turnover"));
  const [rankListRef] = useSmoothReorder();

  const poolSymbols = useMemo(() => {
    const pool = domesticOnly || market === "korea" ? koreaStocks : usStocks;
    return pool.map((r) => r.symbol);
  }, [koreaStocks, usStocks, market, domesticOnly]);

  const { quotes: liveQuotes, ticks: liveTicks } = useLiveSymbols(poolSymbols);

  const rows = useMemo(() => {
    const pool = domesticOnly || market === "korea" ? [...koreaStocks] : [...usStocks];
    pool.sort((a, b) => compareRankRows(a, b, sort, liveQuotes));
    return pool.slice(0, 30);
  }, [koreaStocks, usStocks, market, sort, domesticOnly, liveQuotes]);

  const rowSymbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const rankTones = useRankMoveTone(rowSymbols, `${market}-${sort}`);

  const decimals = domesticOnly || market === "korea" ? 0 : 2;
  const quoteBase = domesticOnly ? "korea" : market;
  const showSpark = sparklines && (domesticOnly || market === "korea");
  const sortOptions = useMemo(
    () =>
      showSpark
        ? SORT_OPTIONS.map((o) => (o.id === "gainers" ? { ...o, label: "차트순" } : o))
        : SORT_OPTIONS,
    [showSpark]
  );

  return (
    <section
      className={`toss-rank-section${showSpark ? " toss-rank-section--spark" : ""}`}
      aria-label="순위"
    >
      <div className="toss-rank-toolbar">
        {!domesticOnly && (
          <div className="toss-market-segment" role="tablist" aria-label="시장">
            <button
              type="button"
              role="tab"
              aria-selected={market === "korea"}
              className={`toss-market-segment-btn${market === "korea" ? " is-active" : ""}`}
              onClick={() => setMarket("korea")}
            >
              한국
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={market === "us"}
              className={`toss-market-segment-btn${market === "us" ? " is-active" : ""}`}
              onClick={() => setMarket("us")}
            >
              미국
            </button>
          </div>
        )}
        <div className="toss-filter-row" role="toolbar" aria-label="정렬">
          {sortOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`toss-filter-chip${sort === opt.id ? " is-active" : ""}`}
              onClick={() => setSort(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toss-rank-table-head" aria-hidden>
        <span className="toss-rank-col-rank">순위</span>
        <span className="toss-rank-col-name">종목</span>
        {showSpark && <span className="toss-rank-col-spark">차트</span>}
        <span className="toss-rank-col-price">현재가</span>
        <span className="toss-rank-col-pct">등락률</span>
        <span className="toss-rank-col-turnover">거래대금</span>
        <span className="toss-rank-col-mcap">시가총액</span>
      </div>

      <ol ref={rankListRef} className="toss-rank-list inv-smooth-rank">
        {rows.map((row, idx) => {
          const sym = row.symbol;
          const live = mergeLiveStockQuote(
            {
              price: row.price ?? 0,
              change: row.change ?? 0,
              changePercent: row.changePercent ?? 0,
              previousClose: row.previousClose,
              volume: row.volume,
            },
            liveQuotes[sym],
            liveTicks[sym]
          );
          const pct = live.changePercent ?? 0;
          const mkt = domesticOnly ? "korea" : market;
          return (
            <li key={sym} className="toss-rank-row">
              <span
                className={`toss-rank-col-rank tabular ${rankMovePriceClass(rankTones[sym])}`.trim()}
              >
                {idx + 1}
              </span>
              <Link href={`/quote/${quoteBase}/${sym}`} className="toss-rank-col-name">
                <StockNameWithLogo
                  market={mkt}
                  symbol={sym}
                  name={row.name}
                  size={28}
                  className="toss-rank-name-wrap"
                  nameClassName="toss-rank-name"
                />
              </Link>
              {showSpark && (
                <Link href={`/quote/korea/${sym}`} className="toss-rank-col-spark" aria-label={`${row.name} 차트`}>
                  <TossRankSparkline
                    symbol={sym}
                    livePrice={live.price}
                    positive={pct >= 0}
                    enabled={idx < 20}
                  />
                </Link>
              )}
              <span className="toss-rank-col-price tabular">{formatPrice(live.price, decimals)}</span>
              <span className={`toss-rank-col-pct tabular ${priceClass(pct)}`}>
                {formatPercent(pct)}
              </span>
              <span className="toss-rank-col-turnover tabular">
                {formatTurnover(turnover({ ...row, price: live.price }), mkt)}
              </span>
              <span className="toss-rank-col-mcap tabular">
                {formatMcap(row.marketCap ?? 0, mkt)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="toss-rank-foot">
        <Link href={domesticOnly || market === "korea" ? "/korea" : "/us"}>
          {domesticOnly || market === "korea" ? "한국 종목 더보기" : "미국 종목 더보기"} →
        </Link>
      </div>
    </section>
  );
}
