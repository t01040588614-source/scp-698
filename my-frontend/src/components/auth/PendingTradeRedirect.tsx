"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  clearPendingTrade,
  peekPendingTrade,
  resolveNewTradePageHref,
} from "@/lib/tradeNavigation";

/** 로그인 직후 저장된 매수/매도 intent → 계좌 매매 등록 화면 (세션당 1회) */
export default function PendingTradeRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const handledSession = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      handledSession.current = false;
      return;
    }
    if (handledSession.current) return;

    const pending = peekPendingTrade();
    if (!pending) return;

    handledSession.current = true;
    void resolveNewTradePageHref(pending).then(({ href, keepPending }) => {
      if (!keepPending) clearPendingTrade();
      router.replace(href);
    });
  }, [isAuthenticated, isLoading, router]);

  return null;
}
