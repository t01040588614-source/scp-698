"use client";

/**
 * 1달 차트 — 최근 31일(1일봉×31)을 이어 붙인 뷰.
 * X축: 1일, 2일, 3일 … (하루=당일 일봉 한 칸, LWC 1·3·5… 눈금 대체)
 */

const ORDINAL_MONTH_SLOTS = 31;

type ChartOrdinalMonthAxisProps = {
  centers: number[];
  /** API·padPointsToCalendarDays — "1일" … "31일" */
  dayLabels?: string[];
  slotCount?: number;
};

function labelForSlot(index: number, dayLabels?: string[]): string {
  const fromApi = dayLabels?.[index]?.trim();
  if (fromApi && /^\d+일$/.test(fromApi)) return fromApi;
  return `${index + 1}일`;
}

export default function ChartOrdinalMonthAxis({
  centers,
  dayLabels,
  slotCount = ORDINAL_MONTH_SLOTS,
}: ChartOrdinalMonthAxisProps) {
  const valid = centers.filter((x) => Number.isFinite(x)).length;
  if (valid < 2) return null;

  return (
    <div className="inv-chart-ordinal-month-axis" aria-hidden>
      {Array.from({ length: slotCount }, (_, i) => {
        const left = centers[i];
        if (left == null || !Number.isFinite(left)) return null;
        return (
          <span
            key={i}
            className="inv-chart-ordinal-month-axis__tick"
            style={{ left: `${left}px` }}
          >
            {labelForSlot(i, dayLabels)}
          </span>
        );
      })}
    </div>
  );
}
