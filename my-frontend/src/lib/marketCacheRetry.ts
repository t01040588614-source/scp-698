import type { QueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { invalidateMarketQueries } from "@/lib/invalidateMarketQueries";

/** 빈 목록·Yahoo 실패 시 백엔드 캐시 갱신 후 종목·허브 쿼리 refetch */
export async function retryMarketStocksFetch(
  refetch: () => Promise<unknown>,
  queryClient?: QueryClient
) {
  try {
    await stockApi.refreshMarketCache();
    if (queryClient) invalidateMarketQueries(queryClient);
  } catch {
    // refresh 실패해도 목록 refetch는 시도
  }
  await refetch();
}
