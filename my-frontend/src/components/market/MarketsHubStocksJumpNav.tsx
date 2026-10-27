"use client";

import {
  HUB_STOCK_SECTION_TITLES,
  type HubStockRegion,
} from "@/lib/regionalMarkets";

const REGION_SHORT: Record<HubStockRegion, string> = {
  korea: "한국",
  us: "미국",
  asia: "아시아",
  europe: "유럽",
};

type MarketsHubStocksJumpNavProps = {
  regions: HubStockRegion[];
};

export default function MarketsHubStocksJumpNav({ regions }: MarketsHubStocksJumpNavProps) {
  if (regions.length <= 1) return null;

  const jump = (id: HubStockRegion) => {
    const el = document.getElementById(`hub-stocks-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="inv-hub-stocks-jump" aria-label="종목 섹션 바로가기">
      <span className="inv-hub-stocks-jump-label">바로가기</span>
      {regions.map((id) => (
        <button key={id} type="button" className="inv-hub-stocks-jump-btn" onClick={() => jump(id)}>
          {REGION_SHORT[id]}
        </button>
      ))}
    </nav>
  );
}

export function hubStockSectionId(region: HubStockRegion): string {
  return `hub-stocks-${region}`;
}

export function hubStockSectionTitle(region: HubStockRegion): string {
  return HUB_STOCK_SECTION_TITLES[region];
}
