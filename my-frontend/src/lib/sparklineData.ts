/** 종목별 미니 차트용 시드 (API 스파크라인 대체) */
export function buildSparklinePoints(symbol: string, lastPrice: number, changePercent: number): number[] {
  const len = 20;
  const end = lastPrice;
  const start = end / (1 + changePercent / 100);
  const points: number[] = [];
  let seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < len; i += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const t = i / (len - 1);
    const base = start + (end - start) * t;
    const noise = ((seed / 233280) - 0.5) * end * 0.004;
    points.push(Math.round((base + noise) * 100) / 100);
  }
  points[len - 1] = end;
  return points;
}
