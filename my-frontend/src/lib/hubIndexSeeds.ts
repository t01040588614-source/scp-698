import type { MarketIndexQuote } from "@/types/stock";

const SEEDS: Record<string, Omit<MarketIndexQuote, "id">> = {
  kospi: { name: "코스피", country: "KR", category: "indices", price: 2680, change: 0, changePercent: 0, status: "live" },
  kospi200: { name: "코스피200", country: "KR", category: "indices", price: 1116, change: 0, changePercent: 0, status: "live" },
  kosdaq: { name: "코스닥", country: "KR", category: "indices", price: 842, change: 0, changePercent: 0, status: "live" },
  nikkei: { name: "닛케이", country: "JP", category: "indices", price: 70252, change: 0, changePercent: 0, status: "live" },
  nasdaq: { name: "NASDAQ", country: "US", category: "indices", price: 17850, change: 0, changePercent: 0, status: "live" },
  sp500: { name: "S&P 500", country: "US", category: "indices", price: 5420, change: 0, changePercent: 0, status: "live" },
  dow: { name: "Dow Jones", country: "US", category: "indices", price: 39500, change: 0, changePercent: 0, status: "live" },
  "us-tech100": { name: "US Tech 100", country: "US", category: "indices", price: 31231, change: 0, changePercent: 0, status: "live" },
  dax: { name: "DAX", country: "DE", category: "indices", price: 25449, change: 0, changePercent: 0, status: "live" },
  "usd-krw": { name: "USD/KRW", country: "KR", category: "forex", price: 1382, change: 0, changePercent: 0, status: "live" },
  "eur-krw": { name: "EUR/KRW", country: "KR", category: "forex", price: 1488, change: 0, changePercent: 0, status: "live" },
  "jpy-krw": { name: "JPY/KRW", country: "KR", category: "forex", price: 9.12, change: 0, changePercent: 0, status: "live" },
  "usd-index": { name: "미국 달러 지수", country: "US", category: "forex", price: 101.8, change: 0, changePercent: 0, status: "live" },
  gold: { name: "금", country: "CM", category: "commodity", price: 2654, change: 0, changePercent: 0, status: "live" },
  silver: { name: "은", country: "CM", category: "commodity", price: 31.2, change: 0, changePercent: 0, status: "live" },
  platinum: { name: "백금", country: "CM", category: "commodity", price: 982, change: 0, changePercent: 0, status: "live" },
  oil: { name: "WTI 원유", country: "CM", category: "commodity", price: 68.4, change: 0, changePercent: 0, status: "live" },
  brent: { name: "브렌트유", country: "CM", category: "commodity", price: 72.1, change: 0, changePercent: 0, status: "live" },
  "natural-gas": { name: "천연가스", country: "CM", category: "commodity", price: 2.85, change: 0, changePercent: 0, status: "live" },
  copper: { name: "구리", country: "CM", category: "commodity", price: 4.52, change: 0, changePercent: 0, status: "live" },
  wheat: { name: "밀", country: "CM", category: "commodity", price: 5.42, change: 0, changePercent: 0, status: "live" },
  corn: { name: "옥수수", country: "CM", category: "commodity", price: 4.28, change: 0, changePercent: 0, status: "live" },
  soybeans: { name: "대두", country: "CM", category: "commodity", price: 10.15, change: 0, changePercent: 0, status: "live" },
  sugar: { name: "설탕", country: "CM", category: "commodity", price: 19.8, change: 0, changePercent: 0, status: "live" },
  cotton: { name: "면", country: "CM", category: "commodity", price: 72.5, change: 0, changePercent: 0, status: "live" },
};

/** 이름·메타만 (가격 placeholder 없음) */
export function indexCatalogMeta(id: string): Omit<MarketIndexQuote, "id" | "price" | "change" | "changePercent"> {
  const row = SEEDS[id];
  if (row) {
    return {
      name: row.name,
      country: row.country,
      category: row.category,
      status: row.status,
    };
  }
  return {
    name: id,
    country: "—",
    category: "indices",
    status: "live",
  };
}

export function pendingIndexQuote(id: string): MarketIndexQuote {
  return {
    id,
    ...indexCatalogMeta(id),
    price: 0,
    change: 0,
    changePercent: 0,
    status: "pending",
  };
}

/** @deprecated API·WS 모두 실패한 오프라인 참고용 — UI 초기 로딩에는 pendingIndexQuote 사용 */
export function seedHubIndexQuote(id: string): MarketIndexQuote {
  const row = SEEDS[id];
  if (row) return { id, ...row };
  return pendingIndexQuote(id);
}
