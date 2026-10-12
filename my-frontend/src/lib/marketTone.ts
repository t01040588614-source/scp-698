/** 지수·티커 카드 좌측 악센트 톤 (한국/미국/FX/원자재/글로벌) */
export type MarketTone = "kr" | "us" | "fx" | "commodity" | "global";

export function getMarketTone(id: string, name = ""): MarketTone {
  const key = `${id} ${name}`.toLowerCase();

  if (
    /원유|금|은|백금|구리|밀|옥수수|대두|설탕|면|천연가스|oil|gold|silver|platinum|copper|commodity|wti|brent|natural.?gas|soy|corn|wheat|sugar|cotton/.test(
      key
    )
  ) {
    return "commodity";
  }
  if (/usd|eur|jpy|krw|fx|달러|환율|\/krw|dxy|달러\s*지수/.test(key)) {
    return "fx";
  }
  if (/kospi|kosdaq|코스피|코스닥/.test(key)) {
    return "kr";
  }
  if (/nasdaq|dow|s&p|sp500|us tech|nyse|미국\s*500|미국\s*30|dax/.test(key)) {
    return "us";
  }
  if (/nikkei|닛케이|hang|홍콩|hsi|ftse|cac|글로벌/.test(key)) {
    return "global";
  }
  return "global";
}
