"use client";

import { Suspense, type ReactNode } from "react";
import SessionExpiredNotifier from "@/components/auth/SessionExpiredNotifier";
import PendingTradeRedirect from "@/components/auth/PendingTradeRedirect";
import { LoginPromptProvider } from "@/context/LoginPromptContext";
import { TradeAccountPickerProvider } from "@/context/TradeAccountPickerContext";

export default function AuthSessionLayer({ children }: { children: ReactNode }) {
  return (
    <LoginPromptProvider>
      <TradeAccountPickerProvider>
        <Suspense fallback={null}>
          <SessionExpiredNotifier />
          <PendingTradeRedirect />
        </Suspense>
        {children}
      </TradeAccountPickerProvider>
    </LoginPromptProvider>
  );
}
