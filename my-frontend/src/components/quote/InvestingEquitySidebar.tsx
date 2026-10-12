"use client";

import Link from "next/link";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { formatPercent, formatPrice, priceClass } from "@/lib/format";

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
    .slice(0, 7);

  const decimals = market === "korea" ? 0 : 2;
  const qMarket = market;

  return (
    <aside className="inv-equity-sidebar">
      <section className="inv-equity-sidebar-block">
        <h2 className="inv-equity-sidebar-title">트렌딩 주식</h2>
        <table className="inv-equity-sidebar-table">
          <thead>
            <tr>
              <th scope="col">종목명</th>
              <th scope="col">최근</th>
              <th scope="col">변동 %</th>
            </tr>
          </thead>
          <tbody>
            {movers.map((row) => (
              <tr key={row.symbol}>
                <td>
                  <Link href={`/quote/${qMarket}/${row.symbol}`} className="inv-equity-sidebar-link inv-name-link--with-logo">
                    <StockCompanyLogo market={qMarket} symbol={row.symbol} name={row.name} size={20} />
                    <span>{row.name}</span>
                  </Link>
                </td>
                <td className="tabular">{formatPrice(row.price, decimals)}</td>
                <td className={`tabular ${priceClass(row.changePercent)}`}>
                  {formatPercent(row.changePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="inv-equity-sidebar-block">
        <h2 className="inv-equity-sidebar-title">차트 허브</h2>
        <Link href={`/charts?market=${market}&symbol=${symbol}`} className="inv-equity-sidebar-cta">
          {symbol} 전체 차트 보기 →
        </Link>
      </section>
    </aside>
  );
}
