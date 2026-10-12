"use client";

import { useQuery } from "@tanstack/react-query";
import { krStockApi } from "@/services/krStockApi";
import LoadingState from "@/components/common/LoadingState";
import { formatPrice } from "@/lib/format";

type Props = { code: string };

export default function KrQuoteExtras({ code }: Props) {
  const { data: detail, isLoading: dLoading } = useQuery({
    queryKey: ["kr-detail", code],
    queryFn: () => krStockApi.getDetail(code).then((r) => r.data),
  });

  const { data: news, isLoading: nLoading } = useQuery({
    queryKey: ["kr-news", code],
    queryFn: () => krStockApi.getNews(code, 8).then((r) => r.data),
  });

  const { data: consensus } = useQuery({
    queryKey: ["kr-consensus", code],
    queryFn: () => krStockApi.getConsensus(code).then((r) => r.data),
  });

  const fund = detail?.fundamental as Record<string, number | null> | undefined;

  return (
    <div className="inv-quote-extras">
      <section className="inv-widget" id="financials">
        <h3 className="inv-widget-title">재무·수익성</h3>
        {dLoading && <LoadingState rows={2} />}
        {fund && (
          <dl className="inv-quote-stats">
            <div>
              <dt>PER</dt>
              <dd>{fund.per ?? "—"}</dd>
            </div>
            <div>
              <dt>PBR</dt>
              <dd>{fund.pbr ?? "—"}</dd>
            </div>
            <div>
              <dt>ROE</dt>
              <dd>{fund.roe != null ? `${fund.roe}%` : "—"}</dd>
            </div>
            <div>
              <dt>배당수익</dt>
              <dd>{fund.dividendYield != null ? `${fund.dividendYield}%` : "—"}</dd>
            </div>
            <div>
              <dt>업종</dt>
              <dd>{fund.industry ?? "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      {consensus && (
        <section className="inv-widget">
          <h3 className="inv-widget-title">컨센서스</h3>
          <dl className="inv-quote-stats">
            <div>
              <dt>목표가(평균)</dt>
              <dd>{formatPrice(consensus.targetPriceAvg ?? 0, 0)}</dd>
            </div>
            <div>
              <dt>목표가(고/저)</dt>
              <dd>
                {formatPrice(consensus.targetPriceHigh ?? 0, 0)} /{" "}
                {formatPrice(consensus.targetPriceLow ?? 0, 0)}
              </dd>
            </div>
            <div>
              <dt>매수/보유/매도</dt>
              <dd>
                {consensus.buyCount ?? 0}/{consensus.holdCount ?? 0}/{consensus.sellCount ?? 0}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="inv-widget" id="news">
        <h3 className="inv-widget-title">뉴스</h3>
        {nLoading && <LoadingState rows={2} />}
        <ul className="inv-widget-list">
          {(news ?? []).map((n) => (
            <li key={n.id}>
              {n.url ? (
                <a href={n.url} className="inv-widget-row" target="_blank" rel="noreferrer">
                  <span className="inv-widget-name">
                    {"sentiment" in n && n.sentiment ? (
                      <span className="inv-badge inv-news-sentiment">{String(n.sentiment)}</span>
                    ) : null}{" "}
                    {n.title}
                  </span>
                  <span className="text-muted-sm">{n.source}</span>
                </a>
              ) : (
                <span className="inv-widget-row">
                  <span className="inv-widget-name">{n.title}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
