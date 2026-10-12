/** 테이블·랭킹 미니 차트 — 좌우 여백 없이 viewBox 전체 사용 */

export function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  paddingY = 1,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerH = Math.max(1, height - paddingY * 2);
  const step = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * step;
      const y = paddingY + innerH - ((v - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
