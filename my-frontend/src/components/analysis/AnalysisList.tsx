"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import {
  koreaToEquity,
  resolveLiveEquityQuote,
  usToEquity,
  type EquityQuote,
} from "@/lib/equityQuotes";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { buildAnalysisListBundle, sortEquitiesForAnalysis } from "@/services/analysisApi";
import { formatRelativeTime } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import { countryFlag } from "@/lib/regionalMarkets";
import type { KoreaStock, USStock } from "@/types/stock";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import { stocksListRefetchMs } from "@/lib/marketRefreshIntervals";

const TAGS = ["한국 종목", "미국 종목", "산업 분석", "매크로", "외환"] as const;

function subnavLabel(t: (typeof TAGS)[number]): string {
  if (t === "한국 종목") return `${countryFlag("KR")} 한국 종목`;
  if (t === "미국 종목") return `${countryFlag("US")} 미국 종목`;
  return t;
}

function analysisSubnavClass(t: (typeof TAGS)[number]): string {
  const base = ["inv-subnav-btn"];
  if (t === "한국 종목") base.push("inv-subnav-btn--analysis-kr");
  if (t === "미국 종목") base.push("inv-subnav-btn--analysis-us");
  if (t === "산업 분석") base.push("inv-subnav-btn--analysis-sector");
  if (t === "매크로") base.push("inv-subnav-btn--analysis-macro");
  if (t === "외환") base.push("inv-subnav-btn--analysis-fx");
  return base.filter(Boolean).join(" ");
}

function analysisRowClass(item: { tag: string; market?: "korea" | "us" }): string | undefined {
  if (item.market === "korea" || item.tag === "한국 종목") return "inv-analysis-row--kr";
  if (item.market === "us" || item.tag === "미국 종목") return "inv-analysis-row--us";
  return undefined;
}

function withLiveQuote(
  row: EquityQuote,
  liveQuotes: Record<string, number>,
  liveTicks: Record<string, import("@/lib/wsNormalize").LiveStockTick>
): EquityQuote {
  const live = resolveLiveEquityQuote(row, liveQuotes[row.symbol], liveTicks[row.symbol]);
  return {
    ...row,
    price: live.price,
    change: live.change,
    changePercent: live.changePercent,
    volume: "volume" in live && live.volume > 0 ? live.volume : row.volume,
  };
}

export default function AnalysisList() {
  const [tag, setTag] = useState<(typeof TAGS)[number]>("한국 종목");
  const streamConnected = useMarketWebSocketContext()?.isConnected ?? false;
  const stocksPollMs = stocksListRefetchMs(streamConnected);

  const {
    data: koreaStocks,
    isLoading: krLoading,
    isError: krError,
    refetch: refetchKr,
  } = useQuery<KoreaStock[], Error>({
    queryKey: ["koreaStocks"],
    queryFn: async () => {
      const r = await stockApi.getKoreaStocks();
      return r.data ?? [];
    },
    enabled: tag === "한국 종목",
    refetchInterval: tag === "한국 종목" ? stocksPollMs : false,
    staleTime: 2_000,
  });

  const {
    data: usStocks,
    isLoading: usLoading,
    isError: usError,
    refetch: refetchUs,
  } = useQuery<USStock[], Error>({
    queryKey: ["usStocks"],
    queryFn: async () => {
      const r = await stockApi.getUSStocks();
      return r.data ?? [];
    },
    enabled: tag === "미국 종목",
    refetchInterval: tag === "미국 종목" ? stocksPollMs : false,
    staleTime: 2_000,
  });

  const symbols = useMemo(() => {
    if (tag === "한국 종목") return (koreaStocks ?? []).map((s) => s.symbol);
    if (tag === "미국 종목") return (usStocks ?? []).map((s) => s.symbol);
    return [];
  }, [tag, koreaStocks, usStocks]);

  const { quotes: liveQuotes, ticks: liveTicks, isConnected } = useMarketWebSocket(symbols, []);

  const bundle = useMemo(() => {
    const krRows = (koreaStocks ?? [])
      .map(koreaToEquity)
      .sort(sortEquitiesForAnalysis)
      .map((row) => withLiveQuote(row, liveQuotes, liveTicks));
    const usRows = (usStocks ?? [])
      .map(usToEquity)
      .sort(sortEquitiesForAnalysis)
      .map((row) => withLiveQuote(row, liveQuotes, liveTicks));
    const feed = isConnected ? "websocket" : "rest";
    return buildAnalysisListBundle(krRows, usRows, feed);
  }, [koreaStocks, usStocks, liveQuotes, liveTicks, isConnected]);

  const items = useMemo(
    () => bundle.data.filter((item) => item.tag === tag),
    [bundle.data, tag]
  );

  const tabCountLabel = useMemo(() => {
    if (tag === "한국 종목") return `한국 ${bundle.counts.korea}종목`;
    if (tag === "미국 종목") return `미국 ${bundle.counts.us}종목`;
    return `리포트 ${items.length}건`;
  }, [tag, bundle.counts, items.length]);

  const isStockTab = tag === "한국 종목" || tag === "미국 종목";
  const krNeeded = tag === "한국 종목";
  const usNeeded = tag === "미국 종목";

  const koreaCount = (koreaStocks ?? []).length;
  const usCount = (usStocks ?? []).length;

  const isLoading =
    (krNeeded && krLoading && koreaCount === 0) || (usNeeded && usLoading && usCount === 0);
  const isError =
    (krNeeded && krError && koreaCount === 0) || (usNeeded && usError && usCount === 0);

  return (
    <section className="panel inv-table-panel">
      <div className="inv-toolbar inv-toolbar--compact system-status-toolbar">
        <span className="inv-toolbar-meta">
          {tabCountLabel}
          {isStockTab
            ? isConnected
              ? " · WebSocket 약 1초 갱신"
              : " · REST 약 12초 갱신"
            : null}
        </span>
        <LiveStreamBadge connected={isConnected} showOffline />
      </div>
      <div className="inv-subnav" role="tablist" aria-label="분석 카테고리">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tag === t}
            className={[analysisSubnavClass(t), tag === t ? "is-active" : ""].filter(Boolean).join(" ")}
            onClick={() => setTag(t)}
          >
            {subnavLabel(t)}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState rows={8} />}
      {isError && (
        <ErrorState
          onRetry={() => {
            if (krNeeded) void refetchKr();
            if (usNeeded) void refetchUs();
          }}
        />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState title="분석 콘텐츠가 없습니다." description="시세 API 연결 후 다시 시도해 주세요." />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <div className="inv-table-wrap">
          <table className="inv-table inv-analysis-table">
            <thead>
              <tr>
                <th scope="col" className="inv-col-name">
                  제목
                </th>
                <th scope="col" className="inv-hide-sm">
                  종목
                </th>
                <th scope="col">작성</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const rowClass = analysisRowClass(item);
                return (
                <tr key={item.id} className={rowClass || undefined}>
                  <td className="inv-col-name">
                    {item.href ? (
                      <Link href={item.href} className="inv-name-link">
                        <strong className="inv-analysis-title">{item.title}</strong>
                      </Link>
                    ) : (
                      <strong className="inv-analysis-title">{item.title}</strong>
                    )}
                  </td>
                  <td className="inv-hide-sm tabular">
                    {item.symbol ? (
                      <Link
                        href={item.href ?? "#"}
                        className={`inv-name-link inv-analysis-symbol${
                          item.market === "korea" ? " inv-analysis-symbol--kr" : ""
                        }${item.market === "us" ? " inv-analysis-symbol--us" : ""}`}
                      >
                        {item.symbol}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="inv-analysis-author-cell">
                    <span className="inv-analysis-author">
                      {item.symbol ? "MarketLens" : item.author}
                      {item.symbol ? (
                        <span
                          className={`inv-analysis-feed${isConnected ? " is-live" : ""}`}
                        >
                          {isConnected ? "Live" : "Sync"}
                        </span>
                      ) : null}
                    </span>
                    {!item.symbol ? (
                      <time
                        className="inv-analysis-author-time"
                        dateTime={item.publishedAt}
                      >
                        {formatRelativeTime(item.publishedAt)}
                      </time>
                    ) : null}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
      <footer className="inv-table-footer">
        <span>
          {isStockTab
            ? bundle.status === "live" ||
              (tag === "한국 종목" && koreaCount > 0) ||
              (tag === "미국 종목" && usCount > 0)
              ? "선택한 시장 종목 — WS 연결 시 틱·등락률 기준 분석이 약 1초마다, 끊기면 REST 12초 주기로 맞춥니다."
              : "시세 API 연결 후 종목 분석이 표시됩니다."
            : "고정 리포트 콘텐츠입니다."}{" "}
          분석 자료는 참고용이며 투자 권유가 아닙니다.
        </span>
      </footer>
    </section>
  );
}
