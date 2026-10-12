import { mockSearchResults } from "@/data/mockData";
import { stockApi } from "@/lib/api";

export interface SearchResultItem {
  id: string;
  name: string;
  symbol: string;
  type: string;
  market: "korea" | "us";
}

export async function searchAll(query: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await stockApi.searchStocks(q);
    const stocks = res.data || [];
    if (stocks.length > 0) {
      return stocks.slice(0, 8).map((s, i) => {
        const isKorea = "market" in s && (s.market === "KOSPI" || s.market === "KOSDAQ");
        return {
          id: `api-${i}-${s.symbol}`,
          name: s.name,
          symbol: s.symbol,
          type:
            "market" in s && s.market
              ? String(s.market)
              : "exchange" in s && s.exchange
                ? String(s.exchange)
                : "종목",
          market: isKorea ? ("korea" as const) : ("us" as const),
        };
      });
    }
  } catch {
    // fallback to mock
  }

  const upper = q.toUpperCase();
  return mockSearchResults
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q.toLowerCase()) ||
        item.symbol.toUpperCase().includes(upper)
    )
    .map((item) => ({
      ...item,
      market: item.symbol.length <= 6 ? ("korea" as const) : ("us" as const),
    }));
}
