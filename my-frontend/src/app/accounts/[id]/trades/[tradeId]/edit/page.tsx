"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { accountsApi } from "@/services/accountsApi";
import LoadingState from "@/components/common/LoadingState";

export default function EditTradePage() {
  const params = useParams();
  const router = useRouter();
  const accountId = Number(params.id);
  const tradeId = Number(params.tradeId);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [tradeDate, setTradeDate] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fee, setFee] = useState("");
  const [tax, setTax] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    void accountsApi.getTrade(accountId, tradeId).then((t) => {
      setSide(t.side);
      setTradeDate(String(t.tradeDate).slice(0, 10));
      setPrice(String(t.price ?? ""));
      setQuantity(String(t.quantity ?? ""));
      setFee(t.fee != null ? String(t.fee) : "");
      setTax(t.tax != null ? String(t.tax) : "");
      setMemo(t.memo ?? "");
      setLoading(false);
    });
  }, [accountId, tradeId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await accountsApi.updateTrade(accountId, tradeId, {
      side,
      tradeDate,
      price: price ? Number(price) : undefined,
      quantity: quantity ? Number(quantity) : undefined,
      fee: fee ? Number(fee) : null,
      tax: tax ? Number(tax) : null,
      memo: memo || null,
    });
    router.push(`/accounts/${accountId}`);
  }

  async function onDelete() {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await accountsApi.deleteTrade(accountId, tradeId);
    router.push(`/accounts/${accountId}`);
  }

  if (loading) return <LoadingState rows={4} />;

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "포트폴리오", href: "/portfolio#accounts" },
        { label: "매매 수정" },
      ]}
      title="매매 내역 수정"
      description="매매 내역 수정 · 수정 후 포지션이 자동 재계산됩니다."
      sidebar={false}
    >
      <form className="inv-screener-grid" onSubmit={onSubmit}>
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
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          수량
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label>
          수수료
          <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        <label>
          제세공과금
          <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
        </label>
        <label>
          비고
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <div className="inv-screener-actions">
          <button type="submit" className="btn-primary">
            저장
          </button>
          <button type="button" className="inv-btn" onClick={() => void onDelete()}>
            삭제
          </button>
        </div>
      </form>
    </InvestingPageLayout>
  );
}
