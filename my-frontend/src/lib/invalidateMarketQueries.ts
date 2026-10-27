import type { QueryClient } from "@tanstack/react-query";

/** REST 캐시 새로고침 후 허브·보드·사이드바가 같은 시세를 쓰도록 */
export function invalidateMarketQueries(qc: QueryClient) {
  const keys = [
    ["marketCacheStatus"],
    ["marketHubIndices"],
    ["marketTicker"],
    ["marketOverview"],
    ["koreaStocks"],
    ["usStocks"],
    ["asiaStocks"],
    ["europeStocks"],
    ["boardIndices"],
    ["sidebarIndices"],
    ["sidebarIndexChart"],
    ["sidebarKoreaStocks"],
    ["sidebarUsStocks"],
    ["chartKoreaStocks"],
    ["chartUsStocks"],
    ["liveStockDetail"],
  ] as const;
  for (const queryKey of keys) {
    void qc.invalidateQueries({ queryKey: [...queryKey] });
  }
}
