import {
  readLocalWatchlist,
  writeLocalWatchlist,
  type WatchlistEntry,
} from "@/lib/localWatchlist";
import { userDataApi } from "@/lib/userDataApi";

function hasAuthToken(): boolean {
  return typeof window !== "undefined" && Boolean(localStorage.getItem("token"));
}

export function readWatchlist(): WatchlistEntry[] {
  return readLocalWatchlist();
}

export async function fetchServerWatchlist(): Promise<WatchlistEntry[]> {
  const rows = await userDataApi.getWatchlist();
  return rows.map((r) => ({
    symbol: r.symbol,
    market: r.market as "korea" | "us",
    name: r.name,
  }));
}

/** 로그인: 서버 우선 로드 후 로컬 미러. 비로그인: 로컬만. */
export async function loadWatchlistForUi(): Promise<WatchlistEntry[]> {
  if (!hasAuthToken()) return readLocalWatchlist();
  try {
    const server = await fetchServerWatchlist();
    writeLocalWatchlist(server, { pushToServer: false });
    return server;
  } catch {
    return readLocalWatchlist();
  }
}

export function isInWatchlist(symbol: string, market: "korea" | "us"): boolean {
  return readLocalWatchlist().some((i) => i.symbol === symbol && i.market === market);
}

export async function toggleWatchlist(entry: WatchlistEntry): Promise<boolean> {
  const list = readLocalWatchlist();
  const idx = list.findIndex((i) => i.symbol === entry.symbol && i.market === entry.market);
  let next: WatchlistEntry[];
  let added: boolean;
  if (idx >= 0) {
    next = list.filter((_, i) => i !== idx);
    added = false;
  } else {
    next = [entry, ...list].slice(0, 50);
    added = true;
  }
  writeLocalWatchlist(next, { pushToServer: !hasAuthToken() });
  if (hasAuthToken()) {
    await userDataApi.syncWatchlist(next);
  }
  return added;
}
