import type { LwcCandle, LwcTime } from "@/lib/lwcTime";

export type ChartEventItem = {
  type: string;
  date: string;
  label: string;
  title?: string;
  amount?: number | null;
  future?: boolean;
};

export type LwcSeriesMarker = {
  time: LwcTime;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  text: string;
  size?: number;
};

function timeToMs(t: LwcTime): number {
  if (typeof t === "number") return t * 1000;
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nearestBarTime(candles: LwcCandle[], isoDate: string): LwcTime | null {
  if (!candles.length) return null;
  const target = Date.parse(isoDate.slice(0, 10));
  if (!Number.isFinite(target)) return null;
  let best = candles[0];
  let bestDist = Math.abs(timeToMs(best.time) - target);
  for (const c of candles) {
    const d = Math.abs(timeToMs(c.time) - target);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.time;
}

export function buildChartMarkers(
  candles: LwcCandle[],
  events: ChartEventItem[] | undefined
): LwcSeriesMarker[] {
  if (!events?.length || !candles.length) return [];
  const markers: LwcSeriesMarker[] = [];
  const used = new Set<string>();

  for (const ev of events) {
    const time = nearestBarTime(candles, ev.date);
    if (time == null) continue;
    const key = `${String(time)}-${ev.label}`;
    if (used.has(key)) continue;
    used.add(key);

    const isDiv = ev.type === "dividend" || ev.label === "D";
    markers.push({
      time,
      position: "aboveBar",
      color: isDiv ? "#0074BD" : "#5B616E",
      shape: "square",
      text: ev.label,
      size: 1,
    });
  }
  return markers;
}
