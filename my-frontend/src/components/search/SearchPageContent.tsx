"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import { searchAll } from "@/services/searchApi";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useEffect, useMemo, useState } from "react";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import type { SearchResultItem } from "@/services/searchApi";

function SearchResultsFromQuery() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!q) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(false);
    searchAll(q)
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return null;
  if (loading) return <LoadingState rows={4} />;
  if (error) return <ErrorState message="검색 API에 연결하지 못했습니다. 백엔드(8000)를 확인하세요." />;
  if (items.length === 0) {
    return <p className="inv-page-desc">「{q}」에 맞는 종목이 없습니다.</p>;
  }

  return <SearchResultsLiveList items={items} />;
}

function SearchResultsLiveList({ items }: { items: SearchResultItem[] }) {
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { quotes, ticks } = useLiveSymbols(symbols);

  return (
    <ul className="inv-widget-list search-page-results">
      {items.map((item) => {
        const tick = ticks[item.symbol];
        const quote = quotes[item.symbol];
        const live = mergeLiveStockQuote(
          {
            price: tick?.price ?? quote ?? 0,
            change: tick?.change ?? 0,
            changePercent: tick?.changePercent ?? 0,
          },
          quote,
          tick
        );
        const decimals = item.market === "korea" ? 0 : 2;
        const showQuote = live.price > 0;

        return (
          <li key={item.id}>
            <Link href={`/quote/${item.market}/${item.symbol}`} className="inv-widget-row">
              <StockNameWithLogo
                market={item.market}
                symbol={item.symbol}
                name={item.name}
                size={22}
                className="inv-widget-name inv-widget-name--with-logo"
                nameClassName="inv-widget-name-text"
              />
              <span className="inv-widget-right">
                {showQuote ? (
                  <>
                    <span className="tabular">{formatPrice(live.price, decimals)}</span>
                    <span className={`tabular ${priceClass(live.changePercent)}`}>
                      {formatPercent(live.changePercent)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inv-code tabular">{item.symbol}</span>
                    <span className="text-muted-sm">{item.type}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";

  return (
    <>
      <SearchAutocomplete initialQuery={initial} autoFocus />
      <p className="inv-page-desc search-page-hint">
        입력하면 자동완성이 뜹니다. ↑↓ 로 선택 후 Enter, 또는 검색 버튼으로 결과 목록을 엽니다.
      </p>
      <Suspense fallback={null}>
        <SearchResultsFromQuery />
      </Suspense>
    </>
  );
}

export default function SearchPageContent() {
  return (
    <Suspense fallback={<LoadingState rows={3} />}>
      <SearchPageInner />
    </Suspense>
  );
}
