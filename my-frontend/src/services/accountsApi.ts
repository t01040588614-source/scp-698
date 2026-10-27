import axios from "axios";
import { attachAuthSessionResponseInterceptor } from "@/lib/api";

const OWNER_KEY = "kr-account-owner-id";

export function getAccountOwnerId(): string {
  if (typeof window === "undefined") return "user1";
  return localStorage.getItem(OWNER_KEY) || "user1";
}

export function setAccountOwnerId(ownerId: string) {
  localStorage.setItem(OWNER_KEY, ownerId);
}

const api = axios.create({ baseURL: "/api/accounts" });
attachAuthSessionResponseInterceptor(api);

function ownerQs(extra?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams({ ownerId: getAccountOwnerId() });
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
  }
  return `?${params.toString()}`;
}

export type Account = {
  id: number;
  ownerId: string;
  name: string;
  broker?: string | null;
  accountNumber?: string | null;
  currency?: string | null;
  cashBalance?: number | null;
  initialCashBalance?: number | null;
};

export type Position = {
  id: number;
  stock: { code: string; name: string };
  quantity: number | null;
  averageCost: number | null;
  lastValuationAmount: number | null;
  unrealizedPnL: number | null;
  unrealizedPnLRate: number | null;
};

export type Trade = {
  id: number;
  stock: { code: string; name: string };
  side: "BUY" | "SELL";
  tradeDate: string;
  price: number | null;
  quantity: number | null;
  amount: number | null;
  fee: number | null;
  tax: number | null;
  memo: string | null;
};

export type Snapshot = {
  date: string;
  totalAsset: number | null;
};

export const accountsApi = {
  list: () => api.get<Account[]>(ownerQs()).then((r) => r.data),
  create: (body: {
    name: string;
    broker?: string;
    accountNumber?: string;
    currency?: string;
    cashBalance?: number;
  }) => api.post<Account>(ownerQs(), body).then((r) => r.data),
  get: (id: number) => api.get<Account>(`${id}${ownerQs()}`).then((r) => r.data),
  update: (
    id: number,
    body: {
      name?: string;
      broker?: string;
      accountNumber?: string;
      currency?: string;
      initialCashBalance?: number;
    }
  ) => api.patch<Account>(`${id}${ownerQs()}`, body).then((r) => r.data),
  delete: (id: number) => api.delete(`${id}${ownerQs()}`).then((r) => r.data),
  positions: (id: number) => api.get<Position[]>(`${id}/positions${ownerQs()}`).then((r) => r.data),
  trades: (id: number, limit = 50) =>
    api.get<Trade[]>(`${id}/trades${ownerQs({ limit })}`).then((r) => r.data),
  getTrade: (accountId: number, tradeId: number) =>
    api.get<Trade>(`${accountId}/trades/${tradeId}${ownerQs()}`).then((r) => r.data),
  createTrade: (
    accountId: number,
    body: {
      stockCode: string;
      stockName: string;
      side: "BUY" | "SELL";
      tradeDate: string;
      price: number;
      quantity: number;
      fee?: number;
      tax?: number;
      memo?: string;
    }
  ) => api.post(`${accountId}/trades${ownerQs()}`, body).then((r) => r.data),
  updateTrade: (accountId: number, tradeId: number, body: Record<string, unknown>) =>
    api.patch(`${accountId}/trades/${tradeId}${ownerQs()}`, body).then((r) => r.data),
  deleteTrade: (accountId: number, tradeId: number) =>
    api.delete(`${accountId}/trades/${tradeId}${ownerQs()}`).then((r) => r.data),
  snapshots: (accountId: number, from: string, to: string) =>
    api
      .get<Snapshot[]>(`${accountId}/snapshots${ownerQs({ from, to })}`)
      .then((r) => r.data),
};
