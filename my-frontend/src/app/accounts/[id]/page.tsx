"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import AccountAssetChartLightweight from "@/components/accounts/AccountAssetChartLightweight";
import { accountsApi } from "@/services/accountsApi";
import LoadingState from "@/components/common/LoadingState";
import { formatPrice, priceClass } from "@/lib/format";
import StockNameWithLogo from "@/components/market/StockNameWithLogo";

export default function AccountDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: account, isLoading: aLoad } = useQuery({
    queryKey: ["account", id],
    queryFn: () => accountsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const { data: positions, isLoading: pLoad } = useQuery({
    queryKey: ["account-positions", id],
    queryFn: () => accountsApi.positions(id),
    enabled: Number.isFinite(id),
  });

  const { data: trades, isLoading: tLoad } = useQuery({
    queryKey: ["account-trades", id],
    queryFn: () => accountsApi.trades(id, 50),
    enabled: Number.isFinite(id),
  });

  if (aLoad || pLoad) return <LoadingState rows={6} />;

  if (!account) {
    return (
      <InvestingPageLayout
        breadcrumbs={[{ label: "포트폴리오", href: "/portfolio#docx-accounts" }]}
        title="계좌"
        description=""
      >
        <p className="inv-page-desc">계좌를 찾을 수 없습니다.</p>
      </InvestingPageLayout>
    );
  }

  const totalValuation = (positions ?? []).reduce(
    (s, p) => s + (p.lastValuationAmount ?? 0),
    0
  );
  const totalPnL = (positions ?? []).reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
  const totalAsset = (account.cashBalance ?? 0) + totalValuation;

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "포트폴리오", href: "/portfolio#docx-accounts" },
        { label: account.name },
      ]}
      title={account.name}
      description={`${account.broker ?? "—"} · ${account.accountNumber ?? "-"} · ${account.currency ?? "KRW"}`}
    >
      <p className="inv-page-desc tabular">
        현금 {formatPrice(account.cashBalance ?? 0, 0)} · 평가 {formatPrice(totalValuation, 0)} · 총자산{" "}
        {formatPrice(totalAsset, 0)} · 평가손익{" "}
        <span className={priceClass(totalPnL)}>{formatPrice(totalPnL, 0)}</span>
      </p>

      <section className="inv-widget inv-widget--stack">
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">자산 추이 (90일)</h3>
        </header>
        <div className="inv-widget-body">
          <AccountAssetChartLightweight accountId={id} />
        </div>
      </section>

      <div className="inv-accounts-toolbar">
        <Link href={`/accounts/${id}/trades/new`} className="btn-primary">
          매매 내역 추가
        </Link>
        <Link href={`/accounts/${id}/edit`} className="btn-secondary">
          계좌 수정
        </Link>
      </div>

      <section className="inv-widget">
        <h3 className="inv-widget-title">보유 종목</h3>
        {(positions ?? []).length === 0 ? (
          <p className="inv-page-desc">보유 종목이 없습니다.</p>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>종목</th>
                  <th className="text-right">수량</th>
                  <th className="text-right">평균단가</th>
                  <th className="text-right">평가금액</th>
                  <th className="text-right">평가손익</th>
                  <th className="text-right">수익률</th>
                </tr>
              </thead>
              <tbody>
                {(positions ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/quote/korea/${p.stock.code}`} className="inv-name-link inv-name-link--with-logo">
                        <StockNameWithLogo
                          market="korea"
                          symbol={p.stock.code}
                          name={p.stock.name}
                          size={22}
                          nameClassName="inv-name"
                        >
                          <span className="inv-name">
                            {p.stock.name} ({p.stock.code})
                          </span>
                        </StockNameWithLogo>
                      </Link>
                    </td>
                    <td className="tabular text-right">{(p.quantity ?? 0).toLocaleString()}</td>
                    <td className="tabular text-right">{formatPrice(p.averageCost ?? 0, 0)}</td>
                    <td className="tabular text-right">{formatPrice(p.lastValuationAmount ?? 0, 0)}</td>
                    <td className={`tabular text-right ${priceClass(p.unrealizedPnL ?? 0)}`}>
                      {formatPrice(p.unrealizedPnL ?? 0, 0)}
                    </td>
                    <td className={`tabular text-right ${priceClass(p.unrealizedPnLRate ?? 0)}`}>
                      {(p.unrealizedPnLRate ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inv-widget">
        <h3 className="inv-widget-title">매매 내역</h3>
        {tLoad && <LoadingState rows={3} />}
        {(trades ?? []).length === 0 ? (
          <p className="inv-page-desc">매매 내역이 없습니다.</p>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th className="text-right">단가</th>
                  <th className="text-right">수량</th>
                  <th className="text-right">금액</th>
                  <th>비고</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(trades ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="tabular">{String(t.tradeDate).slice(0, 10)}</td>
                    <td>
                      <Link href={`/quote/korea/${t.stock.code}`} className="inv-name-link inv-name-link--with-logo">
                        <StockNameWithLogo
                          market="korea"
                          symbol={t.stock.code}
                          name={t.stock.name}
                          size={22}
                        />
                      </Link>
                    </td>
                    <td>{t.side === "BUY" ? "매수" : "매도"}</td>
                    <td className="tabular text-right">{formatPrice(t.price ?? 0, 0)}</td>
                    <td className="tabular text-right">{(t.quantity ?? 0).toLocaleString()}</td>
                    <td className="tabular text-right">{formatPrice(t.amount ?? 0, 0)}</td>
                    <td>{t.memo ?? "—"}</td>
                    <td>
                      <Link href={`/accounts/${id}/trades/${t.id}/edit`} className="inv-widget-more">
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </InvestingPageLayout>
  );
}
