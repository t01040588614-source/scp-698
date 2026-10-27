"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppLinkNavigate } from "@/hooks/useAppLinkNavigate";
import {
  sessionLabel,
  sessionTooltip,
  type MarketRegionCode,
  type MarketSession,
} from "@/lib/marketHours";
import { useLiveMarketSessions } from "@/hooks/useLiveMarketSessions";

function isMarketPillActive(pathname: string, marketHref: "/korea" | "/us"): boolean {
  if (pathname === marketHref || pathname.startsWith(`${marketHref}/`)) {
    return true;
  }
  if (marketHref === "/korea") {
    return (
      pathname === "/stocks" ||
      pathname.startsWith("/stocks/") ||
      pathname.startsWith("/quote/korea/")
    );
  }
  return pathname.startsWith("/quote/us/");
}

function SessionPillButton({
  href,
  region,
  regionCode,
  regionLabel,
  session,
  compact,
  ready,
  selected,
}: {
  href: string;
  region: MarketRegionCode;
  regionCode: string;
  regionLabel: string;
  session: MarketSession;
  compact: boolean;
  ready: boolean;
  selected: boolean;
}) {
  const navigate = useAppLinkNavigate();
  const status = ready ? sessionLabel(session) : "…";
  const tooltip = ready ? sessionTooltip(region, session) : "Loading market status…";
  const className = [
    "inv-session-pill",
    "inv-session-pill--btn",
    `inv-session-pill--${region}`,
    ready ? `inv-session-pill--${session}` : "inv-session-pill--pending",
    selected ? "inv-session-pill--selected" : "",
    compact ? "inv-session-pill--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={className}
      title={tooltip}
      aria-label={`${regionLabel} ${status}, go to ${regionLabel} stocks`}
      aria-busy={!ready}
      aria-current={selected ? "page" : undefined}
      onClick={navigate(href)}
    >
      {compact ? (
        <>
          <span className="inv-session-pill-label">{regionCode}</span>{" "}
          <strong suppressHydrationWarning>{status}</strong>
        </>
      ) : (
        <>
          <span className="inv-session-pill-label">{regionLabel}</span>
          <strong suppressHydrationWarning>{status}</strong>
        </>
      )}
    </Link>
  );
}

type MarketSessionPillsProps = {
  variant?: "compact" | "default";
  className?: string;
};

export default function MarketSessionPills({
  variant = "default",
  className,
}: MarketSessionPillsProps) {
  const pathname = usePathname();
  const { ready, kr, us } = useLiveMarketSessions();
  const compact = variant === "compact";
  const krSelected = isMarketPillActive(pathname, "/korea");
  const usSelected = isMarketPillActive(pathname, "/us");

  return (
    <span className={className} aria-label="Market hours">
      <SessionPillButton
        href="/korea"
        region="kr"
        regionCode="KR"
        regionLabel="Korea"
        session={kr}
        compact={compact}
        ready={ready}
        selected={krSelected}
      />
      <SessionPillButton
        href="/us"
        region="us"
        regionCode="US"
        regionLabel="US"
        session={us}
        compact={compact}
        ready={ready}
        selected={usSelected}
      />
    </span>
  );
}
