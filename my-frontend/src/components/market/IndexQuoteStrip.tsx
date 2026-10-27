"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import AppLink from "@/components/common/AppLink";
import type { TickerItem } from "@/data/mockData";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
} from "@/lib/format";
import { getMarketTone } from "@/lib/marketTone";
import { indexMarketsHref } from "@/lib/indexStrip";
import { buildSparklinePoints } from "@/lib/sparklineData";
import Sparkline from "./Sparkline";

type IndexQuoteStripProps = {
  items: TickerItem[];
  streamConnected?: boolean;
};

export default function IndexQuoteStrip({ items, streamConnected }: IndexQuoteStripProps) {
  const pathname = usePathname();
  const priceMap = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item.price])),
    [items]
  );
  const flash = usePriceFlash(priceMap);

  if (!items.length) return null;

  return (
    <div className="inv-index-strip" role="list" aria-label="주요 지수">
      {items.map((item) => {
        const flashDir = flash[item.id];
        const tone = getMarketTone(item.id, item.name);
        const live = item.status === "live" || streamConnected;
        const detailHref = indexMarketsHref(item.id);
        const isSelected =
          pathname === detailHref || pathname.endsWith(`/indices/${encodeURIComponent(item.id)}`);
        const chgClass = priceClass(item.change);
        const spark = buildSparklinePoints(item.id, item.price, item.changeRate);
        const changeDecimals = item.price > 1000 ? 2 : item.price > 10 ? 2 : 4;

        return (
          <AppLink
            key={item.id}
            href={detailHref}
            className={`inv-index-strip-btn inv-index-strip-btn--${tone}${live ? " is-live-stream" : ""}${isSelected ? " is-selected" : ""}`}
            role="listitem"
            aria-current={isSelected ? "page" : undefined}
            title={`${item.name} 차트 · ${formatIndexPrice(item.id, item.price)} ${formatPercent(item.changeRate)}`}
          >
            <span className="inv-index-strip-head">
              <span className="inv-index-strip-name">{item.name}</span>
            </span>
            <span
              className={`inv-index-strip-price tabular${flashDir ? ` is-flash-${flashDir}` : ""}`}
            >
              {formatIndexPrice(item.id, item.price)}
            </span>
            <span className={`inv-index-strip-foot tabular ${chgClass}`}>
              <span className="inv-index-strip-delta">
                <span aria-hidden>{directionSymbol(item.change)} </span>
                {formatChange(item.change, changeDecimals)}
              </span>
              <span className="inv-index-strip-pct">{formatPercent(item.changeRate)}</span>
            </span>
            <span className="inv-index-strip-spark">
              <Sparkline
                points={spark}
                width={132}
                height={32}
                positive={item.changeRate >= 0}
              />
            </span>
          </AppLink>
        );
      })}
    </div>
  );
}
