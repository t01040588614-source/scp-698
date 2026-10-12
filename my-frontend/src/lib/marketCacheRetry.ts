import { stockApi } from "@/lib/api";

/** 빈 목록·Yahoo 실패 시 백엔드 캐시 갱신 후 종목 쿼리 refetch */
export async function retryMarketStocksFetch(refetch: () => Promise<unknown>) {
  try {
    await stockApi.refreshMarketCache();
  } catch {
    // refresh 실패해도 목록 refetch는 시도
  }
  await refetch();
}
