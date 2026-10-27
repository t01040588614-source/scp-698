import type { MarketIndexQuote } from "@/types/stock";
import { computeBreadth, type MarketBreadth } from "@/lib/regionalMarkets";
import type { MarketRegionId } from "@/lib/regionalMarkets";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";

export type MapRegionId = Exclude<MarketRegionId, "overview">;

export type RegionMapZone = {
  id: MapRegionId;
  label: string;
  flag: string;
  headlineIndexId: string;
  changePercent: number;
  headlineName: string;
  headlinePrice: number;
  stockCount: number;
  live: boolean;
};

export type RegionMapZoneDetail = RegionMapZone & {
  indices: MarketIndexQuote[];
  breadth: MarketBreadth;
};

const ZONE_META: Record<
  MapRegionId,
  { label: string; flag: string; indexIds: string[]; headlineIndexId: string }
> = {
  korea: {
    label: "Korea",
    flag: "🇰🇷",
    indexIds: ["kospi", "kospi200", "kosdaq"],
    headlineIndexId: "kospi",
  },
  asia: {
    label: "Asia",
    flag: "🌏",
    indexIds: ["nikkei"],
    headlineIndexId: "nikkei",
  },
  us: {
    label: "United States",
    flag: "🇺🇸",
    indexIds: ["nasdaq", "sp500", "dow", "us-tech100"],
    headlineIndexId: "nasdaq",
  },
  europe: {
    label: "Europe",
    flag: "🇪🇺",
    indexIds: ["dax"],
    headlineIndexId: "dax",
  },
};

function avgChange(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function indexById(all: MarketIndexQuote[], id: string): MarketIndexQuote {
  return all.find((r) => r.id === id) ?? seedHubIndexQuote(id);
}

function buildZoneRow(
  id: MapRegionId,
  indices: MarketIndexQuote[],
  stockChanges: Record<MapRegionId, number[]>
): RegionMapZoneDetail {
  const meta = ZONE_META[id];
  const indexMap = new Map(indices.map((r) => [r.id, r]));
  const indexRows = meta.indexIds.map((idx) => indexMap.get(idx) ?? seedHubIndexQuote(idx));
  const indexChanges = indexRows
    .map((row) => row.changePercent)
    .filter((v): v is number => Number.isFinite(v));
  const stockCh = stockChanges[id] ?? [];
  const indexAvg = avgChange(indexChanges);
  const stockAvg = avgChange(stockCh);
  const indexLive = indexChanges.some((c) => Math.abs(c) > 0.001);
  const stockLive = stockCh.some((c) => Math.abs(c) > 0.001);
  const changePercent = indexLive || !stockLive ? indexAvg : stockAvg;
  const headline = indexById(indices, meta.headlineIndexId);
  return {
    id,
    label: meta.label,
    flag: meta.flag,
    headlineIndexId: meta.headlineIndexId,
    changePercent,
    headlineName: headline.name,
    headlinePrice: headline.price,
    stockCount: stockCh.length,
    live: headline.status === "live" || indexLive || stockLive,
    indices: indexRows,
    breadth: computeBreadth(stockCh),
  };
}

/** 지수·종목 등락률로 지역별 요약(지수 목록·breadth) 생성 */
export function buildRegionMapZones(input: {
  indices: MarketIndexQuote[];
  stockChanges: Record<MapRegionId, number[]>;
}): RegionMapZone[] {
  return buildRegionMapZoneDetails(input);
}

export function buildRegionMapZoneDetails(input: {
  indices: MarketIndexQuote[];
  stockChanges: Record<MapRegionId, number[]>;
}): RegionMapZoneDetail[] {
  const { indices, stockChanges } = input;
  return (Object.keys(ZONE_META) as MapRegionId[]).map((id) =>
    buildZoneRow(id, indices, stockChanges)
  );
}

export function regionMapFill(changePercent: number, active: boolean): string {
  const abs = Math.abs(changePercent);
  const alpha = active ? 0.92 : 0.72;
  if (changePercent > 0.05) {
    const t = Math.min(1, abs / 2);
    return `rgba(214, 64, 69, ${0.35 + t * 0.45 * alpha})`;
  }
  if (changePercent < -0.05) {
    const t = Math.min(1, abs / 2);
    return `rgba(37, 99, 235, ${0.3 + t * 0.45 * alpha})`;
  }
  return active ? "rgba(100, 116, 139, 0.45)" : "rgba(148, 163, 184, 0.35)";
}
