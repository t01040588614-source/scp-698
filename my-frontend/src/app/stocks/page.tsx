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

/** DOCX /stocks — 한국 스크리너·종목 보드 ( /korea 와 동일 기능 ) */
export default function StocksPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "종목 (/stocks)" },
      ]}
      title="한국 주식 (DOCX /stocks)"
      description="필터·정렬·스크리너 저장 — Investing.com 한국 종목 목록 명세"
      sidebar={{ market: "korea", showNews: true, showCalendar: true, showRankings: true }}
      compactHead
    >
      <Suspense fallback={<LoadingState rows={8} />}>
        <StocksBoard />
      </Suspense>
    </InvestingPageLayout>
  );
}
