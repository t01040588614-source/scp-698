export type PriceAlertDirection = "above" | "below";

export type PriceAlert = {
  id: string;
  symbol: string;
  market: "korea" | "us";
  name?: string;
  targetPrice: number;
  direction: PriceAlertDirection;
  createdAt: string;
  triggeredAt?: string;
  enabled: boolean;
};

const STORAGE_KEY = "stock-dashboard-price-alerts";
const LEGACY_KEY = "chartPriceAlerts";

function newId() {
  return `pa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function migrateLegacy(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PriceAlert[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const symbol = String(r.symbol ?? "");
      const market = r.market === "us" ? "us" : "korea";
      const targetPrice = Number(r.price);
      if (!symbol || !Number.isFinite(targetPrice)) continue;
      out.push({
        id: newId(),
        symbol,
        market,
        targetPrice,
        direction: "above",
        createdAt: String(r.at ?? new Date().toISOString()),
        enabled: true,
      });
    }
    if (out.length) {
      localStorage.removeItem(LEGACY_KEY);
    }
    return out;
  } catch {
    return [];
  }
}

export function readPriceAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacy();
      if (migrated.length) writePriceAlerts(migrated);
      return migrated;
    }
    const parsed = JSON.parse(raw) as PriceAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePriceAlerts(alerts: PriceAlert[], options?: { pushToServer?: boolean }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)));
  window.dispatchEvent(new Event("price-alerts-changed"));
  const push = options?.pushToServer !== false;
  if (push && typeof window !== "undefined" && localStorage.getItem("token")) {
    void import("@/lib/userDataSync").then((m) => m.pushPriceAlertsToServer().catch(() => undefined));
  }
}

export function addPriceAlert(input: {
  symbol: string;
  market: "korea" | "us";
  name?: string;
  targetPrice: number;
  direction: PriceAlertDirection;
}): PriceAlert {
  const alert: PriceAlert = {
    id: newId(),
    symbol: input.symbol.trim(),
    market: input.market,
    name: input.name?.trim(),
    targetPrice: input.targetPrice,
    direction: input.direction,
    createdAt: new Date().toISOString(),
    enabled: true,
  };
  const list = readPriceAlerts().filter(
    (a) =>
      !(
        a.enabled &&
        !a.triggeredAt &&
        a.symbol === alert.symbol &&
        a.market === alert.market &&
        a.targetPrice === alert.targetPrice &&
        a.direction === alert.direction
      )
  );
  writePriceAlerts([alert, ...list]);
  return alert;
}

export function removePriceAlert(id: string) {
  writePriceAlerts(readPriceAlerts().filter((a) => a.id !== id));
}

export function markAlertTriggered(id: string) {
  const now = new Date().toISOString();
  writePriceAlerts(
    readPriceAlerts().map((a) => (a.id === id ? { ...a, triggeredAt: now, enabled: false } : a))
  );
}

export function inferDirection(current: number, target: number): PriceAlertDirection {
  if (!Number.isFinite(current) || current <= 0) return "above";
  return target >= current ? "above" : "below";
}

export function isAlertTriggered(alert: PriceAlert, price: number): boolean {
  if (!alert.enabled || alert.triggeredAt) return false;
  if (!Number.isFinite(price)) return false;
  if (alert.direction === "above") return price >= alert.targetPrice;
  return price <= alert.targetPrice;
}
