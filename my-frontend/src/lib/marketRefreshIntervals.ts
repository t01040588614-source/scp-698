/** WebSocket 연결 시 REST 폴링 간격 — 틱은 WS, 목록·메타는 저주기 동기화 */

export function stocksListRefetchMs(
  wsConnected: boolean,
  referenceData = false,
  regularSession = false
): number {
  if (referenceData) return 3_000;
  if (regularSession) return wsConnected ? 5_000 : 4_000;
  return wsConnected ? 12_000 : 8_000;
}

export function marketIndicesRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return wsConnected ? 45_000 : 15_000;
  return wsConnected ? 90_000 : 20_000;
}

export function boardIndicesRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return wsConnected ? 45_000 : 18_000;
  return wsConnected ? 90_000 : 25_000;
}

export function marketTickerRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return wsConnected ? 30_000 : 5_000;
  return wsConnected ? 120_000 : 6_000;
}

export function cacheStatusRefetchMs(wsConnected: boolean, regularSession = false): number {
  if (regularSession) return wsConnected ? 8_000 : 4_000;
  return wsConnected ? 20_000 : 5_000;
}
