"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildLoginHref } from "@/lib/authNavigation";
import { uiConfig } from "@/config/uiConfig";
import { useStockSearchAutocomplete } from "@/hooks/useStockSearchAutocomplete";
import ThemeToggle from "@/components/common/ThemeToggle";
import AppLogo from "@/components/layout/AppLogo";
import { brand } from "@/config/brand";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
}

export default function MobileHeader({
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
}: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const loginHref = buildLoginHref(pathname ?? "/");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading: searchLoading } = useStockSearchAutocomplete(query);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onMenuClose();
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMenuClose]);

  return (
    <>
      <header className="mobile-header flex md:hidden">
        <AppLogo onClick={onMenuClose} />
        <div className="mobile-actions">
          <ThemeToggle />
          <button
            type="button"
            aria-label="검색 열기"
            onClick={() => setSearchOpen(true)}
          >
            검색
          </button>
          <button
            type="button"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={onMenuToggle}
          >
            메뉴
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="mobile-search-panel" role="dialog" aria-label="검색">
          <label htmlFor="mobile-search" className="sr-only">
            종목 또는 뉴스 검색
          </label>
          <input
            id="mobile-search"
            type="search"
            placeholder={brand.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) {
                  setSearchOpen(false);
                  router.push(`/quote/${results[0].market}/${results[0].symbol}`);
                  return;
                }
                const q = query.trim();
                if (!q) return;
                setSearchOpen(false);
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }
            }}
            autoFocus
          />
          <div style={{ marginTop: 12 }}>
            {searchLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>검색 중…</p>
            ) : results.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>검색 결과가 없습니다.</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item search-result-item--with-logo"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/quote/${item.market}/${item.symbol}`);
                  }}
                >
                  <StockCompanyLogo market={item.market} symbol={item.symbol} name={item.name} size={26} />
                  <span className="search-result-text">
                    {item.name} ({item.symbol})
                  </span>
                </button>
              ))
            )}
          </div>
          {query.trim() ? (
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              className="btn-primary"
              style={{ marginTop: 16, display: "inline-block", textAlign: "center" }}
              onClick={() => setSearchOpen(false)}
            >
              전체 검색 결과
            </Link>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setSearchOpen(false)}
          >
            닫기
          </button>
        </div>
      )}

      {isMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={onMenuClose} aria-hidden />
          <div id="mobile-menu" className="mobile-menu-drawer" role="dialog" aria-label="모바일 메뉴">
            <button type="button" onClick={onMenuClose}>
              닫기
            </button>
            <nav aria-label="모바일 주요 메뉴">
              {uiConfig.navigation.primary.map((item) => (
                <Link key={item.href} href={item.href} onClick={onMenuClose}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mobile-menu-legacy">
              <p>종목 · 계정</p>
              {uiConfig.navigation.legacy.map((item) => (
                <Link key={item.href} href={item.href} onClick={onMenuClose}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mobile-menu-legacy">
              <p>계정</p>
              {isAuthenticated ? (
                <>
                  <span className="text-muted-sm">{user?.username}님</span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onMenuClose();
                    }}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href={loginHref} onClick={onMenuClose}>
                    로그인
                  </Link>
                  <Link href="/register" onClick={onMenuClose}>
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
