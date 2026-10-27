"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { type ChartHubPeriodId } from "@/config/chartPeriods";
import { type IntradayIntervalId, investingStreamVenueTag } from "@/config/chartIntraday";
import ChartEventsLegend from "@/components/chart/ChartEventsLegend";
import { DRAW_TOOL_DEFS } from "@/lib/chartDrawTools";
import type { ChartStreamToolsBinding } from "@/components/chart/chartStreamToolsTypes";

type StreamIntervalKey = "5m" | "1h" | "day-bar" | "month-range";

const STREAM_INTERVALS: { key: StreamIntervalKey; label: string }[] = [
  { key: "5m", label: "5" },
  { key: "1h", label: "1시간" },
  { key: "day-bar", label: "1일" },
  { key: "month-range", label: "1달" },
];

type ExtraIntervalKey = "1m" | "2m" | "15m" | "30m" | "5h" | "1w";

const EXTRA_INTERVALS: { key: ExtraIntervalKey; label: string }[] = [
  { key: "1m", label: "1" },
  { key: "2m", label: "2" },
  { key: "15m", label: "15" },
  { key: "30m", label: "30" },
  { key: "5h", label: "5시간" },
  { key: "1w", label: "7일" },
];

const FOOTER_RANGES: { id: ChartHubPeriodId; label: string }[] = [
  { id: "max", label: "전체" },
  { id: "1y", label: "1년" },
  { id: "6m", label: "6달" },
  { id: "5mo", label: "5달" },
  { id: "3m", label: "3달" },
  { id: "1m", label: "1달" },
  { id: "1w", label: "7일" },
  { id: "1d", label: "1일" },
];

type Props = {
  symbolLabel: string;
  subtitle?: string;
  market: "korea" | "us";
  /** 거래소 표기 (없으면 market 기준 KOSPI / NASDAQ) */
  venueLabel?: string;
  activePeriod: ChartHubPeriodId;
  onPeriodChange: (p: ChartHubPeriodId) => void;
  intradayInterval: IntradayIntervalId;
  onIntradayChange: (id: IntradayIntervalId) => void;
  chartType: "area" | "candle" | "line";
  onChartTypeChange: (t: "area" | "candle" | "line") => void;
  eventsLegend?: { key: string; label: string }[];
  clock: string;
  children: ReactNode;
  legend?: ReactNode;
  volumeLabel?: string;
  tools: ChartStreamToolsBinding;
  /** Investing.com 차트 — 상단 헤더·좌측 드로잉 레일 숨김 */
  investingChrome?: boolean;
  /** 종목 상세 — 하단 기간 중복(수익률 스트립 사용) */
  hideFooterRanges?: boolean;
  streamVariant?: "investing" | "toss";
};

const TOSS_FOOTER_RANGES: { id: ChartHubPeriodId; label: string }[] = [
  { id: "1d", label: "1일" },
  { id: "1w", label: "1주" },
  { id: "3m", label: "3개월" },
  { id: "1y", label: "1년" },
  { id: "5y", label: "5년" },
];

export default function ChartStreamingLayout({
  symbolLabel,
  subtitle,
  market,
  venueLabel,
  activePeriod,
  onPeriodChange,
  intradayInterval,
  onIntradayChange,
  chartType,
  onChartTypeChange,
  eventsLegend,
  clock,
  children,
  legend,
  volumeLabel = "거래량 (20)",
  tools,
  investingChrome = true,
  hideFooterRanges = false,
  streamVariant = "investing",
}: Props) {
  const [extraOpen, setExtraOpen] = useState(false);
  const isToss = streamVariant === "toss";

  const venueTag = useMemo(() => investingStreamVenueTag(market, venueLabel), [market, venueLabel]);
  const quoteHref = `/quote/${market}/${encodeURIComponent(symbolLabel)}`;
  const currencyMark = market === "korea" ? "₩" : "$";
  const financialsTitle = market === "korea" ? "재무제표 (원화)" : "재무제표 (USD)";

  const pickStreamInterval = (key: StreamIntervalKey) => {
    switch (key) {
      case "5m":
        onPeriodChange("1d");
        onIntradayChange("5m");
        break;
      case "1h":
        onPeriodChange("1d");
        onIntradayChange("1h");
        break;
      case "day-bar":
        onPeriodChange("6m");
        onIntradayChange("1d");
        break;
      case "month-range":
        onPeriodChange("1m");
        onIntradayChange("1d");
        break;
      default:
        break;
    }
  };

  const pickExtraInterval = (key: ExtraIntervalKey) => {
    setExtraOpen(false);
    switch (key) {
      case "1m":
        onPeriodChange("1d");
        onIntradayChange("1m");
        break;
      case "2m":
        onPeriodChange("1d");
        onIntradayChange("2m");
        break;
      case "15m":
        onPeriodChange("1d");
        onIntradayChange("15m");
        break;
      case "30m":
        onPeriodChange("1d");
        onIntradayChange("30m");
        break;
      case "5h":
        onPeriodChange("1w");
        onIntradayChange("1h");
        break;
      case "1w":
        onPeriodChange("1w");
        onIntradayChange("1d");
        break;
      default:
        break;
    }
  };

  const extraIntervalActive = useMemo(() => {
    if (activePeriod === "1d" && intradayInterval === "1m") return "1m";
    if (activePeriod === "1d" && intradayInterval === "2m") return "2m";
    if (activePeriod === "1d" && intradayInterval === "15m") return "15m";
    if (activePeriod === "1d" && intradayInterval === "30m") return "30m";
    if (activePeriod === "1w" && intradayInterval === "1h") return "5h";
    if (activePeriod === "1w" && intradayInterval === "1d") return "1w";
    return null;
  }, [activePeriod, intradayInterval]);

  const streamIntervalActive = (key: StreamIntervalKey) => {
    switch (key) {
      case "5m":
        return activePeriod === "1d" && intradayInterval === "5m";
      case "1h":
        return activePeriod === "1d" && intradayInterval === "1h";
      case "day-bar":
        return activePeriod === "6m" && intradayInterval === "1d";
      case "month-range":
        return activePeriod === "1m" && intradayInterval === "1d";
      default:
        return false;
    }
  };

  if (isToss) {
    return (
      <div className="inv-stream-chart inv-stream-chart--toss" data-market={market}>
        <div className="inv-stream-main">
          <div className="toss-stream-toolbar">
            <span className="toss-stream-toolbar-label">차트</span>
            {activePeriod === "1d" && (
              <div className="toss-stream-intraday" role="toolbar" aria-label="분봉">
                {(["5m", "15m", "30m", "1h"] as IntradayIntervalId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`toss-stream-chip${intradayInterval === id ? " is-active" : ""}`}
                    onClick={() => onIntradayChange(id)}
                  >
                    {id === "5m" ? "5분" : id === "15m" ? "15분" : id === "30m" ? "30분" : "1시간"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="inv-stream-stage-wrap inv-stream-stage-wrap--toss">
            {legend}
            {children}
          </div>
          <footer className="toss-stream-footer">
            {TOSS_FOOTER_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`toss-stream-range${activePeriod === r.id ? " is-active" : ""}`}
                onClick={() => onPeriodChange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inv-stream-chart${investingChrome ? " inv-stream-chart--investing" : ""}`}
      data-market={market}
    >
      {!investingChrome && (
        <header className="inv-stream-head">
          <div className="inv-stream-head-left">
            <h3 className="inv-stream-title">
              {symbolLabel} 스트리밍 차트
              <span className="inv-stream-info" title="시세·Yahoo/KRX 차트">
                ⓘ
              </span>
            </h3>
            <button type="button" className="inv-stream-ai" onClick={tools.onAiAnalysis}>
              <span aria-hidden>✦</span> AI 차트 분석
            </button>
          </div>
        </header>
      )}

      <div className="inv-stream-body">
        {!investingChrome && (
          <aside className="inv-stream-draw" aria-label="차트 그리기 도구">
            {DRAW_TOOL_DEFS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`inv-stream-draw-btn${tools.activeDrawTool === tool.id ? " is-active" : ""}`}
                title={tool.title}
                aria-pressed={tools.activeDrawTool === tool.id}
                onClick={() => tools.onDrawTool(tool.id)}
              >
                {tool.icon}
              </button>
            ))}
          </aside>
        )}

        <div className="inv-stream-main">
          <div className="inv-stream-toolbar">
            <div className="inv-stream-toolbar-row">
              <div className="inv-stream-symbol-cluster">
                <Link
                  href={quoteHref}
                  className="inv-stream-symbol-box"
                  title={subtitle ? `${subtitle} · ${venueTag}` : venueTag}
                >
                  {symbolLabel}
                </Link>
                <span className="inv-stream-venue-tag" title={market === "korea" ? "한국 시장" : "미국 시장"}>
                  {venueTag}
                </span>
              </div>
              {STREAM_INTERVALS.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`inv-stream-tb-btn${streamIntervalActive(row.key) && !extraIntervalActive ? " is-active" : ""}`}
                  onClick={() => pickStreamInterval(row.key)}
                >
                  {row.label}
                </button>
              ))}
              <div className="inv-stream-interval-more">
                <button
                  type="button"
                  className={`inv-stream-tb-btn inv-stream-tb-btn--caret${extraIntervalActive || extraOpen ? " is-active" : ""}`}
                  aria-expanded={extraOpen}
                  aria-haspopup="listbox"
                  title="더 많은 간격"
                  onClick={() => setExtraOpen((v) => !v)}
                >
                  {extraIntervalActive
                    ? EXTRA_INTERVALS.find((e) => e.key === extraIntervalActive)?.label ?? "▾"
                    : "▾"}
                </button>
                {extraOpen && (
                  <ul className="inv-stream-interval-menu" role="listbox">
                    {EXTRA_INTERVALS.map((row) => (
                      <li key={row.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={extraIntervalActive === row.key}
                          className={extraIntervalActive === row.key ? "is-active" : undefined}
                          onClick={() => pickExtraInterval(row.key)}
                        >
                          {row.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="inv-stream-tb-sep" />
              <button
                type="button"
                className={`inv-stream-tb-icon${chartType === "candle" ? " is-active" : ""}`}
                title="캔들"
                onClick={() => onChartTypeChange("candle")}
              >
                ▥
              </button>
              <button
                type="button"
                className={`inv-stream-tb-icon${chartType === "area" ? " is-active" : ""}`}
                title="영역"
                onClick={() => onChartTypeChange("area")}
              >
                ▤
              </button>
              <button
                type="button"
                className={`inv-stream-tb-icon${chartType === "line" ? " is-active" : ""}`}
                title="라인"
                onClick={() => onChartTypeChange("line")}
              >
                ╱
              </button>
              <button type="button" className="inv-stream-tb-icon" title="종목 비교" onClick={tools.onCompare}>
                +
              </button>
              <button
                type="button"
                className={`inv-stream-tb-icon${tools.showSma20 ? " is-active" : ""}`}
                title="이동평균 (SMA 20)"
                onClick={tools.onToggleSma20}
              >
                ƒx
              </button>
              <button
                type="button"
                className={`inv-stream-tb-icon${tools.settingsOpen ? " is-active" : ""}`}
                title="차트 설정"
                onClick={tools.onToggleSettings}
              >
                ⚙
              </button>
              <button type="button" className="inv-stream-tb-icon" title={financialsTitle} onClick={tools.onFinancials}>
                {currencyMark}
              </button>
              <button type="button" className="inv-stream-tb-icon" title="차트 유형 순환" onClick={tools.onTemplates}>
                ▦
              </button>
              <span className="inv-stream-tb-sep" />
              <button type="button" className="inv-stream-tb-icon" title="스냅샷 저장" onClick={tools.onSnapshot}>
                📷
              </button>
              <button type="button" className="inv-stream-tb-icon" title="화면에 맞춤" onClick={tools.onResetLayout}>
                ⊞
              </button>
              <button type="button" className="inv-stream-tb-icon" title="PNG 다운로드" onClick={tools.onSaveImage}>
                ☁
              </button>
              <button type="button" className="inv-stream-tb-icon" title="전체 화면" onClick={tools.onFullscreen}>
                ⛶
              </button>
              {investingChrome && (
                <>
                  <span className="inv-stream-tb-sep" />
                  <button type="button" className="inv-stream-tb-icon" title="종목 비교" onClick={tools.onCompare}>
                    ⚖
                  </button>
                  <button type="button" className="inv-stream-tb-icon" title="실행 취소" onClick={tools.onUndoDrawing}>
                    ↶
                  </button>
                  <button type="button" className="inv-stream-tb-icon" title="가격 알림" onClick={tools.onPriceAlert}>
                    🔔
                  </button>
                </>
              )}
            </div>
            {!investingChrome && (
              <div className="inv-stream-toolbar-sub">
                <button type="button" className="inv-stream-tb-icon" title="종목 비교" onClick={tools.onCompare}>
                  +
                </button>
                <button type="button" className="inv-stream-tb-icon" title="마지막 그리기 실행 취소" onClick={tools.onUndoDrawing}>
                  ↶
                </button>
                <button type="button" className="inv-stream-tb-icon" title="가격 알림" onClick={tools.onPriceAlert}>
                  🔔
                </button>
                {tools.measureHint ? (
                  <span className="inv-stream-measure-hint" role="status">
                    {tools.measureHint}
                  </span>
                ) : null}
                <ChartEventsLegend items={eventsLegend} />
              </div>
            )}
            {investingChrome && tools.measureHint ? (
              <div className="inv-stream-toolbar-sub inv-stream-toolbar-sub--hint">
                <span className="inv-stream-measure-hint" role="status">
                  {tools.measureHint}
                </span>
                <ChartEventsLegend items={eventsLegend} />
              </div>
            ) : null}
            {tools.settingsOpen && (
              <div className="inv-stream-settings" role="region" aria-label="차트 설정">
                <label>
                  <input type="checkbox" checked={tools.showVolume} onChange={tools.onToggleVolume} />
                  거래량 패널
                </label>
                <label>
                  <input type="checkbox" checked={tools.showGrid} onChange={tools.onToggleGrid} />
                  격자선
                </label>
                <label>
                  <input type="checkbox" checked={tools.showSma20} onChange={tools.onToggleSma20} />
                  SMA 20
                </label>
              </div>
            )}
          </div>

          <div className="inv-stream-stage-wrap">
            {legend}
            <span className="inv-stream-volume-tag">{volumeLabel}</span>
            {children}
            {investingChrome && (
              <div className="inv-stream-nav-float" aria-label="차트 이동·확대">
                <button type="button" title="왼쪽" onClick={() => tools.onPanChart(-1)}>
                  ‹
                </button>
                <button type="button" title="축소" onClick={() => tools.onZoomChart(-1)}>
                  −
                </button>
                <button type="button" title="화면에 맞춤" onClick={tools.onResetLayout}>
                  ⟲
                </button>
                <button type="button" title="확대" onClick={() => tools.onZoomChart(1)}>
                  +
                </button>
                <button type="button" title="오른쪽" onClick={() => tools.onPanChart(1)}>
                  ›
                </button>
              </div>
            )}
          </div>

          <footer className="inv-stream-footer">
            {!hideFooterRanges ? (
              <div className="inv-stream-footer-ranges">
                {FOOTER_RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`inv-stream-range${activePeriod === r.id ? " is-active" : ""}`}
                    onClick={() => onPeriodChange(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
                <button type="button" className="inv-stream-range inv-stream-range--ghost" onClick={tools.onGoToDate}>
                  Go to…
                </button>
              </div>
            ) : (
              <div className="inv-stream-footer-ranges inv-stream-footer-ranges--compact" aria-hidden />
            )}
            <div className="inv-stream-footer-right">
              <span className="inv-stream-clock tabular">{clock} (UTC+9)</span>
              <button
                type="button"
                className={`inv-stream-scale${tools.priceScaleMode === "percent" ? " is-active" : ""}`}
                onClick={() => tools.onPriceScaleMode("percent")}
              >
                %
              </button>
              <button
                type="button"
                className={`inv-stream-scale${tools.priceScaleMode === "log" ? " is-active" : ""}`}
                onClick={() => tools.onPriceScaleMode("log")}
              >
                로그눈금
              </button>
              <button
                type="button"
                className={`inv-stream-scale${tools.priceScaleMode === "normal" ? " is-active" : ""}`}
                onClick={() => tools.onPriceScaleMode("normal")}
              >
                자동
              </button>
              <button
                type="button"
                className={`inv-stream-tb-icon${tools.settingsOpen ? " is-active" : ""}`}
                title="차트 설정"
                onClick={tools.onToggleSettings}
              >
                ⚙
              </button>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
