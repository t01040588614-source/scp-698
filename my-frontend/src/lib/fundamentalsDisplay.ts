import type { EquityQuote } from "@/lib/equityQuotes";

export function formatPeRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(2);
}

export function peRatioTitle(value: number | null | undefined): string | undefined {
  if (value == null || value <= 0) {
    return "PER 데이터 없음 — Yahoo/FDR 갱신 후 표시됩니다";
  }
  return `PER ${formatPeRatio(value)} (trailing)`;
}

export function fundamentalsCoverage(rows: { marketCap?: number; peRatio?: number }[]): {
  marketCap: number;
  pe: number;
} {
  if (rows.length === 0) return { marketCap: 0, pe: 0 };
  let mcap = 0;
  let pe = 0;
  for (const r of rows) {
    if ((r.marketCap ?? 0) > 0) mcap += 1;
    if ((r.peRatio ?? 0) > 0) pe += 1;
  }
  return {
    marketCap: mcap / rows.length,
    pe: pe / rows.length,
  };
}

export function coverageLabel(ratio: number): string {
  if (ratio >= 0.85) return "양호";
  if (ratio >= 0.35) return "일부";
  return "집계 중";
}

export function sortRankHint(
  kind: "marketCap" | "pe",
  coverage: { marketCap: number; pe: number }
): string | null {
  if (kind === "marketCap" && coverage.marketCap < 0.35) {
    return "KRX·Yahoo에서 시가총액을 불러오는 중입니다. 잠시 후 순위가 정확해집니다.";
  }
  if (kind === "pe" && coverage.pe < 0.2) {
    return "PER는 Yahoo 밸류에이션 배치(약 1~2분) 후 채워집니다.";
  }
  return null;
}

export function rowsForMarketCapRank(rows: EquityQuote[]): EquityQuote[] {
  const withCap = rows.filter((r) => (r.marketCap ?? 0) > 0);
  if (withCap.length >= 3) {
    return [...withCap].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 5);
  }
  return [...rows]
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0) || b.volume - a.volume)
    .slice(0, 5);
}
