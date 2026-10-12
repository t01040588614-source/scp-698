"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/markets", label: "시장", icon: "market" },
  { href: "/charts", label: "차트", icon: "chart" },
  { href: "/watchlist", label: "관심", icon: "star" },
  { href: "/news", label: "뉴스", icon: "news" },
  { href: "/calendar", label: "캘린더", icon: "calendar" },
  { href: "/tools", label: "도구", icon: "tools" },
  { href: "/analysis", label: "분석", icon: "analysis" },
] as const;

function RailIcon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75 };
  switch (name) {
    case "market":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 19V5M10 19V9M16 19V13M22 19V3" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 20h16M6 16l4-6 4 3 4-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} aria-hidden>
          <path d="M12 3l2.4 5.8L21 10l-4.5 4.2L17.5 21 12 17.8 6.5 21l1-6.8L3 10l6.6-1.2L12 3z" strokeLinejoin="round" />
        </svg>
      );
    case "news":
      return (
        <svg {...common} aria-hidden>
          <rect x="4" y="5" width="16" height="14" rx="1" />
          <path d="M8 9h8M8 13h5" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common} aria-hidden>
          <rect x="4" y="5" width="16" height="16" rx="1" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
        </svg>
      );
    case "tools":
      return (
        <svg {...common} aria-hidden>
          <path d="M14 6l4 4-6 6H8v-4l6-6z" strokeLinejoin="round" />
          <path d="M5 19h3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
      );
  }
}

type InvestingToolRailProps = {
  railRef?: React.RefObject<HTMLElement | null>;
};

export default function InvestingToolRail({ railRef }: InvestingToolRailProps = {}) {
  const pathname = usePathname();

  return (
    <nav ref={railRef as React.RefObject<HTMLElement>} className="inv-tool-rail" aria-label="빠른 도구">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "is-active" : undefined}
            title={item.label}
          >
            <span className="inv-tool-rail-icon">
              <RailIcon name={item.icon} />
            </span>
            <span className="inv-tool-rail-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
