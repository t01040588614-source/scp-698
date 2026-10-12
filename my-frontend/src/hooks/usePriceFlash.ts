"use client";

import { useEffect, useRef, useState } from "react";

export type FlashDir = "up" | "down";

/** tick 변경 시 짧은 하이라이트 (Investing 플래시) */
export function usePriceFlash(values: Record<string, number>) {
  const [flash, setFlash] = useState<Record<string, FlashDir>>({});
  const prev = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const nextFlash: Record<string, FlashDir> = {};

    for (const [id, price] of Object.entries(values)) {
      const before = prev.current[id];
      if (before !== undefined && before !== price) {
        nextFlash[id] = price > before ? "up" : "down";
      }
    }

    prev.current = { ...values };

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
  }, [values]);

  return flash;
}
