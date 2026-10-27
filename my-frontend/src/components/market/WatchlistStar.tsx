"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLoginPrompt } from "@/context/LoginPromptContext";
import { isInWatchlist, toggleWatchlist, loadWatchlistForUi } from "@/lib/watchlistFacade";
import type { WatchlistEntry } from "@/lib/localWatchlist";

type WatchlistStarProps = {
  symbol: string;
  market: "korea" | "us";
  name: string;
};

export default function WatchlistStar({ symbol, market, name }: WatchlistStarProps) {
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useLoginPrompt();
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    if (!isAuthenticated) {
      setActive(false);
      return;
    }
    setActive(isInWatchlist(symbol, market));
  }, [symbol, market, isAuthenticated]);

  useEffect(() => {
    sync();
    if (!isAuthenticated) return;
    void loadWatchlistForUi().then(sync);
    window.addEventListener("local-watchlist-changed", sync);
    window.addEventListener("auth:session-expired", sync);
    return () => {
      window.removeEventListener("local-watchlist-changed", sync);
      window.removeEventListener("auth:session-expired", sync);
    };
  }, [sync, isAuthenticated]);

  return (
    <button
      type="button"
      className={`inv-star ${active ? "is-active" : ""}`}
      aria-label={active ? "관심목록에서 제거" : "관심목록에 추가"}
      aria-pressed={active}
      onClick={() => {
        const entry: WatchlistEntry = { symbol, market, name };
        requireAuth("watchlist", () => {
          void toggleWatchlist(entry).then(() => sync());
        });
      }}
    >
      ★
    </button>
  );
}
