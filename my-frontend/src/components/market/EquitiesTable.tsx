"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLink from "@/components/common/AppLink";
import { useRouter } from "next/navigation";
import {
  estimatedPerformance,
  filterEquities,
  sortEquities,
  technicalSignals,
  equityAiSummary,
  equityPriceDecimals,
  formatEquityMarketCap,
  formatEquityPriceWithUnit,
  formatEquityTurnover,
  tossStyleTradeRatio,
  type EquityFilter,
  type EquityQuote,
  type SortDir,
  type SortKey,
  quoteMarketFromEquity,
  resolveLiveEquityQuoteFromMaps,
} from "@/lib/equityQuotes";
import { formatPeRatio, peRatioTitle } from "@/lib/fundamentalsDisplay";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import type { StocksSourceLabel } from "@/lib/mapStocksSource";
import InvTableSkeleton from "@/components/common/InvTableSkeleton";
import WatchlistStar from "@/components/market/WatchlistStar";
import { readLocalWatchlist } from "@/lib/localWatchlist";
import {
  readHubEquitiesSortPrefs,
  writeHubEquitiesSortPrefs,
  type HubEquitiesMarket,
} from "@/lib/hubEquitiesSortPrefs";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { useClientLocaleTime } from "@/hooks/useClientLocaleTime";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { rankMovePriceClass, useRankMoveTone } from "@/hooks/useRankMoveTone";
import type { LiveStockTick } from "@/lib/wsNormalize";
import { pickWsQuote } from "@/lib/wsSymbolKey";

type IndexSelect = "ALL" | "KOSPI" | "KOSDAQ" | "KOSPI50" | "US50" | "NASDAQ" | "NYSE";
type EquityMarket = "korea" | "us" | "asia" | "europe";

type EquitiesTableProps = {
  rows: EquityQuote[];
  isLoading?: boolean;
  liveQuotes?: Record<string, number>;
  liveTicks?: Record<string, LiveStockTick>;
  market?: EquityMarket;
  sectorFilter?: string | null;
  investingExact?: boolean;
  footerHref?: string;
  footerLabel?: string;
  updatedLabel?: string;
  liveStream?: boolean;
  stocksSource?: StocksSourceLabel;
  /** 허브 등 — 표시 행 수 제한 (0이면 전체) */
  previewLimit?: number;
  /** /markets 허브 — 열 정렬(등락률·거래대금 등) localStorage 기억 */
  persistSortPrefs?: boolean;
};

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={className} scope="col">
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        {active ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}

const VIEW_TABS = [
  { id: "가격", label: "가격" },
  { id: "실적 및 예측", label: "성과" },
  { id: "기술적 분석", label: "기술 분석" },
  { id: "펀더멘털", label: "펀더멘털" },
  { id: "차트", label: "차트" },
] as const;
type ViewTab = (typeof VIEW_TABS)[number]["id"];

function formatMarketCap(value: number | undefined, currency: string) {
  return formatEquityMarketCap(value, currency);
}

function TossTradeRatioBar({ symbol }: { symbol: string }) {
  const { buyPct, sellPct } = tossStyleTradeRatio(symbol);
  return (
    <div className="inv-toss-trade-ratio" aria-label={`매수 ${buyPct}% 매도 ${sellPct}%`}>
      <span className="inv-toss-trade-ratio__side inv-toss-trade-ratio__buy tabular">{buyPct}</span>
      <div className="inv-toss-trade-ratio__bar">
        <span className="inv-toss-trade-ratio__fill inv-toss-trade-ratio__fill--buy" style={{ width: `${buyPct}%` }} />
        <span className="inv-toss-trade-ratio__fill inv-toss-trade-ratio__fill--sell" style={{ width: `${sellPct}%` }} />
      </div>
      <span className="inv-toss-trade-ratio__side inv-toss-trade-ratio__sell tabular">{sellPct}</span>
    </div>
  );
}

export default function EquitiesTable({
  rows,
  isLoading,
  liveQuotes = {},
  liveTicks = {},
  market = "korea",
  sectorFilter,
  investingExact = true,
  footerHref,
  footerLabel = "전체 종목 보기",
  updatedLabel,
  liveStream = false,
  stocksSource,
  previewLimit = 0,
  persistSortPrefs = false,
}: EquitiesTableProps) {
  const router = useRouter();
  const hubMarket = market as HubEquitiesMarket;
  const [watchlistTick, setWatchlistTick] = useState(0);

  useEffect(() => {
    const sync = () => setWatchlistTick((n) => n + 1);
    window.addEventListener("local-watchlist-changed", sync);
    return () => window.removeEventListener("local-watchlist-changed", sync);
  }, []);

  const watchlistKeys = useMemo(() => {
    void watchlistTick;
    const keys = new Set<string>();
    for (const entry of readLocalWatchlist()) {
      keys.add(`${entry.market}:${entry.symbol}`);
    }
    return keys;
  }, [watchlistTick]);
  const liveClock = useClientLocaleTime("hms") ?? "";
  const intlMarket = market === "asia" || market === "europe";
  const [filter, setFilter] = useState<EquityFilter>(market === "korea" ? "kospi" : "all");
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (persistSortPrefs) {
      return readHubEquitiesSortPrefs(hubMarket)?.sortKey ?? "changePercent";
    }
    return "changePercent";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    if (persistSortPrefs) {
      return readHubEquitiesSortPrefs(hubMarket)?.sortDir ?? "desc";
    }
    return "desc";
  });
  const [query, setQuery] = useState("");
  const [indexSelect, setIndexSelect] = useState<IndexSelect>(
    market === "korea" ? "KOSPI50" : market === "us" ? "US50" : "ALL"
  );
  const [viewTab, setViewTab] = useState<ViewTab>("가격");

  useEffect(() => {
    if (viewTab === "차트") {
      setSortKey("changePercent");
      setSortDir("desc");
    }
  }, [viewTab]);

  /** 한국: 「전체」칩인데 지수가 코스피50이면 예전 로직으로 50종만 남아 필터가 먹통처럼 보임 */
  useEffect(() => {
    if (market !== "korea" || filter !== "all") return;
    if (indexSelect === "KOSPI50") setIndexSelect("ALL");
  }, [market, filter, indexSelect]);

  const quickFilters = useMemo(() => {
    const items: { id: EquityFilter; label: string }[] = [{ id: "all", label: "전체" }];
    if (market === "korea") {
      items.push({ id: "kospi", label: "KOSPI" }, { id: "kosdaq", label: "KOSDAQ" });
    } else if (market === "us") {
      items.push({ id: "nasdaq", label: "NASDAQ" }, { id: "nyse", label: "NYSE" });
    }
    items.push(
      { id: "gainers", label: "상승" },
      { id: "losers", label: "하락" },
      { id: "volume", label: "거래량" },
      { id: "watchlist", label: "관심" }
    );
    return items;
  }, [market]);

  const restoreSavedSort = () => {
    if (!persistSortPrefs) return;
    const saved = readHubEquitiesSortPrefs(hubMarket);
    if (!saved) return;
    setSortKey(saved.sortKey);
    setSortDir(saved.sortDir);
  };

  const applyQuickFilter = (id: EquityFilter) => {
    setFilter(id);
    if (id === "kospi") setIndexSelect("KOSPI");
    else if (id === "kosdaq") setIndexSelect("KOSDAQ");
    else if (id === "nasdaq") setIndexSelect("NASDAQ");
    else if (id === "nyse") setIndexSelect("NYSE");
    else if (id === "all") setIndexSelect("ALL");
    else if (
      id === "gainers" ||
      id === "losers" ||
      id === "volume" ||
      id === "watchlist" ||
      id === "nasdaq" ||
      id === "nyse"
    ) {
      setIndexSelect("ALL");
    }
    if (id === "gainers") {
      setSortKey("changePercent");
      setSortDir("desc");
    } else if (id === "losers") {
      setSortKey("changePercent");
      setSortDir("asc");
    } else if (id === "volume") {
      setSortKey("volume");
      setSortDir("desc");
    } else if (id === "watchlist") {
      setSortKey("changePercent");
      setSortDir("desc");
      setIndexSelect("ALL");
    } else if (id === "all") {
      restoreSavedSort();
    }
  };

  const onSort = (key: SortKey) => {
    const nextDir: SortDir =
      sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : key === "name" ? "asc" : "desc";
    setSortKey(key);
    setSortDir(nextDir);
    if (persistSortPrefs) {
      writeHubEquitiesSortPrefs(hubMarket, { sortKey: key, sortDir: nextDir });
    }
  };

  const onIndexChange = (value: IndexSelect) => {
    setIndexSelect(value);
    if (market === "korea") {
      if (value === "KOSPI" || value === "KOSPI50") setFilter("kospi");
      else if (value === "KOSDAQ") setFilter("kosdaq");
      else setFilter("all");
    } else if (market === "us") {
      if (value === "NASDAQ") setFilter("nasdaq");
      else if (value === "NYSE") setFilter("nyse");
      else setFilter("all");
    }
  };

  const onCountryChange = (value: string) => {
    let href: string | null = null;
    if (value === "WORLD") href = "/markets";
    else if (value === "US" && market !== "us") href = "/us";
    else if (value === "KR" && market !== "korea") href = "/korea";
    else if (value === "ASIA") href = "/markets?region=asia";
    else if (value === "EUROPE") href = "/markets?region=europe";
    if (!href) return;

    router.push(href);
    window.setTimeout(() => {
      const path = window.location.pathname || "/";
      if (path !== href && !path.startsWith(`${href}/`)) {
        window.location.assign(href);
      }
    }, 350);
  };

  const marketSelectValue =
    market === "korea" ? "KR" : market === "us" ? "US" : market === "asia" ? "ASIA" : "EUROPE";

  const sortMetrics = useCallback(
    (row: EquityQuote) => {
      const live = resolveLiveEquityQuoteFromMaps(row, liveQuotes, liveTicks);
      return {
        price: live.price,
        changePercent: live.changePercent,
        volume: live.volume,
        turnover: live.turnover,
        marketCap: row.marketCap ?? 0,
      };
    },
    [liveQuotes, liveTicks]
  );

  const displayRows = useMemo(() => {
    let list = filterEquities(rows, filter, sortMetrics);
    if (sectorFilter) {
      list = list.filter((r) => (r.sector || "").includes(sectorFilter));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q)
      );
    }
    if (filter === "watchlist") {
      list = list.filter((r) => {
        const qMarket = quoteMarketFromEquity(r);
        return watchlistKeys.has(`${qMarket}:${r.symbol}`);
      });
    }

    const rankingFilter =
      filter === "gainers" || filter === "losers" || filter === "volume";

    if (indexSelect === "KOSPI50" && !rankingFilter && filter === "kospi") {
      list = list
        .filter((r) => r.market === "KOSPI")
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0) || b.volume - a.volume)
        .slice(0, 50);
    } else if (indexSelect === "US50" && !rankingFilter && filter === "all") {
      list = list
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0) || b.volume - a.volume)
        .slice(0, 50);
    }
    if (!rankingFilter) {
      list = sortEquities(list, sortKey, sortDir, sortMetrics);
    }
    return list;
  }, [rows, filter, query, sortKey, sortDir, sectorFilter, indexSelect, sortMetrics, watchlistKeys]);

  const visibleRows = useMemo(() => {
    if (!previewLimit || previewLimit <= 0) return displayRows;
    return displayRows.slice(0, previewLimit);
  }, [displayRows, previewLimit]);

  const truncated = previewLimit > 0 && displayRows.length > visibleRows.length;

  const timeStr = liveStream
    ? liveClock || updatedLabel || "—"
    : updatedLabel ?? liveClock;

  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of visibleRows) {
      const live = pickWsQuote(row.symbol, liveQuotes);
      if (live !== undefined) map[row.symbol] = live;
    }
    return map;
  }, [visibleRows, liveQuotes]);

  const priceFlash = usePriceFlash(livePriceMap);

  const showLiveRank = liveStream && viewTab === "가격";
  const rankOrderSymbols = useMemo(
    () => (showLiveRank || viewTab === "차트" ? visibleRows.map((r) => r.symbol) : []),
    [showLiveRank, viewTab, visibleRows]
  );
  const rankTones = useRankMoveTone(
    rankOrderSymbols,
    `${viewTab}-${sortKey}-${sortDir}-${filter}-${indexSelect}`
  );

  const panelClass = investingExact ? "panel inv-table-panel inv-investing-panel" : "panel inv-table-panel";
  const tossPriceView = viewTab === "가격";
  const tableClass = investingExact
    ? `inv-table inv-table--equities inv-table--investing-exact${tossPriceView ? " inv-table--toss-price" : ""}`
    : `inv-table inv-table--equities${tossPriceView ? " inv-table--toss-price" : ""}`;

  const renderNameCells = (row: EquityQuote) => {
    const qMarket = quoteMarketFromEquity(row);
    return (
      <>
        <td className="inv-col-check">
          <input type="checkbox" aria-label={`${row.name} 선택`} />
        </td>
        <td className="inv-col-star">
          <WatchlistStar symbol={row.symbol} market={qMarket} name={row.name} />
        </td>
        <td className="inv-col-name inv-symbol-cell">
          <AppLink href={`/quote/${qMarket}/${row.symbol}`} className="inv-name-link inv-name-link--with-logo">
            <StockNameWithLogo market={qMarket} symbol={row.symbol} name={row.name} size={24} />
          </AppLink>
        </td>
      </>
    );
  };

  const renderBodyRow = (row: EquityQuote) => {
    const liveMerged = resolveLiveEquityQuoteFromMaps(row, liveQuotes, liveTicks);
    const price = liveMerged.price;
    const changePercent = liveMerged.changePercent;
    const decimals = equityPriceDecimals(row.currency);
    const pctClass = priceClass(changePercent);
    const qMarket = quoteMarketFromEquity(row);
    const flashDir = priceFlash[row.symbol];
    const flashRowClass = flashDir ? `is-flash-${flashDir}` : undefined;
    const flashCell = flashDir ? ` inv-last-flash is-flash-${flashDir}` : "";
    const volume =
      "volume" in liveMerged && liveMerged.volume > 0 ? liveMerged.volume : row.volume;
    const turnover = price * volume;
    const pctBadgeClass =
      Math.abs(changePercent) >= 10 ? " is-hot" : changePercent === 0 ? " is-flat-zero" : "";

    if (viewTab === "실적 및 예측") {
      const perf = estimatedPerformance(changePercent);
      return (
        <tr key={row.symbol} className={flashRowClass}>
          {renderNameCells(row)}
          <td className={`tabular ${priceClass(perf.d1)}`}>{formatPercent(perf.d1)}</td>
          <td className={`tabular inv-hide-sm ${priceClass(perf.w1)}`}>{formatPercent(perf.w1)}</td>
          <td className={`tabular inv-hide-sm ${priceClass(perf.m1)}`}>{formatPercent(perf.m1)}</td>
          <td className={`tabular inv-hide-sm ${priceClass(perf.m3)}`}>{formatPercent(perf.m3)}</td>
          <td className={`tabular inv-hide-sm ${priceClass(perf.m6)}`}>{formatPercent(perf.m6)}</td>
          <td className={`tabular ${priceClass(perf.y1)}`}>{formatPercent(perf.y1)}</td>
          <td className={`tabular inv-hide-sm ${priceClass(perf.ytd)}`}>{formatPercent(perf.ytd)}</td>
        </tr>
      );
    }

    if (viewTab === "기술적 분석") {
      const tech = technicalSignals(row.changePercent);
      return (
        <tr key={row.symbol} className={flashRowClass}>
          {renderNameCells(row)}
          <td className="tabular">{tech.rsi.toFixed(1)}</td>
          <td>{tech.trend}</td>
          <td>{tech.macd}</td>
          <td className={`tabular ${pctClass}`}>{formatPercent(changePercent)}</td>
          <td className={`tabular inv-hide-sm${flashCell}`}>{formatPrice(price, decimals)}</td>
        </tr>
      );
    }

    if (viewTab === "펀더멘털") {
      return (
        <tr key={row.symbol} className={flashRowClass}>
          {renderNameCells(row)}
          <td className="tabular">{formatMarketCap(row.marketCap, row.currency)}</td>
          <td className="tabular" title={peRatioTitle(row.peRatio)}>
            {formatPeRatio(row.peRatio)}
          </td>
          <td className="tabular">{row.eps && row.eps !== 0 ? row.eps.toFixed(2) : "—"}</td>
          <td className="inv-hide-sm">{row.sector || "—"}</td>
          <td className={`tabular ${pctClass}`}>{formatPercent(changePercent)}</td>
        </tr>
      );
    }

    if (viewTab === "차트") {
      const rank = displayRows.findIndex((r) => r.symbol === row.symbol) + 1;
      const rankToneClass = rankMovePriceClass(rankTones[row.symbol]);
      return (
        <tr key={row.symbol} className={flashRowClass}>
          <td
            className={`inv-col-rank tabular${rankToneClass ? ` ${rankToneClass}` : ""}`}
            aria-label={`순위 ${rank}`}
          >
            {rank}
          </td>
          {renderNameCells(row)}
          <td className={`inv-last tabular ${pctClass}${flashCell}`}>{formatPrice(price, decimals)}</td>
          <td className={`tabular ${pctClass}`}>{formatPercent(changePercent)}</td>
          <td>
            <AppLink
              href={`/charts?market=${qMarket}&symbol=${encodeURIComponent(row.symbol)}`}
              className="inv-name-link"
            >
              차트 보기
            </AppLink>
          </td>
        </tr>
      );
    }

    const sectorLabel = row.sector?.trim() || "—";
    const liveRank = showLiveRank ? displayRows.findIndex((r) => r.symbol === row.symbol) + 1 : 0;
    const rankToneClass = showLiveRank ? rankMovePriceClass(rankTones[row.symbol]) : "";

    return (
      <tr key={row.symbol} className={flashRowClass}>
        {showLiveRank && (
          <td
            className={`inv-col-rank tabular${rankToneClass ? ` ${rankToneClass}` : ""}`}
            aria-label={`순위 ${liveRank}`}
          >
            {liveRank}
          </td>
        )}
        {renderNameCells(row)}
        <td className={`inv-toss-price tabular ${pctClass}${flashCell}`}>
          {formatEquityPriceWithUnit(price, row.currency, decimals)}
        </td>
        <td className="inv-toss-pct tabular">
          <span className={`inv-pct-badge ${pctClass}${pctBadgeClass}`}>
            {formatPercent(changePercent)}
          </span>
        </td>
        <td className="inv-toss-turnover tabular">
          {formatEquityTurnover(turnover, row.currency)}
        </td>
        <td className="inv-toss-mcap tabular">
          {formatEquityMarketCap(row.marketCap, row.currency)}
        </td>
        <td className="inv-toss-ratio">
          <TossTradeRatioBar symbol={row.symbol} />
        </td>
        <td className="inv-toss-sector">
          {sectorLabel !== "—" ? (
            <span className="inv-toss-sector-pill">{sectorLabel}</span>
          ) : (
            "—"
          )}
        </td>
        <td className="inv-toss-ai">{equityAiSummary(changePercent, row.sector)}</td>
      </tr>
    );
  };

  const renderTossColGroup = (withRank: boolean) => (
    <colgroup>
      {withRank ? <col className="inv-col-rank-col" /> : null}
      <col className="inv-col-check-col" />
      <col className="inv-col-star-col" />
      <col className="inv-col-name-col" />
      <col className="inv-toss-col-price" />
      <col className="inv-toss-col-pct" />
      <col className="inv-toss-col-turnover" />
      <col className="inv-toss-col-mcap" />
      <col className="inv-toss-col-ratio" />
      <col className="inv-toss-col-sector" />
      <col className="inv-toss-col-ai" />
    </colgroup>
  );

  const renderHead = () => {
    if (viewTab === "실적 및 예측") {
      return (
        <tr>
          <th scope="col" className="inv-col-check" />
          <th scope="col" className="inv-col-star" />
          <SortHeader label="종목" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-col-name" />
          <th scope="col">1일</th>
          <th scope="col" className="inv-hide-sm">1주</th>
          <th scope="col" className="inv-hide-sm">1개월</th>
          <th scope="col" className="inv-hide-sm">3개월</th>
          <th scope="col" className="inv-hide-sm">6개월</th>
          <th scope="col">1년</th>
          <th scope="col" className="inv-hide-sm">YTD</th>
        </tr>
      );
    }
    if (viewTab === "기술적 분석") {
      return (
        <tr>
          <th scope="col" className="inv-col-check" />
          <th scope="col" className="inv-col-star" />
          <SortHeader label="종목" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-col-name" />
          <th scope="col">RSI(14)</th>
          <th scope="col">추세</th>
          <th scope="col">MACD</th>
          <th scope="col">등락 %</th>
          <th scope="col" className="inv-hide-sm">최근</th>
        </tr>
      );
    }
    if (viewTab === "펀더멘털") {
      return (
        <tr>
          <th scope="col" className="inv-col-check" />
          <th scope="col" className="inv-col-star" />
          <SortHeader label="종목" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-col-name" />
          <th scope="col">시가총액</th>
          <th scope="col">PER</th>
          <th scope="col">EPS</th>
          <th scope="col" className="inv-hide-sm">섹터</th>
          <th scope="col">등락 %</th>
        </tr>
      );
    }
    if (viewTab === "차트") {
      return (
        <tr>
          <th scope="col" className="inv-col-rank">
            순위
          </th>
          <th scope="col" className="inv-col-check" />
          <th scope="col" className="inv-col-star" />
          <SortHeader label="종목" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-col-name" />
          <th scope="col">최근</th>
          <SortHeader label="등락 %" sortKey="changePercent" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <th scope="col">차트</th>
        </tr>
      );
    }
    return (
      <tr>
        {showLiveRank && (
          <th scope="col" className="inv-col-rank">
            순위
          </th>
        )}
        <th scope="col" className="inv-col-check">
          <input type="checkbox" aria-label="전체 선택" disabled />
        </th>
        <th scope="col" className="inv-col-star">
          <span className="sr-only">관심</span>
        </th>
        <SortHeader label="종목" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-col-name" />
        <SortHeader label="현재가" sortKey="price" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-toss-th-price" />
        <SortHeader label="등락률" sortKey="changePercent" activeKey={sortKey} dir={sortDir} onSort={onSort} className="inv-toss-th-pct" />
        <SortHeader
          label="거래대금"
          sortKey="turnover"
          activeKey={sortKey}
          dir={sortDir}
          onSort={onSort}
          className="inv-toss-th-turnover"
        />
        <SortHeader
          label="시가총액"
          sortKey="marketCap"
          activeKey={sortKey}
          dir={sortDir}
          onSort={onSort}
          className="inv-toss-th-mcap"
        />
        <th scope="col" className="inv-toss-th-ratio">
          거래 비율
        </th>
        <th scope="col" className="inv-toss-th-sector">
          산업
        </th>
        <th scope="col" className="inv-toss-th-ai">
          AI 요약
        </th>
      </tr>
    );
  };

  return (
    <section className={panelClass}>
      {investingExact && (
        <div className="inv-table-filters">
          <label className="inv-filter-field">
            <span className="inv-filter-label">시장</span>
            <select
              className="inv-filter-select"
              value={marketSelectValue}
              aria-label="시장 선택"
              onChange={(e) => onCountryChange(e.target.value)}
            >
              <option value="WORLD">세계 시장</option>
              <option value="KR">대한민국</option>
              <option value="ASIA">아시아</option>
              <option value="US">미국</option>
              <option value="EUROPE">유럽</option>
            </select>
          </label>
          <label className="inv-filter-field">
            <span className="inv-filter-label">{market === "korea" ? "지수" : "범위"}</span>
            <select
              className="inv-filter-select"
              value={indexSelect}
              aria-label={market === "korea" ? "지수 선택" : "종목 범위"}
              onChange={(e) => onIndexChange(e.target.value as IndexSelect)}
              disabled={intlMarket}
            >
              {intlMarket ? (
                <option value="ALL">전체</option>
              ) : market === "korea" ? (
                <>
                  <option value="KOSPI50">코스피 50</option>
                  <option value="ALL">전체</option>
                  <option value="KOSPI">KOSPI</option>
                  <option value="KOSDAQ">KOSDAQ</option>
                </>
              ) : (
                <>
                  <option value="US50">US 50</option>
                  <option value="ALL">전체</option>
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="NYSE">NYSE</option>
                </>
              )}
            </select>
          </label>
          {sectorFilter && (
            <span className="inv-toolbar-meta inv-sector-active">섹터: {sectorFilter}</span>
          )}
          <input
            type="search"
            className="inv-search-inline inv-search-inline--filter"
            placeholder="종목 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="종목 검색"
          />
          <span className="inv-toolbar-meta inv-table-filters-meta" suppressHydrationWarning>
            {truncated
              ? `${visibleRows.length}/${displayRows.length}종목 · ${timeStr}`
              : `${displayRows.length}종목 · ${timeStr}`}
          </span>
        </div>
      )}

      {investingExact && (
        <div className="inv-view-tabs" role="tablist" aria-label="표 보기">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={viewTab === tab.id}
              className={`inv-view-tab ${viewTab === tab.id ? "is-active" : ""}`}
              onClick={() => setViewTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {investingExact && (
        <div className="inv-filter-chips" role="group" aria-label="빠른 필터">
          {quickFilters.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`inv-filter-chip ${filter === chip.id ? "is-active" : ""}`}
              aria-pressed={filter === chip.id}
              onClick={() => applyQuickFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && displayRows.length === 0 && (
        <InvTableSkeleton tableClass={tableClass} headRow={renderHead()} rowCount={8} />
      )}

      {!isLoading && displayRows.length === 0 && (
        <div className="inv-table-empty">
          <strong>표시할 종목이 없습니다</strong>
          {filter === "watchlist"
            ? "별 아이콘으로 관심종목을 추가하거나, /watchlist에서 목록을 확인하세요."
            : sectorFilter
              ? "섹터 필터를 해제하거나 검색어를 바꿔 보세요."
              : "검색어나 필터 조건을 조정해 보세요."}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="inv-table-wrap inv-table-wrap--equities">
          <table className={tableClass}>
            {tossPriceView ? renderTossColGroup(showLiveRank) : null}
            <thead className="inv-equities-thead">{renderHead()}</thead>
            <tbody className="inv-equities-tbody">
              {visibleRows.map((row) => renderBodyRow(row))}
            </tbody>
          </table>
        </div>
      )}

      {truncated && footerHref && (
        <p className="inv-table-preview-more">
          {displayRows.length.toLocaleString("ko-KR")}종목 중 상위 {visibleRows.length}개만 표시 중입니다.{" "}
          <AppLink href={footerHref}>전체 보기</AppLink>
        </p>
      )}

      <footer className="inv-table-footer">
        <span>
          {viewTab === "실적 및 예측" || viewTab === "기술적 분석"
            ? "기간·기술 지표는 참고용 추정치입니다. 상세는 종목 페이지를 확인하세요."
            : stocksSource === "reference"
              ? "참고 시세입니다. 시가총액은 KRX, 가격·PER은 갱신 후 WS·표에 반영됩니다."
              : liveStream
                ? "가격 · WebSocket(장중 ~0.35초). 시가총액 KRX/Yahoo, PER Yahoo trailing."
                : "가격 · REST 폴링 + WebSocket. 시가총액·PER은 백엔드 캐시 기준."}
        </span>
        {footerHref && <AppLink href={footerHref}>{footerLabel}</AppLink>}
      </footer>
    </section>
  );
}
