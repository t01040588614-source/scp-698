"use client";

import AppLink from "@/components/common/AppLink";
import { brand } from "@/config/brand";

const FOOTER_LINKS = [
  { href: "/markets", label: "시장 개요" },
  { href: "/korea", label: "한국 주식" },
  { href: "/us", label: "미국 주식" },
  { href: "/charts", label: "차트" },
  { href: "/portfolio", label: "포트폴리오" },
  { href: "/news", label: "뉴스" },
  { href: "/watchlist", label: "관심목록" },
  { href: "/tools", label: "도구" },
  { href: "/tools/integrations", label: "API 연동" },
] as const;

const LEGAL_LINKS = [
  { href: "/legal/terms", label: "이용약관" },
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/finance", label: "금융정보 고지" },
] as const;

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-brand">
          <p className="site-footer-name">{brand.name}</p>
          <p className="site-footer-tag">{brand.tagline}</p>
        </div>
        <nav className="site-footer-nav" aria-label="바닥글 메뉴">
          {FOOTER_LINKS.map((item) => (
            <AppLink key={item.href} href={item.href}>
              {item.label}
            </AppLink>
          ))}
        </nav>
        <nav className="site-footer-nav site-footer-nav--legal" aria-label="약관 및 고지">
          {LEGAL_LINKS.map((item) => (
            <AppLink key={item.href} href={item.href}>
              {item.label}
            </AppLink>
          ))}
        </nav>
        <p className="site-footer-disclaimer">
          © {year} {brand.name}. 시세는 API·WebSocket 기준입니다. 뉴스·투자 판단 및 손실 책임은 이용자에게 있습니다.
        </p>
      </div>
    </footer>
  );
}
