"use client";

import { useMemo } from "react";
import EquitiesTable from "@/components/market/EquitiesTable";
import MarketsHubStocksJumpNav, {
  hubStockSectionId,
  hubStockSectionTitle,
} from "@/components/market/MarketsHubStocksJumpNav";
import { intlToEquity, koreaToEquity, usToEquity } from "@/lib/equityQuotes";
import type { HubStockRegion } from "@/lib/regionalMarkets";
import type { IntlStock, KoreaStock, USStock } from "@/types/stock";
import type { LiveStockTick } from "@/lib/wsNormalize";

type MarketsHubStocksPanelProps = {
  regions: HubStockRegion[];
  koreaStocks?: KoreaStock[];
  usStocks?: USStock[];
  asiaStocks?: IntlStock[];
  europeStocks?: IntlStock[];
  liveQuotes?: Record<string, number>;
  liveTicks?: Record<string, LiveStockTick>;
  isLoading?: boolean;
  liveStream?: boolean;
};

export default function MarketsHubStocksPanel({
  regions,
  koreaStocks = [],
  usStocks = [],
  asiaStocks = [],
  europeStocks = [],
  liveQuotes = {},
  liveTicks = {},
  isLoading,
  liveStream = false,
}: MarketsHubStocksPanelProps) {
  const koreaRows = useMemo(() => koreaStocks.map(koreaToEquity), [koreaStocks]);
  const usRows = useMemo(() => usStocks.map(usToEquity), [usStocks]);
  const asiaRows = useMemo(() => asiaStocks.map(intlToEquity), [asiaStocks]);
  const europeRows = useMemo(() => europeStocks.map(intlToEquity), [europeStocks]);

  const HUB_PREVIEW_LIMIT = 55;

  return (
    <>
      <MarketsHubStocksJumpNav regions={regions} />
      {regions.includes("korea") && (
        <section id={hubStockSectionId("korea")} className="inv-hub-table-section inv-hub-stock-section">
          <h3 className="inv-hub-section-title">{hubStockSectionTitle("korea")}</h3>
          <EquitiesTable
            rows={koreaRows}
            market="korea"
            investingExact
            isLoading={isLoading && koreaRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            previewLimit={HUB_PREVIEW_LIMIT}
            persistSortPrefs
            footerHref="/korea"
            footerLabel="한국 종목 보드로 이동"
          />
        </section>
      )}
      {regions.includes("us") && (
        <section id={hubStockSectionId("us")} className="inv-hub-table-section inv-hub-stock-section">
          <h3 className="inv-hub-section-title">{hubStockSectionTitle("us")}</h3>
          <EquitiesTable
            rows={usRows}
            market="us"
            investingExact
            isLoading={isLoading && usRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            previewLimit={HUB_PREVIEW_LIMIT}
            persistSortPrefs
            footerHref="/us"
            footerLabel="미국 종목 보드로 이동"
          />
        </section>
      )}
      {regions.includes("asia") && (
        <section id={hubStockSectionId("asia")} className="inv-hub-table-section inv-hub-stock-section">
          <h3 className="inv-hub-section-title">{hubStockSectionTitle("asia")}</h3>
          <EquitiesTable
            rows={asiaRows}
            market="asia"
            investingExact
            isLoading={isLoading && asiaRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            previewLimit={HUB_PREVIEW_LIMIT}
            persistSortPrefs
          />
        </section>
      )}
      {regions.includes("europe") && (
        <section id={hubStockSectionId("europe")} className="inv-hub-table-section inv-hub-stock-section">
          <h3 className="inv-hub-section-title">{hubStockSectionTitle("europe")}</h3>
          <EquitiesTable
            rows={europeRows}
            market="europe"
            investingExact
            isLoading={isLoading && europeRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            previewLimit={HUB_PREVIEW_LIMIT}
            persistSortPrefs
          />
        </section>
      )}
    </>
  );
}
