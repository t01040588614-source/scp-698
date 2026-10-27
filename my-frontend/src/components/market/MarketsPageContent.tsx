"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InvestingMarketsHub from "@/components/market/InvestingMarketsHub";
import type { MarketsContentTabId } from "@/lib/regionalMarkets";
import LoadingState from "@/components/common/LoadingState";
import { indexMarketsHref } from "@/lib/indexStrip";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const indexId = searchParams.get("index");
  const tab = parseContentTab(searchParams.get("tab"), indexId);

  useEffect(() => {
    if (!indexId) return;
    router.replace(indexMarketsHref(indexId));
  }, [indexId, router]);

  if (indexId) {
    return <LoadingState rows={4} />;
  }

  return (
    <InvestingMarketsHub initialContentTab={tab} highlightIndexId={null} />
  );
}

export default function MarketsPageContent() {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <MarketsHubFromQuery />
    </Suspense>
  );
}
