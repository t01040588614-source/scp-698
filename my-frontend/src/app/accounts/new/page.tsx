"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { accountsApi, setAccountOwnerId } from "@/services/accountsApi";
import { setPreferredTradeAccountId } from "@/lib/preferredTradeAccount";

function NewAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [broker, setBroker] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");

  const ownerFromQuery = searchParams.get("ownerId");
  useEffect(() => {
    if (ownerFromQuery) setAccountOwnerId(ownerFromQuery);
  }, [ownerFromQuery]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const acc = await accountsApi.create({
        name,
        broker: broker || undefined,
        accountNumber: accountNumber || undefined,
        cashBalance: cash ? Number(cash) : 0,
      });
      setPreferredTradeAccountId(acc.id);
      router.push(`/accounts/${acc.id}`);
    } catch {
      setError("계좌 생성 실패 — DB 연결을 확인하세요.");
    }
  }

  return (
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
        현금 잔고
        <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
      </label>
      {error ? <p className="inv-page-desc">{error}</p> : null}
      <button type="submit" className="btn-primary">
        저장
      </button>
    </form>
  );
}

export default function NewAccountPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "포트폴리오", href: "/portfolio#accounts" },
        { label: "새 계좌" },
      ]}
      title="새 계좌"
      description="새 증권 계좌를 등록합니다."
      sidebar={false}
    >
      <Suspense fallback={<p className="inv-page-desc">로딩…</p>}>
        <NewAccountForm />
      </Suspense>
    </InvestingPageLayout>
  );
}
