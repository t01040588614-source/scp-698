export type RecentEquityView = {
  symbol: string;
  market: "korea" | "us";
  name?: string;
  viewedAt: string;
};

const STORAGE_KEY = "ml-recent-equity-views";
const MAX = 12;

export function readRecentEquityViews(): RecentEquityView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEquityView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecent(views: RecentEquityView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views.slice(0, MAX)));
  window.dispatchEvent(new Event("recent-equity-views-changed"));
}

export function recordRecentEquityView(entry: Omit<RecentEquityView, "viewedAt">) {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const rest = readRecentEquityViews().filter(
    (v) => !(v.market === entry.market && v.symbol === entry.symbol)
  );
  writeRecent([{ ...entry, viewedAt: now }, ...rest]);
}

export function clearRecentEquityViews() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("recent-equity-views-changed"));
}
