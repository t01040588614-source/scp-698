import { userDataApi } from "@/lib/userDataApi";
import {
  readLocalWatchlist,
  writeLocalWatchlist,
  type WatchlistEntry,
} from "@/lib/localWatchlist";
import {
  readPriceAlerts,
  writePriceAlerts,
  type PriceAlert,
} from "@/lib/priceAlerts";

let loginSyncInProgress = false;

function mergeWatchlist(local: WatchlistEntry[], remote: WatchlistEntry[]): WatchlistEntry[] {
  const seen = new Set<string>();
  const out: WatchlistEntry[] = [];
  for (const item of [...remote, ...local]) {
    const key = `${item.market}:${item.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 50);
}

function mergeAlerts(local: PriceAlert[], remote: PriceAlert[]): PriceAlert[] {
  const map = new Map<string, PriceAlert>();
  for (const a of [...remote, ...local]) {
    const key = `${a.market}:${a.symbol}:${a.direction}:${a.targetPrice}`;
    map.set(key, a);
  }
  return Array.from(map.values()).slice(0, 100);
}

function remoteToAlerts(
  rows: {
    id: number;
    symbol: string;
    market: string;
    name: string;
    targetPrice: number;
    direction: string;
    enabled: boolean;
    triggeredAt?: string | null;
  }[]
): PriceAlert[] {
  return rows.map((r) => ({
    id: `srv-${r.id}`,
    symbol: r.symbol,
    market: r.market as "korea" | "us",
    name: r.name,
    targetPrice: r.targetPrice,
    direction: r.direction as PriceAlert["direction"],
    enabled: r.enabled,
    triggeredAt: r.triggeredAt ?? undefined,
    createdAt: r.triggeredAt ?? new Date().toISOString(),
  }));
}

/** 로그인 후 로컬 ↔ 서버 병합·동기화 */
export async function syncUserDataAfterLogin(): Promise<void> {
  if (typeof window === "undefined" || loginSyncInProgress) return;
  loginSyncInProgress = true;
  try {
    const localWl = readLocalWatchlist();
    const localAlerts = readPriceAlerts();

    const [remoteWl, remoteAlerts] = await Promise.all([
      userDataApi.getWatchlist().catch(() => []),
      userDataApi.getPriceAlerts().catch(() => []),
    ]);

    const remoteWatchEntries: WatchlistEntry[] = remoteWl.map((r) => ({
      symbol: r.symbol,
      market: r.market as "korea" | "us",
      name: r.name,
    }));

    const mergedWl = mergeWatchlist(localWl, remoteWatchEntries);
    writeLocalWatchlist(mergedWl, { pushToServer: false });
    await userDataApi.syncWatchlist(mergedWl);

    const remoteAlertModels = remoteToAlerts(remoteAlerts);
    const mergedAlerts = mergeAlerts(localAlerts, remoteAlertModels);
    writePriceAlerts(mergedAlerts, { pushToServer: false });
    await userDataApi.syncPriceAlerts(mergedAlerts);
  } finally {
    loginSyncInProgress = false;
  }
}

export async function pushWatchlistToServer(): Promise<void> {
  if (loginSyncInProgress) return;
  await userDataApi.syncWatchlist(readLocalWatchlist());
}

export async function pushPriceAlertsToServer(): Promise<void> {
  if (loginSyncInProgress) return;
  await userDataApi.syncPriceAlerts(readPriceAlerts());
}
