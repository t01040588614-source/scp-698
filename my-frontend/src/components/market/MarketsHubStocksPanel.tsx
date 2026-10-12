"use client";

import { useMemo } from "react";
import EquitiesTable from "@/components/market/EquitiesTable";
import IntlStocksTable from "@/components/market/IntlStocksTable";
import LoadingState from "@/components/common/LoadingState";
import { koreaToEquity, usToEquity } from "@/lib/equityQuotes";
import {
  HUB_STOCK_SECTION_TITLES,
  type HubStockRegion,
} from "@/lib/regionalMarkets";
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

  if (isLoading && !koreaRows.length && !usRows.length && !asiaStocks.length && !europeStocks.length) {
    return <LoadingState rows={6} />;
  }

  return (
    <>
      {regions.includes("korea") && (
        <section className="inv-hub-table-section">
          <h3 className="inv-hub-section-title">{HUB_STOCK_SECTION_TITLES.korea}</h3>
          <EquitiesTable
            rows={koreaRows}
            market="korea"
            investingExact
            isLoading={isLoading && koreaRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            footerHref="/korea"
            footerLabel="한국 종목 보드로 이동"
          />
        </section>
      )}
      {regions.includes("us") && (
        <section className="inv-hub-table-section">
          <h3 className="inv-hub-section-title">{HUB_STOCK_SECTION_TITLES.us}</h3>
          <EquitiesTable
            rows={usRows}
            market="us"
            investingExact
            isLoading={isLoading && usRows.length === 0}
            liveQuotes={liveQuotes}
            liveTicks={liveTicks}
            liveStream={liveStream}
            footerHref="/us"
            footerLabel="미국 종목 보드로 이동"
          />
        </section>
      )}
      {regions.includes("asia") && (
        <IntlStocksTable
          title={HUB_STOCK_SECTION_TITLES.asia}
          stocks={asiaStocks}
          liveQuotes={liveQuotes}
          liveTicks={liveTicks}
        />
      )}
      {regions.includes("europe") && (
        <IntlStocksTable
          title={HUB_STOCK_SECTION_TITLES.europe}
          stocks={europeStocks}
          liveQuotes={liveQuotes}
          liveTicks={liveTicks}
        />
      )}
    </>
  );
}
