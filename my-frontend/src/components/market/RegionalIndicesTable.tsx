"use client";

import { useEffect, useRef } from "react";
import AppLink from "@/components/common/AppLink";
import { indexMarketsHref } from "@/lib/indexStrip";
import type { MarketIndexQuote } from "@/types/stock";
import type { MarketBreadth } from "@/lib/regionalMarkets";
import { countryFlag } from "@/lib/regionalMarkets";
import MarketSummaryBar from "./MarketSummaryBar";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
} from "@/lib/format";

type RegionalIndicesTableProps = {
  title: string;
  rows: MarketIndexQuote[];
  breadth: MarketBreadth;
  highlightIndexId?: string | null;
};

export default function RegionalIndicesTable({
  title,
  rows,
  breadth,
  highlightIndexId,
}: RegionalIndicesTableProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!highlightIndexId || !sectionRef.current) return;
    const row = sectionRef.current.querySelector(`[data-index-id="${highlightIndexId}"]`);
    if (row instanceof HTMLElement) {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightIndexId, rows]);

  if (!rows.length) return null;

  return (
    <section className="inv-hub-table-section" ref={sectionRef}>
      <div className="inv-hub-section-head-row">
        <h3 className="inv-hub-section-title">{title}</h3>
        <div className="inv-hub-breadth-wrap">
          <span className="inv-hub-breadth-label">종목 분포</span>
          <MarketSummaryBar breadth={breadth} className="inv-hub-breadth-bar" />
          <span className="inv-hub-breadth-counts tabular">
            <span className="price-up">상승 {breadth.advance}</span>
            {" · "}
            <span className="price-muted">보합 {breadth.unchanged}</span>
            {" · "}
            <span className="price-down">하락 {breadth.decline}</span>
          </span>
        </div>
      </div>
      <div className="inv-table-wrap">
        <table className="inv-table inv-table--investing-exact inv-hub-indices-table">
          <thead>
            <tr>
              <th scope="col" className="inv-col-name">
                이름
              </th>
              <th scope="col">현재가</th>
              <th scope="col">등락</th>
              <th scope="col">등락률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-index-id={row.id}
                className={highlightIndexId === row.id ? "is-index-highlight" : undefined}
              >
                <td className="inv-col-name">
                  <AppLink href={indexMarketsHref(row.id)} className="inv-name-link">
                    <span className="inv-hub-index-name">
                      <span className="inv-hub-index-flag" aria-hidden>
                        {countryFlag(row.country)}
                      </span>
                      <span className="inv-name">{row.name}</span>
                    </span>
                  </AppLink>
                </td>
                <td className="tabular inv-last">{formatIndexPrice(row.id, row.price)}</td>
                <td className={`tabular inv-chg ${priceClass(row.change)}`}>
                  {directionSymbol(row.change)} {formatChange(row.change)}
                </td>
                <td className={`tabular inv-pct-plain ${priceClass(row.change)}`}>
                  {formatPercent(row.changePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
