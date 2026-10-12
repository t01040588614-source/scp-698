"use client";

import Link from "next/link";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import type { KoreaStock, USStock } from "@/types/stock";
import { directionSymbol, formatPercent, formatPrice, priceClass } from "@/lib/format";

type StockRow = KoreaStock | USStock;

type TopVolumeStocksTableProps = {
  title: string;
  stocks: StockRow[];
  market: "korea" | "us";
  limit?: number;
};

function formatVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function TopVolumeStocksTable({
  title,
  stocks,
  market,
  limit = 15,
}: TopVolumeStocksTableProps) {
  const rows = [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, limit);
  const symbols = rows.map((r) => r.symbol);
  const { quotes, ticks } = useLiveSymbols(symbols);

  if (!rows.length) return null;

  const decimals = market === "korea" ? 0 : 2;
  const quoteBase = market === "korea" ? "korea" : "us";

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
          <tbody>
            {rows.map((row) => {
              const sym = row.symbol;
              const merged = mergeLiveStockQuote(
                {
                  price: row.price,
                  change: row.change,
                  changePercent: row.changePercent,
                  previousClose: row.previousClose,
                  volume: row.volume,
                },
                quotes[sym],
                ticks[sym]
              );
              const time = new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <tr key={sym}>
                  <td className="inv-col-name">
                    <Link href={`/quote/${quoteBase}/${sym}`} className="inv-name-link inv-name-link--with-logo">
                      <StockNameWithLogo market={market} symbol={sym} name={row.name} size={24} />
                    </Link>
                  </td>
                  <td className="tabular">{formatPrice(merged.price, decimals)}</td>
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
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
