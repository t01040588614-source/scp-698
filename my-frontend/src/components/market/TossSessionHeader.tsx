"use client";

import { useLiveMarketSessions } from "@/hooks/useLiveMarketSessions";
import { sessionLabel } from "@/lib/marketHours";
import { getMarketSession } from "@/lib/marketSession";

/** 토스증권 홈 상단 — 국내 정규장 상태 */
export default function TossSessionHeader() {
  const { kr, krDetail, ready } = useLiveMarketSessions();
  const label = ready
    ? kr === "open"
      ? "Korea · Regular hours"
      : `Korea · ${sessionLabel(kr)}`
    : "Korea market";
  const detail = ready ? krDetail ?? getMarketSession("korea").detail : "Checking session…";

  return (
    <div className="toss-session-header">
      <div className="toss-session-header-main">
        <span className={`toss-session-badge${kr === "open" ? " is-open" : ""}`}>{label}</span>
        <span className="toss-session-detail">{detail}</span>
      </div>
    </div>
  );
}
