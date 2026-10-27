"use client";

import Link from "next/link";
import AppLink from "@/components/common/AppLink";
import { indexMarketsHref } from "@/lib/indexStrip";
import type { MarketIndexQuote } from "@/types/stock";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
} from "@/lib/format";

type TossIndexStripProps = {
  items: MarketIndexQuote[];
};

export default function TossIndexStrip({ items }: TossIndexStripProps) {
  if (!items.length) return null;

  return (
    <section className="toss-index-section" aria-labelledby="toss-index-heading">
      <div className="toss-index-section-head">
        <h2 id="toss-index-heading" className="toss-section-title">
          지수 목록
        </h2>
        <Link href="/calendar" className="toss-index-section-link">
          주요 일정
        </Link>
      </div>
      <div className="toss-index-scroll" role="list">
        {items.map((item, i) => (
          <article key={item.id} className="toss-index-card" role="listitem">
            {i > 0 && <span className="toss-index-divider" aria-hidden />}
            <AppLink href={indexMarketsHref(item.id)} className="toss-index-card-inner">
              <span className="toss-index-name">{item.name}</span>
              <span className="toss-index-price tabular">{formatIndexPrice(item.id, item.price)}</span>
              <span className={`toss-index-chg tabular ${priceClass(item.change)}`}>
                {directionSymbol(item.change)}
                {formatChange(item.change)}({formatPercent(item.changePercent)})
              </span>
            </AppLink>
          </article>
        ))}
      </div>
    </section>
  );
}
