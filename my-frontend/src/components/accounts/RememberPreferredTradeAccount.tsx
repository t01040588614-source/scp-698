"use client";

import { useEffect } from "react";
import { setPreferredTradeAccountId } from "@/lib/preferredTradeAccount";

/** 계좌 상세·매매 화면 방문 시 마지막 사용 계좌로 기억 */
export default function RememberPreferredTradeAccount({ accountId }: { accountId: number }) {
  useEffect(() => {
    if (Number.isFinite(accountId) && accountId > 0) {
      setPreferredTradeAccountId(accountId);
    }
  }, [accountId]);

  return null;
}
