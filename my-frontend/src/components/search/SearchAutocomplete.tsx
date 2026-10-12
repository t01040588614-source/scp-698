"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useStockSearchAutocomplete } from "@/hooks/useStockSearchAutocomplete";
import { brand } from "@/config/brand";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

type Props = {
  initialQuery?: string;
  autoFocus?: boolean;
};

export default function SearchAutocomplete({ initialQuery = "", autoFocus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { results, loading } = useStockSearchAutocomplete(query);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeIndex >= 0 && results[activeIndex]) {
      const item = results[activeIndex];
      router.push(`/quote/${item.market}/${item.symbol}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = results[activeIndex];
      router.push(`/quote/${item.market}/${item.symbol}`);
    }
  };

  return (
    <div className="search-page-autocomplete">
      <form className="search-form search-form--page" onSubmit={onSubmit}>
        <label htmlFor="page-search" className="sr-only">
          종목 검색
        </label>
        <input
          id="page-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder={brand.searchPlaceholder}
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={query.trim().length > 0}
          aria-controls="page-search-results"
        />
        <button type="submit">검색</button>
      </form>
      {query.trim() && (
        <div id="page-search-results" className="search-results search-results--page" role="listbox">
          {loading ? (
            <p className="search-results-hint">검색 중…</p>
          ) : results.length === 0 ? (
            <p className="search-results-hint">결과 없음 — Enter로 전체 검색</p>
          ) : (
            results.map((item, index) => (
              <Link
                key={item.id}
                href={`/quote/${item.market}/${item.symbol}`}
                role="option"
                aria-selected={activeIndex === index}
                className={`search-result-item search-result-item--with-logo${activeIndex === index ? " is-active" : ""}`}
              >
                <StockCompanyLogo market={item.market} symbol={item.symbol} name={item.name} size={28} />
                <span className="search-result-text">
                  <strong>{item.name}</strong>
                  <span className="search-result-meta">
                    {item.symbol} · {item.type}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
