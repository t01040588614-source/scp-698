"use client";

import Link from "next/link";
import type { MarketIndexQuote } from "@/types/stock";
import MiniSparkline from "./MiniSparkline";
import {
  directionSymbol,
  formatChange,
  formatIndexPrice,
  formatPercent,
  priceClass,
} from "@/lib/format";
import { countryFlag } from "@/lib/regionalMarkets";

type InvestingStyleHeroCardsProps = {
  items: MarketIndexQuote[];
};

export default function InvestingStyleHeroCards({ items }: InvestingStyleHeroCardsProps) {
  if (!items.length) return null;

  return (
    <div className="inv-hero-index-grid" aria-label="주요 지수 요약">
      {items.map((item) => (
        <article key={item.id} className="inv-hero-index-card">
          <div className="inv-hero-index-head">
            <span className="inv-hero-index-flag" aria-hidden>
              {countryFlag(item.country)}
            </span>
            <Link href={`/markets?index=${item.id}`} className="inv-hero-index-name">
              {item.name}
            </Link>
          </div>
          <div className="inv-hero-index-body">
            <div className="inv-hero-index-quote">
              <span className="inv-hero-index-price tabular">{formatIndexPrice(item.id, item.price)}</span>
              <div className={`inv-hero-index-chg tabular ${priceClass(item.change)}`}>
                <span>
                  {directionSymbol(item.change)} {formatChange(item.change)}
                </span>
                <span className="inv-hero-index-pct">{formatPercent(item.changePercent)}</span>
              </div>
            </div>
            <MiniSparkline changePercent={item.changePercent} />
          </div>
        </article>
      ))}
    </div>
  );
}
