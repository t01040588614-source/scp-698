import type { SortDir, SortKey } from "@/lib/equityQuotes";

const STORAGE_KEY = "marketlens-hub-equities-sort-v1";

export type HubEquitiesMarket = "korea" | "us" | "asia" | "europe";

export type HubEquitiesSortPrefs = {
  sortKey: SortKey;
  sortDir: SortDir;
};

type Stored = Partial<Record<HubEquitiesMarket, HubEquitiesSortPrefs>>;

const SORT_KEYS: SortKey[] = [
  "name",
  "price",
  "changePercent",
  "volume",
  "turnover",
  "marketCap",
];

function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && SORT_KEYS.includes(v as SortKey);
}

function isSortDir(v: unknown): v is SortDir {
  return v === "asc" || v === "desc";
}

function readAll(): Stored {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readHubEquitiesSortPrefs(market: HubEquitiesMarket): HubEquitiesSortPrefs | null {
  const row = readAll()[market];
  if (!row || !isSortKey(row.sortKey) || !isSortDir(row.sortDir)) return null;
  return { sortKey: row.sortKey, sortDir: row.sortDir };
}

export function writeHubEquitiesSortPrefs(
  market: HubEquitiesMarket,
  prefs: HubEquitiesSortPrefs
): void {
  if (typeof window === "undefined") return;
  if (!isSortKey(prefs.sortKey) || !isSortDir(prefs.sortDir)) return;
  const next = { ...readAll(), [market]: prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
