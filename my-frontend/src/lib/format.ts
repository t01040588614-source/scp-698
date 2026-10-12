export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Investing.com 차트 기간 스트립 — +406.94%, +1.73K%, +11.45K% */
export function formatPerformancePercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = value / 1000;
    const digits = abs >= 10_000 ? 2 : abs >= 1000 ? 2 : 2;
    return `${sign}${k.toFixed(digits)}K%`;
  }
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return date.toLocaleDateString("ko-KR");
}

/** WS·REST 갱신 시세 — delayed 레거시 값은 실시간과 동일하게 표시 */
export function normalizeQuoteStatus(status: string | undefined): "live" | "closed" {
  if (status === "closed") return "closed";
  return "live";
}

export function statusLabel(status: "live" | "delayed" | "closed"): string {
  const normalized = normalizeQuoteStatus(status);
  if (normalized === "closed") return "장 마감";
  return "실시간";
}

export function directionSymbol(change: number): string {
  if (change > 0) return "▲";
  if (change < 0) return "▼";
  return "−";
}

export function priceClass(change: number): string {
  if (change > 0) return "price-up";
  if (change < 0) return "price-down";
  return "price-flat";
}

/** 지수·환율 id별 소수 자릿수 */
/** 당일·누적 거래량 (Investing 스타일 K/M/B) */
export function formatCompactVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  const absV = Math.abs(value);
  if (absV >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (absV >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (absV >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export function formatIndexPrice(indexId: string, price: number): string {
  if (indexId === "usd-krw") return formatPrice(price, 2);
  if (indexId === "kosdaq" || indexId === "kospi") return formatPrice(price, 2);
  if (price >= 10_000) return formatPrice(price, 2);
  return formatPrice(price, 2);
}
