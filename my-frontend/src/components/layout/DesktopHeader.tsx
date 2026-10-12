"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStockSearchAutocomplete } from "@/hooks/useStockSearchAutocomplete";
import ThemeToggle from "@/components/common/ThemeToggle";
import AppLogo from "@/components/layout/AppLogo";
import { brand } from "@/config/brand";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

export default function DesktopHeader() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const { results, loading: searchLoading } = useStockSearchAutocomplete(query);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!searchLoading) {
      setOpen(true);
      setActiveIndex(results.length > 0 ? 0 : -1);
    }
  }, [query, results, searchLoading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goSearchPage = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [router],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      const item = results[activeIndex];
      setOpen(false);
      router.push(`/quote/${item.market}/${item.symbol}`);
      return;
    }
    goSearchPage(query);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (!open || results.length === 0)) {
      e.preventDefault();
      goSearchPage(query);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = results[activeIndex];
      setOpen(false);
      router.push(`/quote/${item.market}/${item.symbol}`);
    }
  };

  return (
    <header className="desktop-header hidden md:block">
      <div className="container header-inner">
        <AppLogo />

        <div className="search-form" ref={searchRef}>
          <form onSubmit={onSubmit} style={{ display: "flex", flex: 1 }}>
            <label htmlFor="desktop-search" className="sr-only">
              종목 또는 뉴스 검색
            </label>
            <input
              id="desktop-search"
              type="search"
              placeholder={brand.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls="desktop-search-results"
            />
            <button type="submit">검색</button>
          </form>
          {open && (
            <div id="desktop-search-results" className="search-results" role="listbox">
              {searchLoading ? (
                <p className="search-results-hint">검색 중…</p>
              ) : results.length === 0 ? (
                <p className="empty-state" style={{ padding: 12, margin: 0 }}>
                  검색 결과가 없습니다.
                </p>
              ) : (
                results.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/quote/${item.market}/${item.symbol}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className="search-result-item search-result-item--with-logo"
                    style={
                      activeIndex === index
                        ? { background: "var(--surface-muted)" }
                        : undefined
                    }
                    onClick={() => setOpen(false)}
                  >
                    <StockCompanyLogo market={item.market} symbol={item.symbol} name={item.name} size={26} />
                    <span className="search-result-text">
                      <strong>{item.name}</strong>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                        {item.symbol} · {item.type}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="desktop-actions" aria-label="사용자 메뉴">
          <Link href="/portfolio">포트폴리오</Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: 13 }}>{user?.username}님</span>
              <button type="button" onClick={logout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login">로그인</Link>
              <Link href="/register" className="app-header-cta">
                가입하기
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
