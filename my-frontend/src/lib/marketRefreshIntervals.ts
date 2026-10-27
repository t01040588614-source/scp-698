/** WebSocket 연결 시 REST 폴링 간격 — 틱은 WS, 목록·메타는 저주기 동기화 */

import { scaleRefreshMs } from "@/lib/marketRefreshSettings";

function scaled(ms: number): number {
  return scaleRefreshMs(ms) as number;
}

export function stocksListRefetchMs(
  wsConnected: boolean,
  referenceData = false,
  regularSession = false
): number {
  if (referenceData) return scaled(2_000);
  /* WS 연결 중에는 REST가 최신 틱을 덮어쓰지 않도록 간격을 넉넉히 */
  if (regularSession) return scaled(wsConnected ? 8_000 : 2_000);
  return scaled(wsConnected ? 20_000 : 6_000);
}

export function marketIndicesRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return scaled(wsConnected ? 30_000 : 12_000);
  return scaled(wsConnected ? 90_000 : 20_000);
}

export function boardIndicesRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return scaled(wsConnected ? 30_000 : 14_000);
  return scaled(wsConnected ? 90_000 : 25_000);
}

export function marketTickerRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return scaled(wsConnected ? 20_000 : 4_000);
  return scaled(wsConnected ? 120_000 : 6_000);
}

export function cacheStatusRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return scaled(wsConnected ? 4_000 : 2_500);
  return scaled(wsConnected ? 20_000 : 5_000);
}
