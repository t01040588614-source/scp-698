export type WatchlistEntry = {
  symbol: string;
  market: "korea" | "us";
  name: string;
};

const STORAGE_KEY = "stock-dashboard-local-watchlist";

export function readLocalWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchlistEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalWatchlist(items: WatchlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("local-watchlist-changed"));
}

export function isInLocalWatchlist(symbol: string, market: "korea" | "us"): boolean {
  return readLocalWatchlist().some((i) => i.symbol === symbol && i.market === market);
}

export function toggleLocalWatchlist(entry: WatchlistEntry): boolean {
  const list = readLocalWatchlist();
  const idx = list.findIndex((i) => i.symbol === entry.symbol && i.market === entry.market);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeLocalWatchlist(list);
    return false;
  }
  writeLocalWatchlist([entry, ...list].slice(0, 50));
  return true;
}
