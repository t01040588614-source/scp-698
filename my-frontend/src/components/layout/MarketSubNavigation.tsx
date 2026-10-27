"use client";

import { usePathname } from "next/navigation";
import AppLink from "@/components/common/AppLink";

const LINKS = [
  { href: "/korea", label: "한국 주식" },
  { href: "/us", label: "미국 주식" },
  { href: "/markets", label: "시장 개요" },
  { href: "/charts", label: "차트" },
  { href: "/calendar", label: "경제 캘린더" },
  { href: "/news", label: "뉴스" },
  { href: "/watchlist", label: "관심목록" },
] as const;

export default function MarketSubNavigation() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="inv-market-subnav" aria-label="시장 하위 메뉴">
      <div className="container inv-market-subnav-inner">
        {LINKS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/markets" && pathname.startsWith(`${item.href}/`));
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
      </div>
    </nav>
  );
}
