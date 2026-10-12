"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import KrLightweightCandleChart from "@/components/chart/KrLightweightCandleChart";
import KrQuoteExtras from "@/components/quote/KrQuoteExtras";
import LoadingState from "@/components/common/LoadingState";
import { krStockApi } from "@/services/krStockApi";
import { formatChange, formatPercent, formatPrice, priceClass } from "@/lib/format";
import { useLiveStockDisplay } from "@/hooks/useLiveStockDisplay";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import StockCompanyLogo from "@/components/market/StockCompanyLogo";

export default function StockDocxDetail({ code }: { code: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["kr-docx-detail", code],
    queryFn: () => krStockApi.getDetail(code).then((r) => r.data),
  });

  const stock = data?.stock as Record<string, unknown> | undefined;
  const latest = data?.latestQuote as Record<string, number> | undefined;

  const basePrice = Number(stock?.price ?? latest?.close ?? 0);
  const baseChange = Number(stock?.change ?? 0);
  const basePct = Number(stock?.changePercent ?? 0);
  const live = useLiveStockDisplay(code, {
    price: basePrice,
    change: baseChange,
    changePercent: basePct,
    previousClose: basePrice - baseChange,
  });

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "종목", href: "/stocks" },
        { label: String(stock?.name ?? code) },
      ]}
      title={String(stock?.name ?? code)}
      description={`DOCX /stocks/[code] — 시세·Lightweight Charts·재무·뉴스·컨센서스`}
      sidebar={{ market: "korea", showIndicesWidget: true }}
    >
      {isLoading && <LoadingState rows={5} />}
      {isError && <p className="inv-page-desc">종목을 불러오지 못했습니다.</p>}
      {stock && (
        <>
          <div className="inv-quote-hero">
            <div className="inv-stock-name-with-logo inv-quote-hero-brand">
              <StockCompanyLogo market="korea" symbol={code} name={String(stock.name ?? code)} size={40} />
              <div>
                <p className="inv-quote-symbol tabular">{code}</p>
                <p className="stock-name">{String(stock.name ?? code)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={`inv-quote-price tabular ${priceClass(live?.change ?? baseChange)}`}
              >
                {formatPrice(live?.price ?? basePrice, 0)}
              </p>
              <LiveStreamBadge connected={live?.isLive ?? false} />
            </div>
            <p className="inv-quote-chg tabular">
              {formatChange(live?.change ?? baseChange)}{" "}
              <span className={priceClass(live?.changePercent ?? basePct)}>
                {formatPercent(live?.changePercent ?? basePct)}
              </span>
            </p>
          </div>

          <section className="inv-widget inv-widget--stack">
            <header className="inv-widget-head">
              <h3 className="inv-widget-title">일봉 차트 (Lightweight Charts)</h3>
              <Link href={`/stocks/${code}/chart`} className="inv-widget-more">
                전체 차트
              </Link>
            </header>
            <div className="inv-widget-body">
              <KrLightweightCandleChart code={code} height={320} />
            </div>
          </section>

          <KrQuoteExtras code={code} />
        </>
      )}
    </InvestingPageLayout>
  );
}
