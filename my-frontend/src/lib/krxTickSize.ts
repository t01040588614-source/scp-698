/** KRX 호가 단위 — 매수/매도 스프레드 표시용 */
export function krxTickSize(price: number): number {
  if (price < 2000) return 1;
  if (price < 5000) return 5;
  if (price < 20000) return 10;
  if (price < 50000) return 50;
  if (price < 200000) return 100;
  if (price < 500000) return 500;
  return 1000;
}

export function krxBidAsk(price: number): { bid: number; ask: number } {
  const tick = krxTickSize(price);
  return { bid: price, ask: price + tick };
}
