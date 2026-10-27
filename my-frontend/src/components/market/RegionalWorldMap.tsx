"use client";

import { useMemo } from "react";
import AppLink from "@/components/common/AppLink";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import type { MarketIndexQuote } from "@/types/stock";
import type { MarketRegionId } from "@/lib/regionalMarkets";
import { indexMarketsHref } from "@/lib/indexStrip";
import {
  buildRegionMapZoneDetails,
  type MapRegionId,
} from "@/lib/regionMapStats";
import { computeBreadth } from "@/lib/regionalMarkets";
import { formatIndexPrice, formatPercent, priceClass } from "@/lib/format";
import { buildSparklinePoints } from "@/lib/sparklineData";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import MarketSummaryBar from "./MarketSummaryBar";
import Sparkline from "./Sparkline";

/** 작은 배지 — 영어 지역명과 겹치지 않도록 한글 표기 */
const REGION_LOCAL: Record<MapRegionId, string> = {
  korea: "한국",
  asia: "아시아",
  us: "미국",
  europe: "유럽",
};

function panelTrendClass(changePercent: number): string {
  if (changePercent > 0.05) return " inv-world-map-panel--up";
  if (changePercent < -0.05) return " inv-world-map-panel--down";
  return " inv-world-map-panel--flat";
}

type RegionalWorldMapProps = {
  indices: MarketIndexQuote[];
  stockChanges: Record<MapRegionId, number[]>;
  activeRegion: MarketRegionId;
  onRegionSelect: (
    region: MarketRegionId,
    options?: { scrollToDetail?: boolean; openStocksTab?: boolean }
  ) => void;
  streamConnected?: boolean;
};

export default function RegionalWorldMap({
  indices,
  stockChanges,
  activeRegion,
  onRegionSelect,
  streamConnected = false,
}: RegionalWorldMapProps) {
  const zones = useMemo(
    () => buildRegionMapZoneDetails({ indices, stockChanges }),
    [indices, stockChanges]
  );

  const indexPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const z of zones) {
      for (const row of z.indices) {
        map[row.id] = row.price;
      }
    }
    return map;
  }, [zones]);
  const priceFlash = usePriceFlash(indexPriceMap);

  const globalBreadth = useMemo(() => {
    const all: number[] = [];
    for (const id of Object.keys(stockChanges) as MapRegionId[]) {
      all.push(...(stockChanges[id] ?? []));
    }
    return computeBreadth(all);
  }, [stockChanges]);

  return (
    <section
      className={`inv-world-map${streamConnected ? " is-stream-live" : ""}`}
      aria-label="지역별 시장 개요"
    >
      <div className="inv-world-map-head">
        <div className="inv-world-map-head-main">
          <div className="inv-world-map-title-row">
            <h3 className="inv-world-map-title">지역별 시장 개요</h3>
            <LiveStreamBadge
              connected={streamConnected}
              showOffline
              className="inv-world-map-stream-badge"
            />
          </div>
          <p className="inv-world-map-desc">
            지역별로 <strong>지수 흐름</strong>과 <strong>종목 상승·하락 비율</strong>을 비교해 보세요.
            카드나 상단 탭을 누르면 아래 지수·종목 목록이 그 지역만 보이도록 바뀝니다.
            {streamConnected ? " 시세는 실시간으로 갱신됩니다." : ""}
          </p>
        </div>
        <ul className="inv-world-map-legend" aria-label="등락률 색상">
          <li>
            <span className="inv-world-map-legend-swatch inv-world-map-legend-swatch--up" />
            상승
          </li>
          <li>
            <span className="inv-world-map-legend-swatch inv-world-map-legend-swatch--flat" />
            보합
          </li>
          <li>
            <span className="inv-world-map-legend-swatch inv-world-map-legend-swatch--down" />
            하락
          </li>
        </ul>
      </div>

      <p className="inv-world-map-swipe-hint" aria-hidden>
        ← 좌우로 밀어 다른 지역 보기 →
      </p>

      <div className="inv-world-map-grid">
        {zones.map((z) => {
          const showLive = streamConnected && (z.live || z.stockCount > 0);
          return (
            <article
              key={z.id}
              className={`inv-world-map-panel${panelTrendClass(z.changePercent)}${
                activeRegion === z.id ? " is-active" : ""
              }`}
            >
              <button
                type="button"
                className="inv-world-map-panel-select"
                aria-pressed={activeRegion === z.id}
                aria-label={`${z.label} 시장 — 지수 ${z.indices.length}개, 종목 ${z.stockCount}개`}
                onClick={() => onRegionSelect(z.id)}
              >
                <span className="inv-world-map-panel-head">
                  <span className="inv-world-map-panel-title">
                    <span className="inv-world-map-region-code">{REGION_LOCAL[z.id]}</span>
                    <span className="inv-world-map-region-label">{z.label}</span>
                  </span>
                  <span
                    className={`inv-world-map-panel-avg tabular ${priceClass(z.changePercent)}`}
                    title="대표 지수·종목 등락률 평균"
                  >
                    <span className="inv-world-map-panel-avg-label">지수·종목 평균</span>
                    {formatPercent(z.changePercent)}
                  </span>
                </span>

                <div className="inv-world-map-index-block">
                  <div className="inv-world-map-index-head" aria-hidden>
                    <span>지수</span>
                    <span className="inv-world-map-index-head-trend">추이</span>
                    <span>현재가</span>
                    <span>등락</span>
                  </div>
                  <ul className="inv-world-map-index-list" aria-label={`${z.label} 대표 지수`}>
                    {z.indices.map((row) => {
                      const flashDir = priceFlash[row.id];
                      const spark = buildSparklinePoints(row.id, row.price, row.changePercent);
                      return (
                        <li key={row.id} className="inv-world-map-index-row">
                          <AppLink
                            href={indexMarketsHref(row.id)}
                            className="inv-world-map-index-name"
                            onClick={(e) => e.stopPropagation()}
                            title={`${row.name} 차트 보기`}
                          >
                            {row.name}
                          </AppLink>
                          <span className="inv-world-map-index-spark">
                            <Sparkline
                              points={spark}
                              width={48}
                              height={22}
                              positive={row.changePercent >= 0}
                            />
                          </span>
                          <span
                            className={`inv-world-map-index-price tabular${
                              flashDir ? ` is-flash-${flashDir}` : ""
                            }`}
                          >
                            {formatIndexPrice(row.id, row.price)}
                          </span>
                          <span
                            className={`inv-world-map-index-pct tabular ${priceClass(row.changePercent)}`}
                          >
                            {formatPercent(row.changePercent)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <p
                  className={`inv-world-map-panel-action${
                    activeRegion === z.id ? " is-active" : ""
                  }`}
                >
                  {activeRegion === z.id
                    ? "✓ 선택됨 — 종목 탭·아래 목록에 적용 중"
                    : "탭하면 종목 탭으로 이동 · 이 지역만 보기"}
                </p>

                <div className="inv-world-map-panel-foot">
                  <div className="inv-world-map-breadth-head">
                    <span className="inv-world-map-breadth-label">
                      종목 {z.stockCount.toLocaleString("ko-KR")} · 상승/하락
                    </span>
                    {showLive ? (
                      <span className="inv-world-map-live-tag" title="WebSocket 시세 반영 중">
                        <span className="inv-world-map-live-dot" aria-hidden />
                        LIVE
                      </span>
                    ) : null}
                  </div>
                  <MarketSummaryBar breadth={z.breadth} className="inv-world-map-breadth-bar" />
                  <p className="inv-world-map-breadth-counts tabular">
                    <span className="price-up">상승 {z.breadth.advance}</span>
                    {" · "}
                    <span className="price-muted">보합 {z.breadth.unchanged}</span>
                    {" · "}
                    <span className="price-down">하락 {z.breadth.decline}</span>
                  </p>
                </div>
              </button>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className={`inv-world-map-overview${activeRegion === "overview" ? " is-active" : ""}`}
        aria-pressed={activeRegion === "overview"}
        onClick={() => onRegionSelect("overview", { openStocksTab: false })}
      >
        <span className="inv-world-map-card-flag" aria-hidden>
          🌐
        </span>
        <span className="inv-world-map-overview-body">
          <span className="inv-world-map-overview-title">전체 시장 보기</span>
          <span className="inv-world-map-overview-meta">
            4개 권역 지수·종목을 한 번에 · 개요/지수/종목 탭은 그대로 유지
          </span>
          <span className="inv-world-map-overview-breadth">
            <MarketSummaryBar breadth={globalBreadth} className="inv-world-map-overview-bar" />
            <span className="inv-world-map-overview-counts tabular">
              <span className="price-up">상승 {globalBreadth.advance}</span>
              {" · "}
              <span className="price-down">하락 {globalBreadth.decline}</span>
            </span>
          </span>
        </span>
      </button>
    </section>
  );
}
