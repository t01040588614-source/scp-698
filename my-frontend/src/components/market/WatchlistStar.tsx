"use client";

import { useEffect, useState } from "react";
import { isInLocalWatchlist, toggleLocalWatchlist, type WatchlistEntry } from "@/lib/localWatchlist";

type WatchlistStarProps = {
  symbol: string;
  market: "korea" | "us";
  name: string;
};

export default function WatchlistStar({ symbol, market, name }: WatchlistStarProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isInLocalWatchlist(symbol, market));
    sync();
    window.addEventListener("local-watchlist-changed", sync);
    return () => window.removeEventListener("local-watchlist-changed", sync);
  }, [symbol, market]);

  return (
    <button
      type="button"
      className={`inv-star ${active ? "is-active" : ""}`}
      aria-label={active ? "관심목록에서 제거" : "관심목록에 추가"}
      aria-pressed={active}
      onClick={() => {
        const entry: WatchlistEntry = { symbol, market, name };
        toggleLocalWatchlist(entry);
        setActive(isInLocalWatchlist(symbol, market));
      }}
    >
      ★
    </button>
  );
}
