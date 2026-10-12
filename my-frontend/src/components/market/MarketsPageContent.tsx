"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InvestingMarketsHub from "@/components/market/InvestingMarketsHub";
import type { MarketsContentTabId } from "@/lib/regionalMarkets";
import LoadingState from "@/components/common/LoadingState";

function parseContentTab(tab: string | null, indexId: string | null): MarketsContentTabId {
  if (indexId) return "indices";
  if (
    tab === "indices" ||
    tab === "stocks" ||
    tab === "forex" ||
    tab === "commodities" ||
    tab === "overview"
  ) {
    return tab;
  }
  return "overview";
}

function MarketsHubFromQuery() {
  const searchParams = useSearchParams();
  const indexId = searchParams.get("index");
  const tab = parseContentTab(searchParams.get("tab"), indexId);

  return (
    <InvestingMarketsHub initialContentTab={tab} highlightIndexId={indexId} />
  );
}

export default function MarketsPageContent() {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <MarketsHubFromQuery />
    </Suspense>
  );
}
