"use client";

import { useMemo } from "react";
import type { TickerItem } from "@/data/mockData";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
  statusLabel,
} from "@/lib/format";
import { getMarketTone } from "@/lib/marketTone";

type IndexQuoteStripProps = {
  items: TickerItem[];
  streamConnected?: boolean;
};

export default function IndexQuoteStrip({ items, streamConnected }: IndexQuoteStripProps) {
  const priceMap = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item.price])),
    [items]
  );
  const flash = usePriceFlash(priceMap);

  if (!items.length) return null;

  return (
    <div className="inv-index-strip" aria-label="주요 지수">
      {items.map((item) => {
        const flashDir = flash[item.id];
        const tone = getMarketTone(item.id, item.name);
        const live = item.status === "live" || streamConnected;
        return (
          <article
            key={item.id}
            className={`inv-index-strip-item inv-index-strip-item--${tone}`}
          >
            <div className="inv-index-strip-top">
              <span className="inv-index-strip-name">{item.name}</span>
              <span className={`inv-index-strip-status${live ? " is-live" : ""}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <span
              className={`inv-index-strip-price tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
            >
              {formatIndexPrice(item.id, item.price)}
            </span>
            <div className={`inv-index-strip-foot tabular ${priceClass(item.change)}`}>
              <span className="inv-index-strip-delta">
                <span aria-hidden>{directionSymbol(item.change)} </span>
                {formatChange(item.change)}
              </span>
              <span className="inv-index-strip-pct">{formatPercent(item.changeRate)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
