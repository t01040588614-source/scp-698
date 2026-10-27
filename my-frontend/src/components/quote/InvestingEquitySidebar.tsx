"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";

type Props = {
  symbol: string;
  market: "korea" | "us";
};

export default function InvestingEquitySidebar({ symbol, market }: Props) {
  const { data: korea } = useQuery({
    queryKey: ["sidebarKoreaStocks"],
    queryFn: () => stockApi.getKoreaStocks().then((r) => r.data),
    enabled: market === "korea",
    staleTime: 30_000,
  });

  const { data: us } = useQuery({
    queryKey: ["sidebarUsStocks"],
    queryFn: () => stockApi.getUSStocks().then((r) => r.data),
    enabled: market === "us",
    staleTime: 30_000,
  });

  const list = market === "korea" ? korea : us;
  const movers = [...(list ?? [])]
    .filter((s) => s.symbol !== symbol)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  const decimals = market === "korea" ? 0 : 2;

  return (
    <>
      <section className="inv-widget">
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">지금 움직이는 종목</h3>
          <Link href={market === "korea" ? "/korea" : "/us"} className="inv-widget-more">
            더보기
          </Link>
        </header>
        {movers.length === 0 ? (
          <p className="inv-widget-empty">목록을 불러오는 중…</p>
        ) : (
          <ul className="inv-widget-list">
            {movers.map((row) => (
              <li key={row.symbol}>
                <Link href={`/quote/${market}/${row.symbol}`} className="inv-widget-row">
                  <StockNameWithLogo
                    market={market}
                    symbol={row.symbol}
                    name={row.name}
                    size={20}
                    className="inv-widget-name inv-widget-name--with-logo"
                    nameClassName="inv-widget-name-text"
                  />
                  <span className="inv-widget-right">
                    <span className="tabular">{formatPrice(row.price, decimals)}</span>
                    <span className={`tabular ${priceClass(row.changePercent)}`}>
                      {formatPercent(row.changePercent)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
