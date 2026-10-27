"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

type InvTableSkeletonProps = {
  tableClass: string;
  headRow: ReactNode;
  rowCount?: number;
  label?: string;
};

function countHeadColumns(headRow: ReactNode): number {
  if (!isValidElement(headRow)) return 10;
  const el = headRow as ReactElement<{ children?: ReactNode }>;
  const cells = Children.toArray(el.props.children);
  return Math.max(cells.length, 6);
}

function cellSkeletonClass(index: number, total: number, className?: string): string {
  const base = "inv-table-sk-cell skeleton";
  if (className?.includes("inv-col-name")) return `${base} inv-table-sk-cell--name`;
  if (className?.includes("inv-col-check") || className?.includes("inv-col-star")) {
    return `${base} inv-table-sk-cell--icon`;
  }
  if (className?.includes("inv-col-rank")) return `${base} inv-table-sk-cell--rank`;
  if (index === total - 1) return `${base} inv-table-sk-cell--wide`;
  return base;
}

function headCellClasses(headRow: ReactNode): (string | undefined)[] {
  if (!isValidElement(headRow)) return [];
  const el = headRow as ReactElement<{ children?: ReactNode }>;
  return Children.toArray(el.props.children).map((child) => {
    if (!isValidElement(child)) return undefined;
    const props = child.props as { className?: string };
    return props.className;
  });
}

export default function InvTableSkeleton({
  tableClass,
  headRow,
  rowCount = 8,
  label = "종목 표 로딩 중",
}: InvTableSkeletonProps) {
  const colCount = countHeadColumns(headRow);
  const headClasses = headCellClasses(headRow);
  const useHeadClasses = headClasses.length === colCount;

  return (
    <div className="inv-table-wrap inv-table-wrap--skeleton" aria-busy="true" aria-label={label}>
      <table className={tableClass}>
        <thead>{headRow}</thead>
        <tbody className="inv-table-sk-body">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <tr key={rowIdx} className="inv-table-sk-row" aria-hidden={rowIdx > 0 ? true : undefined}>
              {Array.from({ length: colCount }).map((__, colIdx) => {
                const thClass = useHeadClasses ? headClasses[colIdx] : undefined;
                const tdClass = thClass?.replace(/\binv-toss-th-\w+/g, "").trim() || undefined;
                return (
                  <td key={colIdx} className={tdClass}>
                    <span className={cellSkeletonClass(colIdx, colCount, thClass)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
