"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import {
  isAlertTriggered,
  markAlertTriggered,
  readPriceAlerts,
  type PriceAlert,
} from "@/lib/priceAlerts";
import { formatPrice } from "@/lib/format";

type Toast = {
  id: string;
  title: string;
  body: string;
  href: string;
};

export default function PriceAlertMonitor() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const sync = useCallback(() => setAlerts(readPriceAlerts()), []);
  useEffect(() => {
    sync();
    window.addEventListener("price-alerts-changed", sync);
    return () => window.removeEventListener("price-alerts-changed", sync);
  }, [sync]);

  const active = useMemo(
    () => alerts.filter((a) => a.enabled && !a.triggeredAt),
    [alerts]
  );
  const symbols = useMemo(
    () => Array.from(new Set(active.map((a) => a.symbol))),
    [active]
  );
  const { quotes } = useMarketWebSocket(symbols, []);
  const firingRef = useRef(new Set<string>());

  const pushToast = useCallback((alert: PriceAlert, price: number) => {
    const decimals = alert.market === "korea" ? 0 : 2;
    const dir = alert.direction === "above" ? "이상" : "이하";
    const title = `${alert.name ?? alert.symbol} 가격 알림`;
    const body = `현재 ${formatPrice(price, decimals)} (목표 ${dir} ${formatPrice(alert.targetPrice, decimals)})`;
    const href = `/quote/${alert.market}/${alert.symbol}`;
    const id = `toast-${alert.id}-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-4), { id, title, body, href }]);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const n = new Notification(title, { body, tag: alert.id });
      n.onclick = () => {
        window.focus();
        window.location.href = href;
      };
    }
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 12_000);
  }, []);

  useEffect(() => {
    for (const alert of active) {
      if (firingRef.current.has(alert.id)) continue;
      const price = quotes[alert.symbol];
      if (price == null) continue;
      if (isAlertTriggered(alert, price)) {
        firingRef.current.add(alert.id);
        markAlertTriggered(alert.id);
        pushToast(alert, price);
        sync();
      }
    }
  }, [active, quotes, pushToast, sync]);

  if (toasts.length === 0) return null;

  return (
    <div className="price-alert-toasts" role="region" aria-live="polite" aria-label="가격 알림">
      {toasts.map((t) => (
        <Link key={t.id} href={t.href} className="price-alert-toast">
          <strong>{t.title}</strong>
          <span>{t.body}</span>
        </Link>
      ))}
    </div>
  );
}
