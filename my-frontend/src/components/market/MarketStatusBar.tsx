"use client";

import Link from "next/link";
import MarketSessionPills from "@/components/market/MarketSessionPills";

export default function MarketStatusBar() {
  return (
    <div className="inv-market-status" role="status">
      <div className="container inv-market-status-inner">
        <span className="inv-market-status-sessions-desktop">
          <MarketSessionPills variant="default" />
        </span>
        <nav className="inv-quick-links" aria-label="빠른 이동">
          <Link href="/korea">한국 주식</Link>
          <Link href="/us">미국 주식</Link>
          <Link href="/markets">시장 개요</Link>
          <Link href="/calendar">경제 캘린더</Link>
        </nav>
      </div>
    </div>
  );
}
