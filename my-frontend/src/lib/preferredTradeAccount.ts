import type { Account } from "@/services/accountsApi";

export const PREFERRED_TRADE_ACCOUNT_KEY = "trade:preferredAccountId";

export function getPreferredTradeAccountId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PREFERRED_TRADE_ACCOUNT_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setPreferredTradeAccountId(accountId: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(accountId) || accountId <= 0) return;
  localStorage.setItem(PREFERRED_TRADE_ACCOUNT_KEY, String(accountId));
}

/** 목록 중 마지막 사용 계좌 우선, 없으면 첫 계좌 */
export function pickTradeAccount(accounts: Account[]): Account | null {
  if (accounts.length === 0) return null;
  const preferredId = getPreferredTradeAccountId();
  if (preferredId != null) {
    const hit = accounts.find((a) => a.id === preferredId);
    if (hit) return hit;
  }
  return accounts[0];
}
