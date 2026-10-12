"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import LoadingState from "@/components/common/LoadingState";
import { useLiveSymbols } from "@/hooks/useLiveSymbols";
import { mergeLiveStockQuote } from "@/lib/liveQuoteMerge";
import TossEquityHeader from "@/components/quote/TossEquityHeader";
import TossKrRealtimeChart from "@/components/chart/TossKrRealtimeChart";
type Props = {
  symbol: string;
};

export default function TossQuotePageContent({ symbol }: Props) {
  const { quotes, ticks, flash, isConnected } = useLiveSymbols([symbol]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quote", "korea", symbol],
    queryFn: async () => {
      const res = await stockApi.getKoreaStockDetail(symbol);
      return res.data;
    },
    refetchInterval: isConnected ? 1_500 : 8_000,
    staleTime: 0,
  });

  const quoteView = useMemo(() => {
    if (!data) return null;
    const merged = mergeLiveStockQuote(
      {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        previousClose: data.previousClose,
        volume: data.volume,
      },
      quotes[symbol],
      ticks[symbol]
    );
    return { ...data, ...merged };
  }, [data, quotes, ticks, symbol]);

  return (
    <div className="toss-quote-page">
      {isLoading && <LoadingState rows={4} />}
      {isError && (
        <p className="toss-quote-error">종목을 불러오지 못했습니다. 심볼을 확인해주세요.</p>
      )}
      {quoteView && (
        <>
          <TossEquityHeader
            symbol={symbol}
            name={quoteView.name}
            price={quoteView.price}
            change={quoteView.change}
            changePercent={quoteView.changePercent}
            exchangeLabel={"market" in quoteView ? String(quoteView.market) : "KOSPI"}
            isLive={isConnected}
            priceFlash={flash[symbol]}
          />
          <TossKrRealtimeChart code={symbol} name={quoteView.name} />
        </>
      )}
    </div>
  );
}
