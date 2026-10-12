'use client';

import type { USStock } from '@/types/stock';
import StockCompanyLogo from '@/components/market/StockCompanyLogo';
import { mergeLiveStockQuote } from '@/lib/liveQuoteMerge';
import type { LiveStockTick } from '@/lib/wsNormalize';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  stocks: USStock[];
  isLoading: boolean;
  liveQuotes?: Record<string, number>;
  liveTicks?: Record<string, LiveStockTick>;
}

export default function USStockList({ stocks, isLoading, liveQuotes = {}, liveTicks = {} }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mb-3" />
          <p className="text-muted-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return <div className="text-center py-10 text-muted-sm">데이터가 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="stock-table">
        <thead>
          <tr>
            <th className="text-left">종목명</th>
            <th className="text-right">현재가</th>
            <th className="text-right">등락률</th>
            <th className="text-right hidden sm:table-cell">거래량</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const merged = mergeLiveStockQuote(
              {
                price: stock.price,
                change: stock.change,
                changePercent: stock.changePercent,
                previousClose: stock.previousClose,
                volume: stock.volume,
              },
              liveQuotes[stock.symbol],
              liveTicks[stock.symbol]
            );
            const price = merged.price;
            const isPositive = merged.change >= 0;

            return (
              <tr key={stock.symbol}>
                <td>
                  <div className="stock-name-row">
                    <StockCompanyLogo market="us" symbol={stock.symbol} name={stock.name} size={28} />
                    <div className="stock-name-block">
                      <p className="stock-name">{stock.name}</p>
                      <p className="stock-symbol tabular">
                        {stock.symbol} · {stock.exchange}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-right">
                  <p className="stock-price tabular">${price.toLocaleString()}</p>
                </td>
                <td className="text-right">
                  <span
                    className={`badge-change ${isPositive ? 'badge-change--up' : 'badge-change--down'}`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    )}
                    {isPositive ? '+' : ''}
                    {merged.changePercent.toFixed(2)}%
                  </span>
                </td>
                <td className="text-right hidden sm:table-cell">
                  <p className="stock-symbol tabular">{stock.volume.toLocaleString()}</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
