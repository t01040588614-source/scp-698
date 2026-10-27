"use client";

import type { MarketRegionId } from "@/lib/regionalMarkets";
import { regionFilterBlurb, regionFilterLabel } from "@/lib/regionalMarkets";

type MarketsHubActiveFilterProps = {
  region: MarketRegionId;
  onSelectOverview: () => void;
};

/** 지역 필터가 적용 중일 때 아래 표·종목과의 연결을 명확히 표시 */
export default function MarketsHubActiveFilter({
  region,
  onSelectOverview,
}: MarketsHubActiveFilterProps) {
  if (region === "overview") {
    return (
      <p className="inv-hub-filter-hint" role="note">
        카드나 상단 탭을 누르면 지역별로 지수·종목을 좁혀 볼 수 있습니다.
      </p>
    );
  }

  return (
    <div className="inv-hub-active-filter" role="status" aria-live="polite">
      <div className="inv-hub-active-filter-main">
        <span className="inv-hub-active-filter-badge">필터</span>
        <span className="inv-hub-active-filter-title">{regionFilterLabel(region)}</span>
        <span className="inv-hub-active-filter-desc">{regionFilterBlurb(region)}</span>
      </div>
      <button type="button" className="inv-hub-active-filter-clear" onClick={onSelectOverview}>
        전체 시장으로
      </button>
    </div>
  );
}
