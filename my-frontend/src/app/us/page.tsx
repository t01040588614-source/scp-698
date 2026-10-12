"use client";

import USMarketBoard from "@/components/market/USMarketBoard";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";

export default function USStockPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "시장", href: "/markets" },
        { label: "미국 주식" },
      ]}
      title="미국 주식"
      description="NASDAQ·NYSE 주요 종목과 지수, 시세."
      sidebar={{ market: "us", showNews: true, showCalendar: true, showRankings: true }}
      compactHead
    >
      <USMarketBoard />
    </InvestingPageLayout>
  );
}
