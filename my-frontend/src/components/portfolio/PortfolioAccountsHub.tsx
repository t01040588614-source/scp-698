"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { accountsApi, getAccountOwnerId, setAccountOwnerId } from "@/services/accountsApi";
import LoadingState from "@/components/common/LoadingState";

function PortfolioAccountsHubInner() {
  const searchParams = useSearchParams();
  const ownerFromUrl = searchParams.get("ownerId");
  useEffect(() => {
    if (ownerFromUrl) setAccountOwnerId(ownerFromUrl);
  }, [ownerFromUrl]);

  const ownerId = ownerFromUrl || getAccountOwnerId();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["accounts", ownerId],
    queryFn: () => accountsApi.list(),
  });

  return (
    <section id="docx-accounts" className="inv-investing-panel panel inv-portfolio-accounts">
      <div className="inv-portfolio-panel-head flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div>
          <h2 className="text-base font-semibold">증권 계좌 (매매·현금 반영)</h2>
          <p className="text-muted-sm mt-0.5">
            PostgreSQL 계좌 API · ownerId <span className="tabular">{ownerId}</span>
          </p>
        </div>
        <Link
          href={`/accounts/new?ownerId=${encodeURIComponent(ownerId)}`}
          className="btn-primary text-sm px-4 py-2"
        >
          새 계좌
        </Link>
      </div>
      {isLoading && <LoadingState rows={3} />}
      {isError && (
        <p className="inv-page-desc px-5 pb-4">
          계좌 API 오류 — <code>docker compose up -d db</code> 및 DATABASE_URL 확인 후 재시도하세요.
        </p>
      )}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <p className="inv-page-desc px-5 pb-4">등록된 계좌가 없습니다. 새 계좌를 추가하세요.</p>
      )}
      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <ul className="inv-widget-list px-2 pb-3">
          {(data ?? []).map((a) => (
            <li key={a.id}>
              <Link href={`/accounts/${a.id}`} className="inv-widget-row">
                <span className="inv-widget-name">{a.name}</span>
                <span className="tabular text-muted-sm">
                  {a.broker ?? "—"} · 현금 {(a.cashBalance ?? 0).toLocaleString("ko-KR")}원
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PortfolioAccountsHub() {
  return (
    <Suspense fallback={<LoadingState rows={3} />}>
      <PortfolioAccountsHubInner />
    </Suspense>
  );
}
