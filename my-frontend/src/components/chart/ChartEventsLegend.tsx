"use client";

type Props = {
  items?: { key: string; label: string }[];
};

export default function ChartEventsLegend({ items }: Props) {
  const rows = items?.length
    ? items
    : [
        { key: "D", label: "배당" },
        { key: "E", label: "실적" },
      ];

  return (
    <div className="inv-chart-events-legend" aria-label="차트 이벤트 범례">
      {rows.map((row) => (
        <span key={row.key} className="inv-chart-events-legend-item">
          <span
            className={`inv-chart-events-badge${row.key === "E" ? " inv-chart-events-badge--e" : ""}`}
          >
            {row.key}
          </span>
          {row.label}
        </span>
      ))}
    </div>
  );
}
