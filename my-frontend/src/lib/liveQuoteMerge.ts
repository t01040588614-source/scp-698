import type { PortfolioItem } from "@/types/stock";
import type { LiveStockTick } from "@/lib/wsNormalize";

/** REST 시세에 WebSocket 현재가를 반영 */
export function mergeLiveStockPrice(
  price: number,
  change: number,
  changePercent: number,
  previousClose: number,
  livePrice?: number
): { price: number; change: number; changePercent: number } {
  if (livePrice === undefined || !Number.isFinite(livePrice)) {
    return { price, change, changePercent };
  }
  const base = previousClose > 0 ? previousClose : price - change;
  const nextChange = livePrice - base;
  const nextPct = base > 0 ? (nextChange / base) * 100 : changePercent;
  return { price: livePrice, change: nextChange, changePercent: nextPct };
}

function resolvePreviousClose(base: {
  price: number;
  change: number;
  previousClose?: number;
}): number {
  if (base.previousClose != null && base.previousClose > 0) return base.previousClose;
  if (base.price > 0) return base.price - base.change;
  return 0;
}

/** REST + WS tick — 당일 누적 거래량은 더 큰 값(최신 누적) 사용 */
export function mergeLiveStockQuote(
  base: {
    price: number;
    change: number;
    changePercent: number;
    previousClose?: number;
    volume?: number;
  },
  livePrice?: number,
  tick?: LiveStockTick
): { price: number; change: number; changePercent: number; volume: number } {
  const prevClose = resolvePreviousClose(base);
  const tickPrev =
    tick && tick.price > 0 && Number.isFinite(tick.change) ? tick.price - tick.change : 0;
  const anchorClose = prevClose > 0 ? prevClose : tickPrev > 0 ? tickPrev : 0;

  const hasLiveQuote =
    livePrice !== undefined && Number.isFinite(livePrice) && livePrice > 0;
  const effectivePrice = hasLiveQuote
    ? livePrice
    : tick && tick.price > 0
      ? tick.price
      : base.price;

  const restVol = Number(base.volume ?? 0);
  const tickVol = tick?.volume != null ? Number(tick.volume) : 0;
  const volume = Math.max(restVol, tickVol, 0);

  if (
    !hasLiveQuote &&
    tick &&
    tick.price > 0 &&
    Number.isFinite(tick.changePercent)
  ) {
    return {
      price: tick.price,
      change: tick.change,
      changePercent: tick.changePercent,
      volume,
    };
  }

  const pricePart = mergeLiveStockPrice(
    base.price,
    base.change,
    base.changePercent,
    anchorClose,
    effectivePrice
  );
  return { ...pricePart, volume };
}

/** WS quotes(가격만) 수신 시 tick 등락 필드 동기화 */
export function patchTickFromLivePrice(
  tick: LiveStockTick | undefined,
  price: number
): LiveStockTick | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  const prevClose =
    tick && tick.price > 0 && Number.isFinite(tick.change)
      ? tick.price - tick.change
      : 0;
  if (prevClose <= 0) return null;
  const change = price - prevClose;
  const changePercent = (change / prevClose) * 100;
  return {
    symbol: tick?.symbol ?? "",
    price,
    change,
    changePercent,
    volume: tick?.volume ?? 0,
  };
}

export function applyLiveToPortfolio(item: PortfolioItem, livePrice?: number): PortfolioItem {
  const price =
    livePrice !== undefined && Number.isFinite(livePrice)
      ? livePrice
      : item.currentPrice > 0
        ? item.currentPrice
        : item.averagePrice;
  const cost = item.averagePrice * item.quantity;
  const totalValue = price * item.quantity;
  const profitLoss = totalValue - cost;
  const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;
  return {
    ...item,
    currentPrice: price,
    totalValue,
    profitLoss,
    profitLossPercent,
  };
}
