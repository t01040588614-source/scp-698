"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type FlashDir = "up" | "down";

function serializePrices(values: Record<string, number>): string {
  const keys = Object.keys(values).sort();
  if (keys.length === 0) return "";
  return keys.map((k) => `${k}:${values[k]}`).join("|");
}

/** tick 변경 시 짧은 하이라이트 (Investing 플래시) */
export function usePriceFlash(values: Record<string, number>) {
  const [flash, setFlash] = useState<Record<string, FlashDir>>({});
  const prev = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const valuesKey = useMemo(() => serializePrices(values), [values]);

  useEffect(() => {
    const nextFlash: Record<string, FlashDir> = {};

    for (const part of valuesKey ? valuesKey.split("|") : []) {
      const sep = part.indexOf(":");
      if (sep <= 0) continue;
      const id = part.slice(0, sep);
      const price = Number(part.slice(sep + 1));
      if (!Number.isFinite(price)) continue;
      const before = prev.current[id];
      if (before !== undefined && before !== price) {
        nextFlash[id] = price > before ? "up" : "down";
      }
      prev.current[id] = price;
    }

    if (Object.keys(nextFlash).length === 0) return;

    setFlash((current) => ({ ...current, ...nextFlash }));

    for (const [id, dir] of Object.entries(nextFlash)) {
      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        setFlash((current) => {
          if (current[id] !== dir) return current;
          const copy = { ...current };
          delete copy[id];
          return copy;
        });
      }, 650);
    }

    const scheduled = timers.current;
    return () => {
      Object.values(scheduled).forEach(clearTimeout);
    };
  }, [valuesKey]);

  return flash;
}
