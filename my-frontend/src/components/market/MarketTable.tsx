"use client";

import type { MarketRow } from "@/data/mockData";
import { usePriceFlash } from "@/hooks/usePriceFlash";
import { mergeLiveStockPrice } from "@/lib/liveQuoteMerge";
import {
  directionSymbol,
  formatChange,
  formatPercent,
  formatPrice,
  priceClass,
} from "@/lib/format";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { inferStockMarket } from "@/lib/inferStockMarket";

interface MarketTableProps {
  rows: MarketRow[];
  liveQuotes?: Record<string, number>;
  investingExact?: boolean;
}

export default function MarketTable({ rows, liveQuotes, investingExact }: MarketTableProps) {
  const priceFlash = usePriceFlash(liveQuotes ?? {});

  if (rows.length === 0) {
    return null;
  }

  const tableClass = investingExact
    ? "inv-table inv-table--investing-exact"
    : "inv-table";

  return (
    <>
      <div className="inv-table-wrap">
        <table className={tableClass}>
          <thead>
            <tr>
              <th scope="col" className="inv-col-name">
                종목
              </th>
              <th scope="col">현재가</th>
              <th scope="col">변동</th>
              <th scope="col">등락률</th>
              <th scope="col" className="inv-hide-sm">
                고가
              </th>
              <th scope="col" className="inv-hide-sm">
                저가
              </th>
              <th scope="col" className="inv-hide-sm">
                거래량
              </th>
              <th scope="col" className="inv-hide-sm">
                시간
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const live = liveQuotes?.[row.symbol];
              const merged = mergeLiveStockPrice(
                row.price,
                row.change,
                row.changeRate,
                row.price - row.change,
                live
              );
              const flashDir = priceFlash[row.symbol];
              const rowClass = flashDir ? `is-flash-${flashDir}` : undefined;
              const cellFlash = flashDir ? `inv-last-flash is-flash-${flashDir}` : "";
              const decimals = merged.price > 1000 ? 0 : 2;
              const rowMarket = inferStockMarket(row.symbol);

              return (
                <tr key={row.id} className={rowClass}>
                  <td className="inv-col-name inv-symbol-cell">
                    <StockNameWithLogo
                      market={rowMarket}
                      symbol={row.symbol}
                      name={row.name}
                      size={22}
                    />
                    <span className="inv-meta">
                      <span className="inv-code tabular">{row.symbol}</span>
                      <span className="inv-badge">{row.market}</span>
                    </span>
                  </td>
                  <td className={`inv-last tabular ${cellFlash}`.trim()}>
                    {formatPrice(merged.price, decimals)}
                  </td>
                  <td className={`inv-chg tabular ${priceClass(merged.change)}`}>
                    {directionSymbol(merged.change)} {formatChange(merged.change)}
                  </td>
                  <td className="inv-pct-cell tabular">
                    <span className={`inv-pct-badge ${priceClass(merged.changePercent)}`}>
                      {formatPercent(merged.changePercent)}
                    </span>
                  </td>
                  <td className="tabular inv-hide-sm">
                    {formatPrice(row.high, row.high > 1000 ? 0 : 2)}
                  </td>
                  <td className="tabular inv-hide-sm">
                    {formatPrice(row.low, row.low > 1000 ? 0 : 2)}
                  </td>
                  <td className="inv-hide-sm">{row.volume}</td>
                  <td className="inv-time inv-hide-sm">{row.updatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="market-card-list market-card-list--mobile-only">
        {rows.map((row) => {
          const live = liveQuotes?.[row.symbol];
          const merged = mergeLiveStockPrice(
            row.price,
            row.change,
            row.changeRate,
            row.price - row.change,
            live
          );
          return (
            <article key={`card-${row.id}`} className="market-card">
              <div className="market-card-main">
                <StockNameWithLogo
                  market={inferStockMarket(row.symbol)}
                  symbol={row.symbol}
                  name={row.name}
                  size={22}
                  nameClassName="market-card-name"
                />
                <span className="market-card-symbol">{row.market}</span>
              </div>
              <div className="market-card-price">
                <strong className="tabular">
                  {formatPrice(merged.price, merged.price > 1000 ? 0 : 2)}
                </strong>
                <span className={priceClass(merged.changePercent)}>
                  {directionSymbol(merged.changePercent)} {formatPercent(merged.changePercent)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
