"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginPrompt } from "@/context/LoginPromptContext";
import { useTradeAccountPicker } from "@/context/TradeAccountPickerContext";
import { useAuth } from "@/context/AuthContext";
import {
  clearPendingTrade,
  isTradeAccountPickerNav,
  resolveNewTradeNavigation,
  savePendingTrade,
  type PendingTrade,
} from "@/lib/tradeNavigation";

type TradeActionInput = Omit<PendingTrade, "side">;

export function useEquityTradeAction(input: TradeActionInput) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();
  const { openTradeAccountPicker } = useTradeAccountPicker();
  const [busy, setBusy] = useState(false);

  const startTrade = useCallback(
    async (side: PendingTrade["side"]) => {
      if (isLoading || busy) return;
      const trade: PendingTrade = { ...input, side };

      if (!isAuthenticated) {
        savePendingTrade(trade);
        openLoginPrompt("trade");
        return;
      }

      setBusy(true);
      try {
        const nav = await resolveNewTradeNavigation(trade);
        if (isTradeAccountPickerNav(nav)) {
          savePendingTrade(trade);
          openTradeAccountPicker({ trade, accounts: nav.accounts });
          return;
        }
        if (nav.keepPending) savePendingTrade(trade);
        else clearPendingTrade();
        router.push(nav.href);
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      input,
      isAuthenticated,
      isLoading,
      openLoginPrompt,
      openTradeAccountPicker,
      router,
    ],
  );

  return { startTrade, tradeBusy: busy };
}
