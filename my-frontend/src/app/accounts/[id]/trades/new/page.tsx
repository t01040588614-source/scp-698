"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import LoadingState from "@/components/common/LoadingState";
import { accountsApi } from "@/services/accountsApi";
import RememberPreferredTradeAccount from "@/components/accounts/RememberPreferredTradeAccount";

function NewTradeForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = Number(params.id);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [stockCode, setStockCode] = useState("005930");
  const [stockName, setStockName] = useState("삼성전자");
  const [tradeDate, setTradeDate] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTradeDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const sideParam = searchParams.get("side");
    if (sideParam === "BUY" || sideParam === "SELL") setSide(sideParam);
    const code = searchParams.get("stockCode");
    if (code) setStockCode(code);
    const name = searchParams.get("stockName");
    if (name) setStockName(name);
    const priceParam = searchParams.get("price");
    if (priceParam) setPrice(priceParam);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await accountsApi.createTrade(accountId, {
        stockCode,
        stockName,
        side,
        tradeDate,
        price: Number(price),
        quantity: Number(quantity),
        memo: memo || undefined,
      });
      router.push(`/accounts/${accountId}`);
    } catch {
      setError("매매 등록 실패");
    }
  }

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "포트폴리오", href: "/portfolio#accounts" },
        { label: "매매 추가" },
      ]}
      title="매매 내역 추가"
      description=""
      sidebar={false}
    >
      <RememberPreferredTradeAccount accountId={accountId} />
      <form className="inv-screener-grid" onSubmit={onSubmit}>
        <label>
          종목코드
          <input value={stockCode} onChange={(e) => setStockCode(e.target.value)} required />
        </label>
        <label>
          종목명
          <input value={stockName} onChange={(e) => setStockName(e.target.value)} required />
        </label>
        <label>
          구분
          <select value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}>
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>
        </label>
        <label>
          체결일
          <input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} required />
        </label>
        <label>
          단가
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label>
          수량
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label>
          비고
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        {error ? <p className="inv-page-desc">{error}</p> : null}
        <button type="submit" className="btn-primary">
          저장
        </button>
      </form>
    </InvestingPageLayout>
  );
}

export default function NewTradePage() {
  return (
    <Suspense fallback={<LoadingState rows={4} />}>
      <NewTradeForm />
    </Suspense>
  );
}
