import { api } from "@/lib/api";
import type { WatchlistEntry } from "@/lib/localWatchlist";
import type { PriceAlert } from "@/lib/priceAlerts";

export const userDataApi = {
  getWatchlist: () =>
    api
      .get<{ symbol: string; market: string; name: string; sortOrder?: number }[]>("/me/watchlist")
      .then((r) => r.data),

  syncWatchlist: (items: WatchlistEntry[]) =>
    api
      .put<{ symbol: string; market: string; name: string }[]>("/me/watchlist", {
        items: items.map((i) => ({ symbol: i.symbol, market: i.market, name: i.name })),
      })
      .then((r) => r.data),

  getPriceAlerts: () =>
    api
      .get<
        {
          id: number;
          symbol: string;
          market: string;
          name: string;
          targetPrice: number;
          direction: string;
          enabled: boolean;
          triggeredAt?: string | null;
        }[]
      >("/me/price-alerts")
      .then((r) => r.data),

  syncPriceAlerts: (alerts: PriceAlert[]) =>
    api
      .put("/me/price-alerts", {
        alerts: alerts.map((a) => ({
          symbol: a.symbol,
          market: a.market,
          name: a.name,
          targetPrice: a.targetPrice,
          direction: a.direction,
          enabled: a.enabled,
          triggeredAt: a.triggeredAt ?? null,
        })),
      })
      .then((r) => r.data),

  registerFcmToken: (token: string) =>
    api.put("/me/fcm-token", { token }).then((r) => r.data),

  getFcmDeviceCount: () =>
    api.get<{ count: number }>("/me/fcm-devices").then((r) => r.data),
};
