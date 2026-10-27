"use client";

import { useEffect, useRef, useState } from "react";

export type RankMoveTone = "up" | "down" | null;

/** 순위 개선(숫자↓) → up(빨강), 순위 하락(숫자↑) → down(파랑) */
export function rankMovePriceClass(tone: RankMoveTone | undefined): string {
  if (tone === "up") return "price-up";
  if (tone === "down") return "price-down";
  return "";
}

/**
 * 실시간 정렬·순위 목록 — 이전 순위 대비 변화 방향 (토스 실시간 순위)
 */
export function useRankMoveTone(
  orderedSymbols: string[],
  resetKey?: string
): Record<string, RankMoveTone> {
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [tones, setTones] = useState<Record<string, RankMoveTone>>({});
  const orderKey = orderedSymbols.join("\0");

  useEffect(() => {
    prevRanksRef.current = new Map();
    setTones({});
  }, [resetKey]);

  useEffect(() => {
    const symbols = orderKey ? orderKey.split("\0") : [];
    const updates: Record<string, RankMoveTone> = {};
    const nextRanks = new Map<string, number>();

    symbols.forEach((sym, index) => {
      const rank = index + 1;
      nextRanks.set(sym, rank);
      const prevRank = prevRanksRef.current.get(sym);
      if (prevRank !== undefined && prevRank !== rank) {
        updates[sym] = rank < prevRank ? "up" : "down";
      }
    });

    prevRanksRef.current = nextRanks;

    if (Object.keys(updates).length === 0) return;

    setTones((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const [sym, tone] of Object.entries(updates)) {
        if (merged[sym] !== tone) {
          merged[sym] = tone;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [orderKey]);

  return tones;
}
