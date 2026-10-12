import type { LwcCandle } from "@/lib/lwcTime";

export type DrawToolId =
  | "crosshair"
  | "hline"
  | "channel"
  | "text"
  | "brush"
  | "fit"
  | "measure"
  | "magnet"
  | "visibility"
  | "erase";

export const DRAW_TOOL_DEFS: { id: DrawToolId; icon: string; title: string }[] = [
  { id: "crosshair", icon: "✛", title: "십자선 (기본)" },
  { id: "hline", icon: "／", title: "수평선 — 차트를 클릭" },
  { id: "channel", icon: "⌇", title: "평행 채널 — 클릭 위치 ±2%" },
  { id: "text", icon: "T", title: "가격 읽기 — 클릭" },
  { id: "brush", icon: "🖌", title: "영역 차트" },
  { id: "fit", icon: "⬚", title: "화면에 맞춤" },
  { id: "measure", icon: "📐", title: "구간 수익률 — 시작·끝 클릭" },
  { id: "magnet", icon: "🧲", title: "봉에 맞춤 (자석)" },
  { id: "visibility", icon: "👁", title: "그리기 선 표시/숨김" },
  { id: "erase", icon: "🗑", title: "그리기 모두 지우기" },
];

export type PriceScaleModeId = "normal" | "percent" | "log";

export function computeSma20(candles: LwcCandle[]): { time: LwcCandle["time"]; value: number }[] {
  const period = 20;
  const out: { time: LwcCandle["time"]; value: number }[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (i + 1 < period) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j += 1) sum += candles[j].close;
    out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function downloadCanvasPng(container: HTMLElement, filename: string) {
  const canvas = container.querySelector("canvas");
  if (!canvas) return false;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
  return true;
}
