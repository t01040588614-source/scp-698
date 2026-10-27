"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { accountsApi } from "@/services/accountsApi";
import LoadingState from "@/components/common/LoadingState";

export default function EditAccountPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", id],
    queryFn: () => accountsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const [name, setName] = useState("");
  const [broker, setBroker] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [initialCash, setInitialCash] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!account) return;
    setName(account.name);
    setBroker(account.broker ?? "");
    setAccountNumber(account.accountNumber ?? "");
    const initial =
      account.initialCashBalance ?? account.cashBalance ?? 0;
    setInitialCash(String(initial));
  }, [account]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await accountsApi.update(id, {
        name,
        broker: broker || undefined,
        accountNumber: accountNumber || undefined,
        initialCashBalance: initialCash ? Number(initialCash) : 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["account", id] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      router.push(`/accounts/${id}`);
    } catch {
      setError("저장 실패 — 입력값과 DB 연결을 확인하세요.");
    }
  }

  async function onDelete() {
    if (!confirm("계좌와 매매·보유 내역을 모두 삭제합니다. 계속할까요?")) return;
    setDeleting(true);
    try {
      await accountsApi.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      router.push("/portfolio#accounts");
    } catch {
      setError("삭제 실패");
      setDeleting(false);
    }
  }

  if (isLoading) return <LoadingState rows={4} />;
  if (!account) {
    return (
      <InvestingPageLayout
        breadcrumbs={[{ label: "포트폴리오", href: "/portfolio#accounts" }]}
        title="계좌 수정"
        description=""
        sidebar={false}
      >
        <p className="inv-page-desc">계좌를 찾을 수 없습니다.</p>
      </InvestingPageLayout>
    );
  }

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "포트폴리오", href: "/portfolio#accounts" },
        { label: account.name, href: `/accounts/${id}` },
        { label: "수정" },
      ]}
      title="계좌 수정"
      description="초기 현금을 바꾸면 매매 내역 기준으로 현금 잔고가 다시 계산됩니다."
      sidebar={false}
    >
      <form className="inv-screener-grid" onSubmit={onSubmit}>
        <label>
          계좌명
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          증권사
          <input value={broker} onChange={(e) => setBroker(e.target.value)} />
        </label>
        <label>
          계좌번호
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </label>
        <label>
          초기 현금 (매매 반영 기준)
          <input type="number" value={initialCash} onChange={(e) => setInitialCash(e.target.value)} />
        </label>
        {error ? <p className="inv-page-desc">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary">
            저장
          </button>
          <Link href={`/accounts/${id}`} className="btn-secondary">
            취소
          </Link>
          <button type="button" className="btn-secondary price-up" disabled={deleting} onClick={onDelete}>
            계좌 삭제
          </button>
        </div>
      </form>
    </InvestingPageLayout>
  );
}
