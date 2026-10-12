"use client";

import { useMemo } from "react";
import type { IntlStock } from "@/types/stock";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import type { LiveStockTick } from "@/lib/wsNormalize";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { directionSymbol, formatPercent, formatPrice, priceClass } from "@/lib/format";
import { useSmoothReorder } from "@/hooks/useSmoothReorder";

type IntlStocksTableProps = {
  title: string;
  stocks: IntlStock[];
  liveQuotes?: Record<string, number>;
  liveTicks?: Record<string, LiveStockTick>;
};

function formatVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function priceDecimals(currency: string): number {
  if (currency === "JPY" || currency === "KRW") return 0;
  return 2;
}

function IntlStockRow({
  row,
  livePrice,
  tick,
}: {
  row: IntlStock;
  livePrice?: number;
  tick?: LiveStockTick;
}) {
  const merged = mergeLiveStockQuote(
    {
      price: row.price,
      change: row.change,
      changePercent: row.changePercent,
      previousClose: row.previousClose,
      volume: row.volume,
    },
    livePrice,
    tick
  );
  const decimals = priceDecimals(row.currency);
  const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <tr>
      <td className="inv-col-name">
        <span className="inv-name-link inv-name-link--with-logo">
          <StockNameWithLogo market="us" symbol={row.symbol} name={row.name} size={24}>
            <span className="inv-intl-stock-label">
              <span className="inv-intl-stock-exchange">{row.exchange}</span>
              <span className="inv-name">{row.name}</span>
              <span className="inv-intl-stock-sym">{row.symbol}</span>
            </span>
          </StockNameWithLogo>
        </span>
      </td>
      <td className={`tabular ${priceClass(merged.change)}`}>{formatPrice(merged.price, decimals)}</td>
      <td className="tabular inv-hide-sm">{formatPrice(row.high, decimals)}</td>
      <td className="tabular inv-hide-sm">{formatPrice(row.low, decimals)}</td>
      <td className={`tabular ${priceClass(merged.change)}`}>
        {directionSymbol(merged.change)} {formatPercent(merged.changePercent)}
      </td>
      <td className="tabular">{formatVol(merged.volume)}</td>
      <td className="tabular inv-hide-sm inv-hub-time">
        <span className="inv-hub-clock" aria-hidden />
        {time}
      </td>
    </tr>
  );
}

export default function IntlStocksTable({
  title,
  stocks,
  liveQuotes = {},
  liveTicks = {},
}: IntlStocksTableProps) {
  const [rankTbodyRef] = useSmoothReorder();
  const rows = useMemo(() => {
    const merged = stocks.map((row) => {
      const live = mergeLiveStockQuote(
        {
          price: row.price,
          change: row.change,
          changePercent: row.changePercent,
          previousClose: row.previousClose,
          volume: row.volume,
        },
        liveQuotes[row.symbol],
        liveTicks[row.symbol]
      );
      return { row, changePercent: live.changePercent, volume: live.volume };
    });
    return merged
      .sort(
        (a, b) =>
          b.changePercent - a.changePercent || b.volume - a.volume
      )
      .map((item) => item.row);
  }, [stocks, liveQuotes, liveTicks]);

  if (!rows.length) return null;

  return (
    <section className="inv-hub-table-section">
      <h3 className="inv-hub-section-title">{title}</h3>
      <div className="inv-table-wrap">
        <table className="inv-table inv-table--investing-exact inv-hub-stocks-table">
          <thead>
            <tr>
              <th scope="col" className="inv-col-name">
                이름
              </th>
              <th scope="col">최근</th>
              <th scope="col">고가</th>
              <th scope="col">저가</th>
              <th scope="col">등락%</th>
              <th scope="col">거래량</th>
              <th scope="col" className="inv-hide-sm">
                시간
              </th>
            </tr>
          </thead>
          <tbody ref={rankTbodyRef} className="inv-smooth-rank">
            {rows.map((row) => (
              <IntlStockRow
                key={row.symbol}
                row={row}
                livePrice={liveQuotes[row.symbol]}
                tick={liveTicks[row.symbol]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
