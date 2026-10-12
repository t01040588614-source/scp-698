"use client";

import type { TickerItem } from "@/data/mockData";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";

type IndexQuoteCardsProps = {
  items: TickerItem[];
};

export default function IndexQuoteCards({ items }: IndexQuoteCardsProps) {
  if (!items.length) return null;

  return (
    <div className="inv-index-grid" aria-label="주요 지수">
      {items.map((item) => (
        <article key={item.id} className="inv-index-card">
          <div className="inv-index-card-inner">
            <span className="inv-index-name">{item.name}</span>
            <span className="inv-index-price tabular">
              {formatPrice(item.price, item.price > 1000 ? 0 : 2)}
            </span>
            <span className={`inv-index-change tabular ${priceClass(item.change)}`}>
              <span>{formatChange(item.change)}</span>
              <span className="inv-index-change-pct">{formatPercent(item.changeRate)}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
