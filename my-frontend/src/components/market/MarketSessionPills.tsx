"use client";

import Link from "next/link";
import {
  sessionLabel,
  sessionTooltip,
  type MarketRegionCode,
  type MarketSession,
} from "@/lib/marketHours";
import { useLiveMarketSessions } from "@/hooks/useLiveMarketSessions";

function SessionPillButton({
  href,
  region,
  regionCode,
  regionLabel,
  session,
  compact,
  ready,
}: {
  href: string;
  region: MarketRegionCode;
  regionCode: string;
  regionLabel: string;
  session: MarketSession;
  compact: boolean;
  ready: boolean;
}) {
  const status = ready ? sessionLabel(session) : "…";
  const tooltip = ready ? sessionTooltip(region, session) : "Loading market status…";
  const className = [
    "inv-session-pill",
    "inv-session-pill--btn",
    ready ? `inv-session-pill--${session}` : "inv-session-pill--pending",
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
    >
      {compact ? (
        <>
          {regionCode} <strong suppressHydrationWarning>{status}</strong>
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
  const { ready, kr, us } = useLiveMarketSessions();
  const compact = variant === "compact";

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
      />
      <SessionPillButton
        href="/us"
        region="us"
        regionCode="US"
        regionLabel="US"
        session={us}
        compact={compact}
        ready={ready}
      />
    </span>
  );
}
