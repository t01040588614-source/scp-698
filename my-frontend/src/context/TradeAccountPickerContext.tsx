"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/common/Modal";
import type { Account } from "@/services/accountsApi";
import {
  buildNewTradeSearchParams,
  clearPendingTrade,
  type PendingTrade,
} from "@/lib/tradeNavigation";
import { setPreferredTradeAccountId } from "@/lib/preferredTradeAccount";

type PickerRequest = {
  trade: PendingTrade;
  accounts: Account[];
};

type TradeAccountPickerContextValue = {
  openTradeAccountPicker: (request: PickerRequest) => void;
};

const TradeAccountPickerContext = createContext<TradeAccountPickerContextValue | undefined>(
  undefined,
);

export function TradeAccountPickerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [request, setRequest] = useState<PickerRequest | null>(null);

  const close = useCallback(() => setRequest(null), []);

  const openTradeAccountPicker = useCallback((next: PickerRequest) => {
    setRequest(next);
  }, []);

  const chooseAccount = useCallback(
    (accountId: number) => {
      if (!request) return;
      setPreferredTradeAccountId(accountId);
      clearPendingTrade();
      const qs = buildNewTradeSearchParams(request.trade);
      close();
      router.push(`/accounts/${accountId}/trades/new?${qs}`);
    },
    [close, request, router],
  );

  const value = useMemo(
    () => ({ openTradeAccountPicker }),
    [openTradeAccountPicker],
  );

  return (
    <TradeAccountPickerContext.Provider value={value}>
      {children}
      {request && (
        <Modal open title="매매할 계좌 선택" onClose={close}>
          <p className="text-muted-sm mb-4">
            증권 계좌가 여러 개입니다. 매수·매도 기록을 남길 계좌를 선택하세요.
          </p>
          <ul className="inv-widget-list mb-4">
            {request.accounts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="inv-widget-row w-full text-left"
                  onClick={() => chooseAccount(a.id)}
                >
                  <span className="inv-widget-name">{a.name}</span>
                  <span className="tabular text-muted-sm">
                    {a.broker ?? "—"} · 현금 {(a.cashBalance ?? 0).toLocaleString("ko-KR")}원
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button type="button" className="segment-btn" onClick={close}>
              취소
            </button>
          </div>
        </Modal>
      )}
    </TradeAccountPickerContext.Provider>
  );
}

export function useTradeAccountPicker() {
  const ctx = useContext(TradeAccountPickerContext);
  if (!ctx) {
    throw new Error("useTradeAccountPicker must be used within TradeAccountPickerProvider");
  }
  return ctx;
}
