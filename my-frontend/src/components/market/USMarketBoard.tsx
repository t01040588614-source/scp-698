"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import USEquitiesBoard from "@/components/market/USEquitiesBoard";
import LoadingState from "@/components/common/LoadingState";

function USBoardFromQuery() {
  const searchParams = useSearchParams();
  return <USEquitiesBoard sectorFilter={searchParams.get("sector")} />;
}

/** /us — 한국 보드와 동일 레이아웃 (섹터 쿼리 지원) */
export default function USMarketBoard() {
  return (
    <Suspense fallback={<LoadingState rows={8} />}>
      <USBoardFromQuery />
    </Suspense>
  );
}
