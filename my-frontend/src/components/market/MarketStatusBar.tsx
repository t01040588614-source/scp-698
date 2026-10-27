"use client";

import { usePathname } from "next/navigation";
import AppLink from "@/components/common/AppLink";
import MarketSessionPills from "@/components/market/MarketSessionPills";

const QUICK_LINKS = [
  { href: "/korea", label: "한국 주식" },
  { href: "/us", label: "미국 주식" },
  { href: "/markets", label: "시장 개요" },
  { href: "/calendar", label: "경제 캘린더" },
] as const;

function isQuickLinkActive(pathname: string, href: string) {
  if (href === "/markets") {
    return pathname === "/markets" || pathname.startsWith("/markets/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MarketStatusBarProps = {
  /** korea/us 하위 메뉴가 있을 때는 빠른 링크만 숨김 (KR·US pill은 항상 표시) */
  showQuickLinks?: boolean;
};

export default function MarketStatusBar({ showQuickLinks = true }: MarketStatusBarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="inv-market-status" role="status">
      <div className="container inv-market-status-inner">
        <span className="inv-market-status-sessions-desktop">
          <MarketSessionPills variant="default" />
        </span>
        {showQuickLinks ? (
          <nav className="inv-quick-links" aria-label="빠른 이동">
            {QUICK_LINKS.map((item) => {
              const active = isQuickLinkActive(pathname, item.href);
              return (
                <AppLink
                  key={item.href}
                  href={item.href}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </AppLink>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
