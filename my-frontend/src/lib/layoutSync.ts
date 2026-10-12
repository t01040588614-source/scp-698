/** 사이드 고정·레이아웃 변경 후 차트(lightweight-charts) 너비 재계산 */
export const LAYOUT_SYNC_EVENT = "marketlens:layout-sync";

export function dispatchLayoutSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LAYOUT_SYNC_EVENT));
}
