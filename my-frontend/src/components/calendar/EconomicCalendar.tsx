"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCalendarEvents } from "@/services/calendarApi";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";

function impactClass(impact: "high" | "medium" | "low") {
  if (impact === "high") return "inv-impact-high";
  if (impact === "medium") return "inv-impact-medium";
  return "inv-impact-low";
}

function impactLabel(impact: "high" | "medium" | "low") {
  if (impact === "high") return "높음";
  if (impact === "medium") return "보통";
  return "낮음";
}

interface EconomicCalendarProps {
  compact?: boolean;
  hideShell?: boolean;
  /** 사이드바(미국 시장) 등 기본 국가 필터 */
  defaultCountry?: "ALL" | "KR" | "US";
}

export default function EconomicCalendar({
  compact = false,
  hideShell = false,
  defaultCountry = "ALL",
}: EconomicCalendarProps) {
  const [country, setCountry] = useState<"ALL" | "KR" | "US">(defaultCountry);
  const [impact, setImpact] = useState<"ALL" | "high" | "medium" | "low">("ALL");
  const forceRefresh = useRef(false);

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["calendarEvents"],
    queryFn: async () => {
      const refresh = forceRefresh.current;
      forceRefresh.current = false;
      return getCalendarEvents({ refresh });
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  const hardRefresh = () => {
    forceRefresh.current = true;
    void refetch();
  };

  const events = useMemo(() => {
    let list = data?.data ?? [];
    if (compact) list = list.slice(0, 4);
    if (country !== "ALL") list = list.filter((e) => e.country === country);
    if (impact !== "ALL") list = list.filter((e) => e.impact === impact);
    return list;
  }, [data, compact, country, impact]);

  const inner = (
    <>
      {!compact && (
        <div className="inv-subnav" role="tablist" aria-label="국가 필터">
          {(
            [
              ["ALL", "전체"],
              ["KR", "한국"],
              ["US", "미국"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={country === id}
              className={`inv-subnav-btn ${country === id ? "is-active" : ""}`}
              onClick={() => setCountry(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!compact && (
        <div className="inv-toolbar" style={{ margin: "var(--space-4)", marginBottom: 0 }}>
          <div className="inv-tool-toggles">
            {(
              [
                ["ALL", "전체"],
                ["high", "중요도 높음"],
                ["medium", "보통"],
                ["low", "낮음"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="chart-toggle">
                <input
                  type="radio"
                  name="impact"
                  checked={impact === id}
                  onChange={() => setImpact(id)}
                />
                {label}
              </label>
            ))}
          </div>
          <span className="inv-toolbar-meta">
            {events.length}개 표시
            {data?.krCount != null && data?.usCount != null
              ? ` · KR ${data.krCount} · US ${data.usCount} (전체 기간)`
              : ""}
          </span>
          <button
            type="button"
            className="market-meta-refresh"
            disabled={isFetching}
            title="캘린더 즉시 새로고침"
            onClick={hardRefresh}
          >
            {isFetching ? "…" : "↻"}
          </button>
        </div>
      )}

      {isLoading && <LoadingState rows={4} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && events.length === 0 && (
        <EmptyState title="일정이 없습니다." description="필터 조건을 변경해 보세요." />
      )}
      {!isLoading && !isError && events.length > 0 && compact ? (
        <ul className="inv-calendar-compact">
          {events.map((event) => (
            <li key={event.id} className="inv-calendar-compact-row">
              <div className="inv-calendar-compact-meta">
                <span className="tabular inv-calendar-compact-date">{event.date}</span>
                <span className="tabular inv-calendar-compact-time">{event.time}</span>
                <span className="inv-badge">{event.country}</span>
              </div>
              <p className="inv-calendar-compact-event">{event.event}</p>
              <span className={`inv-impact-pill ${impactClass(event.impact)}`}>
                {impactLabel(event.impact)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {!isLoading && !isError && events.length > 0 && !compact && (
        <div className="inv-table-wrap">
          <table className="inv-table inv-calendar-table">
            <thead>
              <tr>
                <th scope="col">날짜</th>
                <th scope="col">시간</th>
                <th scope="col">국가</th>
                <th scope="col" className="inv-col-name">
                  이벤트
                </th>
                <th scope="col">중요도</th>
                <th scope="col">예상</th>
                <th scope="col">이전</th>
                <th scope="col">실제</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="tabular">{event.date}</td>
                  <td className="tabular">{event.time}</td>
                  <td>
                    <span className="inv-badge">{event.country}</span>
                  </td>
                  <td className="inv-col-name">
                    <strong>{event.event}</strong>
                  </td>
                  <td>
                    <span className={`inv-impact-pill ${impactClass(event.impact)}`}>
                      {impactLabel(event.impact)}
                    </span>
                  </td>
                  <td className="tabular">{event.forecast}</td>
                  <td className="tabular">{event.previous}</td>
                  <td className="tabular">{event.actual ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!compact && (
        <footer className="inv-table-footer">
          <span>
            {data?.status === "mock"
              ? "오프라인 · 샘플 데이터"
              : data?.sources?.length
                ? `데이터: ${data.sources.join(" + ")} · ${data.count ?? events.length}건 (한국·미국 Census/BLS/연준 + 글로벌)`
                : "경제 캘린더 · 갱신 중"}
            {data?.fetchedAt
              ? ` · 조회 ${new Date(data.fetchedAt).toLocaleString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : dataUpdatedAt
                ? ` · UI ${new Date(dataUpdatedAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            {data?.refreshSec ? ` · ${Math.round(data.refreshSec / 60)}분마다 자동 갱신` : ""}
          </span>
        </footer>
      )}
    </>
  );

  if (compact) {
    return (
      <>
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">경제 캘린더</h3>
          <Link href="/calendar" className="inv-widget-more">
            전체 보기
          </Link>
        </header>
        <div className="inv-widget-body">{inner}</div>
      </>
    );
  }

  if (hideShell) {
    return <section className="panel inv-table-panel">{inner}</section>;
  }

  return <section className="panel inv-table-panel">{inner}</section>;
}
