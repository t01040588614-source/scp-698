"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLink from "@/components/common/AppLink";
import { krStockApi } from "@/services/krStockApi";
import { getStockHistory, getStockKeyStats, type ChartMarket } from "@/services/chartApi";
import { stockApi } from "@/lib/api";
import { resolveEquityIndexMembership } from "@/lib/indexMembership";
import LoadingState from "@/components/common/LoadingState";
import { formatPrice } from "@/lib/format";
import NewsList from "@/components/news/NewsList";

type Market = "korea" | "us";

type PanelProps = {
  symbol: string;
  market: Market;
  quoteName?: string;
};

function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inv-widget inv-equity-tab-panel">
      <h2 className="inv-widget-title">{title}</h2>
      <div className="inv-widget-body">{children}</div>
    </section>
  );
}

export function EquityFinancialsPanel({ symbol, market }: PanelProps) {
  const enabledKr = market === "korea";

  const { data: detail, isLoading } = useQuery({
    queryKey: ["kr-detail-financials", symbol],
    queryFn: () => krStockApi.getDetail(symbol).then((r) => r.data),
    enabled: enabledKr,
  });

  const { data: keyStats, isLoading: statsLoading } = useQuery({
    queryKey: ["stockKeyStats", symbol, market],
    queryFn: () => getStockKeyStats({ symbol, market: market as ChartMarket }),
    staleTime: 60_000,
  });

  const { data: consensus } = useQuery({
    queryKey: ["kr-consensus-panel", symbol],
    queryFn: () => krStockApi.getConsensus(symbol).then((r) => r.data),
    enabled: enabledKr,
  });

  const fund = detail?.fundamental as Record<string, number | string | null> | undefined;

  return (
    <div className="inv-equity-tab-panels" id="financials">
      <PanelShell title="재정 상황">
        {(isLoading || statsLoading) && <LoadingState rows={3} />}
        {fund && (
          <dl className="inv-quote-stats">
            <div>
              <dt>PER</dt>
              <dd>{fund.per ?? "—"}</dd>
            </div>
            <div>
              <dt>PBR</dt>
              <dd>{fund.pbr ?? "—"}</dd>
            </div>
            <div>
              <dt>ROE</dt>
              <dd>{fund.roe != null ? `${fund.roe}%` : "—"}</dd>
            </div>
            <div>
              <dt>배당수익</dt>
              <dd>{fund.dividendYield != null ? `${fund.dividendYield}%` : "—"}</dd>
            </div>
            <div>
              <dt>업종</dt>
              <dd>{fund.industry ?? "—"}</dd>
            </div>
          </dl>
        )}
        {!enabledKr && !statsLoading && keyStats?.columns?.length ? (
          <div className="inv-equity-key-stats-grid">
            {keyStats.columns.flat().map((row) => (
              <div key={row.label} className="inv-equity-key-stat-row">
                <span className="text-muted-sm">{row.label}</span>
                <strong className="tabular">{row.value ?? "—"}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {!isLoading && !fund && !keyStats?.columns?.length && (
          <p className="inv-page-desc">재무 데이터를 불러오지 못했습니다.</p>
        )}
      </PanelShell>

      {consensus && (
        <PanelShell title="컨센서스">
          <dl className="inv-quote-stats">
            <div>
              <dt>목표가(평균)</dt>
              <dd>{formatPrice(consensus.targetPriceAvg ?? 0, 0)}</dd>
            </div>
            <div>
              <dt>목표가(고/저)</dt>
              <dd>
                {formatPrice(consensus.targetPriceHigh ?? 0, 0)} /{" "}
                {formatPrice(consensus.targetPriceLow ?? 0, 0)}
              </dd>
            </div>
            <div>
              <dt>매수/보유/매도</dt>
              <dd>
                {consensus.buyCount ?? 0}/{consensus.holdCount ?? 0}/{consensus.sellCount ?? 0}
              </dd>
            </div>
          </dl>
        </PanelShell>
      )}
    </div>
  );
}

export function EquityNewsPanel({ symbol, market }: PanelProps) {
  const { data: news, isLoading } = useQuery({
    queryKey: ["kr-news", symbol],
    queryFn: () => krStockApi.getNews(symbol, 20).then((r) => r.data),
    enabled: market === "korea",
  });

  return (
    <div className="inv-equity-tab-panels" id="news">
      <PanelShell title="뉴스 &amp; 분석">
        {market === "korea" ? (
          <>
            {isLoading && <LoadingState rows={3} />}
            <ul className="inv-widget-list">
              {(news ?? []).map((n) => (
                <li key={n.id}>
                  {n.url ? (
                    <a href={n.url} className="inv-widget-row" target="_blank" rel="noreferrer">
                      <span className="inv-widget-name">{n.title}</span>
                      <span className="text-muted-sm">{n.source}</span>
                    </a>
                  ) : (
                    <span className="inv-widget-row">
                      <span className="inv-widget-name">{n.title}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!isLoading && !(news ?? []).length && (
              <p className="inv-page-desc">등록된 종목 뉴스가 없습니다.</p>
            )}
          </>
        ) : (
          <>
            <p className="inv-page-desc">종목별 뉴스 피드 · 시장 뉴스</p>
            <NewsList compact={false} />
          </>
        )}
      </PanelShell>
    </div>
  );
}

export function EquityProfilePanel({ symbol, market, quoteName }: PanelProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["kr-detail-profile", symbol],
    queryFn: () => krStockApi.getDetail(symbol).then((r) => r.data),
    enabled: market === "korea",
  });

  const stock = detail?.stock as Record<string, unknown> | undefined;
  const fund = detail?.fundamental as Record<string, string | null> | undefined;

  const { data: keyStats } = useQuery({
    queryKey: ["stockKeyStats", symbol, market],
    queryFn: () => getStockKeyStats({ symbol, market: market as ChartMarket }),
    staleTime: 60_000,
  });

  return (
    <div className="inv-equity-tab-panels" id="profile">
      <PanelShell title="프로필">
        {isLoading && market === "korea" && <LoadingState rows={2} />}
        <dl className="inv-quote-stats">
          <div>
            <dt>종목명</dt>
            <dd>{quoteName ?? String(stock?.name ?? symbol)}</dd>
          </div>
          <div>
            <dt>심볼</dt>
            <dd className="tabular">{symbol}</dd>
          </div>
          {market === "korea" && stock?.market != null && (
            <div>
              <dt>시장</dt>
              <dd>{String(stock.market)}</dd>
            </div>
          )}
          {fund?.industry && (
            <div>
              <dt>업종</dt>
              <dd>{fund.industry}</dd>
            </div>
          )}
          {fund?.sector && (
            <div>
              <dt>섹터</dt>
              <dd>{fund.sector}</dd>
            </div>
          )}
        </dl>
        {keyStats?.insights?.proTip ? (
          <p className="inv-equity-insights-tip">{keyStats.insights.proTip}</p>
        ) : null}
      </PanelShell>
    </div>
  );
}

export function EquityOwnershipPanel({ symbol, market }: PanelProps) {
  return (
    <div className="inv-equity-tab-panels" id="ownership">
      <PanelShell title="소유권">
        <p className="inv-page-desc">
          {symbol} ({market === "korea" ? "한국" : "미국"}) 주요 주주·기관 보유 비중 데이터는 API
          연동 후 표시됩니다.
        </p>
        <p className="text-muted-sm">
          개요 탭의 Insights 패널에서 애널리스트·컨센서스 정보를 함께 확인할 수 있습니다.
        </p>
      </PanelShell>
    </div>
  );
}

export function EquityHistoricalPanel({ symbol, market }: PanelProps) {
  const { data: krQuotes, isLoading: krLoading } = useQuery({
    queryKey: ["kr-quotes-hist", symbol],
    queryFn: () => krStockApi.getQuotes(symbol, 60).then((r) => r.data),
    enabled: market === "korea",
  });

  const { data: hist, isLoading: histLoading } = useQuery({
    queryKey: ["quote-hist-table", market, symbol],
    queryFn: () => getStockHistory({ symbol, market, period: "1y" }),
    staleTime: 120_000,
  });

  const rows =
    market === "korea" && krQuotes?.length
      ? krQuotes.map((q) => ({
          date: q.date,
          close: q.close,
          volume: q.volume,
        }))
      : (hist?.points ?? []).slice(-60).map((c) => ({
          date: c.time,
          close: c.close,
          volume: c.volume,
        }));

  const loading = market === "korea" ? krLoading : histLoading;

  return (
    <div className="inv-equity-tab-panels" id="historical">
      <PanelShell title="과거 데이터">
        {loading && <LoadingState rows={4} />}
        {!loading && rows.length > 0 && (
          <div className="inv-equity-hist-table-wrap">
            <table className="inv-equity-hist-table">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>종가</th>
                  <th>거래량</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td className="tabular">{formatPrice(row.close, market === "us" ? 2 : 0)}</td>
                    <td className="tabular">{row.volume?.toLocaleString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !rows.length && (
          <p className="inv-page-desc">과거 시세 데이터를 불러오지 못했습니다.</p>
        )}
      </PanelShell>
    </div>
  );
}

export function EquitySplitsPanel({ symbol }: PanelProps) {
  return (
    <div className="inv-equity-tab-panels" id="splits">
      <PanelShell title="과거 액면분할">
        <p className="inv-page-desc">
          {symbol} 액면분할 이력은 차트 이벤트·공시 데이터와 연동 예정입니다.
        </p>
      </PanelShell>
    </div>
  );
}

export function EquityIndexPanel({ symbol, market, quoteName }: PanelProps) {
  const { data: krDetail, isLoading: krLoading } = useQuery({
    queryKey: ["kr-detail-index", symbol],
    queryFn: () => krStockApi.getDetail(symbol).then((r) => r.data),
    enabled: market === "korea",
  });

  const { data: usDetail, isLoading: usLoading } = useQuery({
    queryKey: ["us-detail-index", symbol],
    queryFn: () => stockApi.getUSStockDetail(symbol).then((r) => r.data),
    enabled: market === "us",
  });

  const loading = market === "korea" ? krLoading : usLoading;
  const board =
    market === "korea"
      ? ((krDetail as { market?: string } | undefined)?.market as "KOSPI" | "KOSDAQ" | undefined)
      : undefined;
  const exchange = market === "us" ? usDetail?.exchange : undefined;

  const links = resolveEquityIndexMembership(market, {
    board: board === "KOSDAQ" ? "KOSDAQ" : board === "KOSPI" ? "KOSPI" : undefined,
    exchange,
  });

  return (
    <div className="inv-equity-tab-panels" id="index">
      <PanelShell title="관련 지수">
        {loading ? (
          <LoadingState rows={2} />
        ) : (
          <>
            <p className="inv-page-desc">
              {quoteName ?? symbol}과(와) 연관된 주요 지수입니다. 지수를 누르면 시장 허브의
              지수 상세·차트로 이동합니다.
            </p>
            <ul className="inv-index-membership-list">
              {links.map((row) => (
                <li key={row.id}>
                  <AppLink href={row.href} className="inv-index-membership-link">
                    {row.name}
                  </AppLink>
                  {row.note ? (
                    <span className="inv-page-desc inv-index-membership-note">{row.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="inv-page-desc inv-index-membership-disclaimer">
              KRX·S&P 등 공식 지수 구성종목 전체 목록은 데이터 제공사 API 연동 시 확장됩니다.
            </p>
          </>
        )}
      </PanelShell>
    </div>
  );
}

export function EquitySubTabPanel({
  sub,
  symbol,
  market,
  quoteName,
}: PanelProps & { sub: string }) {
  switch (sub) {
    case "profile":
      return <EquityProfilePanel symbol={symbol} market={market} quoteName={quoteName} />;
    case "ownership":
      return <EquityOwnershipPanel symbol={symbol} market={market} />;
    case "historical":
      return <EquityHistoricalPanel symbol={symbol} market={market} />;
    case "splits":
      return <EquitySplitsPanel symbol={symbol} market={market} />;
    case "index":
      return <EquityIndexPanel symbol={symbol} market={market} quoteName={quoteName} />;
    default:
      return null;
  }
}
