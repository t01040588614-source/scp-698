"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import KoreaMarketWithScreener from "@/components/market/KoreaMarketWithScreener";
import LoadingState from "@/components/common/LoadingState";

function StocksBoard() {
  const searchParams = useSearchParams();
  return <KoreaMarketWithScreener sectorFilter={searchParams.get("sector")} />;
}

/** /stocks — 한국 스크리너·종목 보드 (/korea 와 동일 기능) */
export default function StocksPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "스크리너" },
      ]}
      title="종목 스크리너"
      description="필터·정렬·스크리너 저장으로 한국 종목을 찾아보세요."
      sidebar={{ market: "korea", showNews: true, showCalendar: true, showRankings: true }}
      compactHead
    >
      <Suspense fallback={<LoadingState rows={8} />}>
        <StocksBoard />
      </Suspense>
    </InvestingPageLayout>
  );
}
