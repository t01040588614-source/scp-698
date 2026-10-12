"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import KoreaMarketWithScreener from "@/components/market/KoreaMarketWithScreener";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import LoadingState from "@/components/common/LoadingState";

function KoreaBoardFromQuery() {
  const searchParams = useSearchParams();
  return <KoreaMarketWithScreener sectorFilter={searchParams.get("sector")} />;
}

export default function KoreaStockPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "시장", href: "/markets" },
        { label: "한국 주식" },
      ]}
      title="대한민국 주식"
      description="KOSPI·KOSDAQ 주요 종목과 지수, 시세."
      sidebar={{ market: "korea", showNews: true, showCalendar: true, showRankings: true }}
      compactHead
    >
      <Suspense fallback={<LoadingState rows={8} />}>
        <KoreaBoardFromQuery />
      </Suspense>
    </InvestingPageLayout>
  );
}
