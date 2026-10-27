export type CompareTrayEntry = {
  symbol: string;
  market: "korea" | "us";
  name?: string;
  addedAt: string;
};

const STORAGE_KEY = "ml-equity-compare-tray";
const MAX = 6;

export function readCompareTray(): CompareTrayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareTrayEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTray(entries: CompareTrayEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
  window.dispatchEvent(new Event("equity-compare-tray-changed"));
}

export function addToCompareTray(entry: Omit<CompareTrayEntry, "addedAt">) {
  if (typeof window === "undefined") return;
  const rest = readCompareTray().filter(
    (e) => !(e.market === entry.market && e.symbol === entry.symbol)
  );
  writeTray([{ ...entry, addedAt: new Date().toISOString() }, ...rest]);
}

export function removeFromCompareTray(market: "korea" | "us", symbol: string) {
  writeTray(readCompareTray().filter((e) => !(e.market === market && e.symbol === symbol)));
}

export function isInCompareTray(market: "korea" | "us", symbol: string): boolean {
  return readCompareTray().some((e) => e.market === market && e.symbol === symbol);
}
