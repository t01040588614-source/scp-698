/** kr.investing.com/equities/{slug} — 주요 한국 종목 */
const KOREA_EQUITY_SLUGS: Record<string, string> = {
  "000660": "sk-hynix-inc",
  "005930": "samsung-electronics-co-ltd",
  "066570": "lg-electronics-inc",
  "035420": "naver",
  "005380": "hyundai-motor",
  "000270": "kia-motors",
  "051910": "lg-chem",
  "006400": "samsung-sdi",
  "035720": "kakao",
  "207940": "samsung-biologics",
  "373220": "lg-energy-solution",
  "028260": "samsung-c&t",
  "105560": "kb-financial-group",
  "055550": "shinhan-financial-group",
  "012330": "hyundai-mobis",
  "032830": "samsung-life-insurance",
  "034020": "doosan-enerbility",
  "009150": "samsung-electro-mechanics",
  "018260": "samsung-sds",
  "010130": "korea-zinc",
};

export function getInvestingEquityUrl(symbol: string, market: "korea" | "us" = "korea"): string {
  const slug = KOREA_EQUITY_SLUGS[symbol];
  if (market === "korea" && slug) {
    return `https://kr.investing.com/equities/${slug}`;
  }
  return `https://kr.investing.com/search/?q=${encodeURIComponent(symbol)}`;
}
