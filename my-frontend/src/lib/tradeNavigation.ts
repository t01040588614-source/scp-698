import { accountsApi } from "@/services/accountsApi";
import { pickTradeAccount, setPreferredTradeAccountId } from "@/lib/preferredTradeAccount";

export const PENDING_TRADE_STORAGE_KEY = "auth:pendingTrade";

export type PendingTrade = {
  market: "korea" | "us";
  symbol: string;
  name?: string;
  side: "BUY" | "SELL";
  price?: number;
};

export function savePendingTrade(trade: PendingTrade): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_TRADE_STORAGE_KEY, JSON.stringify(trade));
}

export function peekPendingTrade(): PendingTrade | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_TRADE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingTrade;
    if (parsed?.symbol && (parsed.side === "BUY" || parsed.side === "SELL")) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingTrade(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_TRADE_STORAGE_KEY);
}

export function buildNewTradeSearchParams(trade: PendingTrade): string {
  const params = new URLSearchParams();
  params.set("side", trade.side);
  params.set("stockCode", trade.symbol);
  if (trade.name) params.set("stockName", trade.name);
  if (trade.price != null && Number.isFinite(trade.price) && trade.price > 0) {
    params.set("price", String(trade.price));
  }
  return params.toString();
}

export type ResolveTradeHrefResult = {
  href: string;
  /** 계좌 없음 등으로 매매 화면까지 못 갈 때 intent 유지 */
  keepPending: boolean;
};

export type ResolveTradeNavigation =
  | ResolveTradeHrefResult
  | { kind: "pick-account"; accounts: Awaited<ReturnType<typeof accountsApi.list>> };

export async function resolveNewTradeNavigation(
  trade: PendingTrade,
): Promise<ResolveTradeNavigation> {
  try {
    const accounts = await accountsApi.list();
    if (accounts.length === 0) {
      return { href: "/portfolio#accounts", keepPending: true };
    }
    if (accounts.length > 1) {
      return { kind: "pick-account", accounts };
    }
    const account = pickTradeAccount(accounts);
    if (!account) {
      return { href: "/portfolio#accounts", keepPending: true };
    }
    setPreferredTradeAccountId(account.id);
    const qs = buildNewTradeSearchParams(trade);
    return {
      href: `/accounts/${account.id}/trades/new?${qs}`,
      keepPending: false,
    };
  } catch {
    return { href: "/portfolio#accounts", keepPending: true };
  }
}

/** 로그인 직후 자동 이동 — 계좌 2개 이상이면 마지막 사용 계좌로 바로 이동 */
export function isTradeAccountPickerNav(
  nav: ResolveTradeNavigation,
): nav is { kind: "pick-account"; accounts: Awaited<ReturnType<typeof accountsApi.list>> } {
  return "kind" in nav && nav.kind === "pick-account";
}

export async function resolveNewTradePageHref(trade: PendingTrade): Promise<ResolveTradeHrefResult> {
  const nav = await resolveNewTradeNavigation(trade);
  if (isTradeAccountPickerNav(nav)) {
    const account = pickTradeAccount(nav.accounts);
    if (!account) {
      return { href: "/portfolio#accounts", keepPending: true };
    }
    setPreferredTradeAccountId(account.id);
    const qs = buildNewTradeSearchParams(trade);
    return {
      href: `/accounts/${account.id}/trades/new?${qs}`,
      keepPending: false,
    };
  }
  return nav;
}
