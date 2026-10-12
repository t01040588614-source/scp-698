/** REST/WS 혼용 시 snake_case·누락 등락률 보정 */

type StockLike = {
  price?: number;
  change?: number;
  changePercent?: number;
  change_percent?: number;
  previousClose?: number;
  previous_close?: number;
  volume?: number;
};

export function normalizeStockQuoteFields<T extends StockLike>(stock: T): T {
  const price = Number(stock.price ?? 0);
  const change = Number(stock.change ?? 0);
  const rawPrev = stock.previousClose ?? stock.previous_close;
  const previousClose =
    rawPrev != null && Number(rawPrev) > 0
      ? Number(rawPrev)
      : price && change
        ? price - change
        : 0;

  let changePercent = stock.changePercent ?? stock.change_percent;
  if (changePercent == null || !Number.isFinite(Number(changePercent))) {
    changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  }

  return {
    ...stock,
    price,
    change,
    previousClose,
    changePercent: Number(changePercent),
  };
}
