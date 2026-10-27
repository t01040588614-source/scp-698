"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Modal from "@/components/common/Modal";
import { useAuth } from "@/context/AuthContext";
import { buildLoginHref } from "@/lib/authNavigation";

export type LoginPromptReason = "watchlist" | "trade";

const PROMPT_COPY: Record<
  LoginPromptReason,
  { title: string; description: string; actionLabel: string }
> = {
  watchlist: {
    title: "로그인이 필요합니다",
    description:
      "관심종목(즐겨찾기)은 로그인 후 계정에 저장되며 기기 간 동기화됩니다.",
    actionLabel: "로그인",
  },
  trade: {
    title: "로그인이 필요합니다",
    description:
      "매수·매도 기록은 로그인 후 포트폴리오·증권 계좌에서 이용할 수 있습니다.",
    actionLabel: "로그인",
  },
};

type LoginPromptContextValue = {
  /** 로그인 상태면 action 실행, 아니면 로그인 안내 모달 */
  requireAuth: (reason: LoginPromptReason, action: () => void) => void;
  openLoginPrompt: (reason: LoginPromptReason) => void;
};

const LoginPromptContext = createContext<LoginPromptContextValue | undefined>(undefined);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [reason, setReason] = useState<LoginPromptReason | null>(null);

  const returnPath = pathname && pathname.length > 0 ? pathname : "/";

  const close = useCallback(() => setReason(null), []);

  const openLoginPrompt = useCallback((nextReason: LoginPromptReason) => {
    setReason(nextReason);
  }, []);

  const requireAuth = useCallback(
    (nextReason: LoginPromptReason, action: () => void) => {
      if (isLoading) return;
      if (isAuthenticated) {
        action();
        return;
      }
      openLoginPrompt(nextReason);
    },
    [isAuthenticated, isLoading, openLoginPrompt],
  );

  const copy = reason ? PROMPT_COPY[reason] : null;

  const value = useMemo(
    () => ({ requireAuth, openLoginPrompt }),
    [requireAuth, openLoginPrompt],
  );

  return (
    <LoginPromptContext.Provider value={value}>
      {children}
      {copy && reason && (
        <Modal open title={copy.title} onClose={close}>
          <p className="text-muted-sm mb-6">{copy.description}</p>
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="segment-btn" onClick={close}>
              나중에
            </button>
            <button
              type="button"
              className="btn-primary px-5 py-2.5"
              onClick={() => {
                const returnTo =
                  typeof window !== "undefined"
                    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
                    : returnPath;
                window.location.href = buildLoginHref(returnTo);
              }}
            >
              {copy.actionLabel}
            </button>
          </div>
        </Modal>
      )}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) {
    throw new Error("useLoginPrompt must be used within LoginPromptProvider");
  }
  return ctx;
}
