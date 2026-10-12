import { normalizeKoreaCode } from "@/lib/stockLogoUrl";

/** 6자리 숫자 코드면 한국, 그 외 US 티커로 간주 */
export function inferStockMarket(symbol: string): "korea" | "us" {
  return normalizeKoreaCode(symbol) ? "korea" : "us";
}
