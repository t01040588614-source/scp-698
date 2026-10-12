"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";

const FALLBACK = [
  { id: "tech", label: "기술", count: 722 },
  { id: "finance", label: "금융", count: 186 },
  { id: "health", label: "헬스케어", count: 154 },
  { id: "industrial", label: "산업재", count: 212 },
  { id: "consumer", label: "소비재", count: 198 },
  { id: "energy", label: "에너지", count: 43 },
  { id: "utility", label: "유틸리티", count: 28 },
  { id: "realestate", label: "부동산", count: 36 },
  { id: "materials", label: "소재", count: 91 },
  { id: "telecom", label: "통신", count: 24 },
] as const;

type SectorLinksGridProps = {
  market?: "korea" | "us";
};

export default function SectorLinksGrid({ market = "korea" }: SectorLinksGridProps) {
  const searchParams = useSearchParams();
  const activeSector = searchParams.get("sector");
  const boardHref = market === "us" ? "/us" : "/korea";

  const { data: apiSectors } = useQuery({
    queryKey: ["marketSectors"],
    queryFn: () => stockApi.getMarketSectors().then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: koreaStocks } = useQuery({
    queryKey: ["koreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    staleTime: 30_000,
    enabled: market === "korea",
  });

  const { data: usStocks } = useQuery({
    queryKey: ["usStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    staleTime: 30_000,
    enabled: market === "us",
  });

  const liveCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const pool = market === "us" ? usStocks : koreaStocks;
    for (const stock of pool ?? []) {
      const key = stock.sector?.trim() || "기타";
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [market, koreaStocks, usStocks]);

  const sectors = apiSectors?.length ? apiSectors : [...FALLBACK];

  return (
    <section className="inv-sector-panel inv-investing-panel" aria-label="업종별 탐색">
      <header className="inv-sector-panel-head">
        <h2 className="inv-sector-panel-title">업종별 종목</h2>
        {activeSector ? (
          <Link href={boardHref} className="inv-sector-panel-reset">
            필터 해제
          </Link>
        ) : (
          <span className="inv-sector-panel-hint">업종을 선택하면 목록이 필터됩니다</span>
        )}
      </header>
      <nav className="inv-sector-grid">
        {sectors.map((s) => {
          const count = liveCounts[s.label] ?? s.count;
          const isActive = activeSector === s.label;
          return (
            <Link
              key={s.id}
              href={`${boardHref}?sector=${encodeURIComponent(s.label)}`}
              className={`inv-sector-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="inv-sector-link-label">{s.label}</span>
              <span className="inv-sector-link-count tabular">{count}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
