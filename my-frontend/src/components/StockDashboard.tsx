"use client";

import Link from "next/link";
import KoreaEquitiesBoard from "@/components/market/KoreaEquitiesBoard";
import USEquitiesBoard from "@/components/market/USEquitiesBoard";
import MarketSummary from "./MarketSummary";

type StockDashboardProps = {
  /** 홈 등 임베드 시 상단 목 지수 요약 숨김 */
  hideMarketSummary?: boolean;
};

/** @deprecated 라우트에서는 /korea · /us 보드를 사용합니다. 임베드용 미리보기만 유지 */
export default function StockDashboard({ hideMarketSummary = false }: StockDashboardProps) {
  return (
    <div className="space-y-6">
      {!hideMarketSummary && <MarketSummary />}

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/korea">한국 종목 보드</Link>
        {" · "}
        <Link href="/us">미국 종목 보드</Link>
        {" · "}
        <Link href="/markets">시장 허브</Link>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 inv-equities-page">
        <section>
          <h2 className="inv-page-title" style={{ fontSize: "1.1rem" }}>
            한국 주식
          </h2>
          <KoreaEquitiesBoard compact />
        </section>
        <section>
          <h2 className="inv-page-title" style={{ fontSize: "1.1rem" }}>
            미국 주식
          </h2>
          <USEquitiesBoard compact />
        </section>
      </div>
    </div>
  );
}
