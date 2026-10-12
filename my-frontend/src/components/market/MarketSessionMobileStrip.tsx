"use client";

import MarketSessionPills from "@/components/market/MarketSessionPills";

/** 모바일 전용 KR/US 장 상태 pill 줄 */
export default function MarketSessionMobileStrip() {
  return (
    <div className="inv-market-sessions-mobile">
      <div className="container inv-market-sessions-mobile-inner">
        <MarketSessionPills variant="compact" className="inv-market-sessions-mobile-pills" />
      </div>
    </div>
  );
}
