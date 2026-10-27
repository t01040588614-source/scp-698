"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronRight,
  Eraser,
  LineChart,
  MapPin,
  MessageCircle,
  Minimize2,
  Send,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { chatApi, type ChatTurn } from "@/services/chatApi";
import { parsePageContext } from "@/lib/chatPageContext";
import {
  MARKET_AI_CHAT_OPEN_EVENT,
  type MarketAiChatOpenDetail,
} from "@/lib/marketAiChatEvents";
import ChatMessageBody from "@/components/chat/ChatMessageBody";

const STORAGE_KEY = "marketlens-ai-chat-v2";
const MAX_LEN = 4000;

const WELCOME_ACTIONS = [
  {
    id: "terms",
    icon: LineChart,
    title: "시장 용어 · PER/PBR",
    desc: "KOSPI/KOSDAQ 개념",
    prompt: "PER·PBR 같은 벨류에이션 용어를 초보자도 이해하게 쉽게 설명해줘",
  },
  {
    id: "screens",
    icon: MapPin,
    title: "차트 · 스크리너",
    desc: "관심목록 사용법",
    prompt: "MarketLens에서 차트, 스크리너, 관심목록·알림은 어떻게 쓰면 좋아?",
  },
  {
    id: "concepts",
    icon: Sparkles,
    title: "종목 · 섹터 개념",
    desc: "매매 권유 없이 설명",
    prompt: "종목과 섹터를 비교할 때 보면 좋은 관점을 알려줘 (매매 권유는 하지 마)",
  },
] as const;

function loadHistory(): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem("marketlens-ai-chat-v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatTurn[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    );
  } catch {
    return [];
  }
}

function formatPrice(price: number | undefined, market?: string | null) {
  if (price == null || !Number.isFinite(price)) return "—";
  if (market === "korea" || market === "kr") {
    return `${Math.round(price).toLocaleString("ko-KR")}원`;
  }
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatChangePct(pct: number | undefined) {
  if (pct == null || !Number.isFinite(pct)) return "";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export default function MarketAiChatWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [contextOverride, setContextOverride] = useState<{
    symbol?: string;
    market?: string;
  } | null>(null);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const fullPath = `${pathname ?? ""}${search}`;

  const pageCtx = useMemo(
    () => parsePageContext(pathname, searchParams?.toString()),
    [pathname, searchParams]
  );

  const activeSymbol = contextOverride?.symbol ?? pageCtx.symbol;
  const activeMarket = contextOverride?.market ?? pageCtx.market;

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    setOpen(false);
    setBootstrapMessage(null);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<MarketAiChatOpenDetail>).detail;
      if (detail?.symbol || detail?.market) {
        setContextOverride({
          symbol: detail.symbol,
          market: detail.market,
        });
      } else {
        setContextOverride(null);
      }
      setOpen(true);
      const message = detail?.message?.trim();
      if (message) {
        if (detail?.autoSend) {
          setBootstrapMessage(message);
          setInput("");
        } else {
          setBootstrapMessage(null);
          setInput(message);
        }
      }
    };
    window.addEventListener(MARKET_AI_CHAT_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(MARKET_AI_CHAT_OPEN_EVENT, onOpenRequest);
  }, []);

  const status = useQuery({
    queryKey: ["chatStatus"],
    queryFn: () => chatApi.getStatus(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const context = useQuery({
    queryKey: ["chatContext", fullPath, activeSymbol, activeMarket],
    queryFn: () =>
      chatApi.getContext({
        pagePath: fullPath || pathname || undefined,
        symbol: activeSymbol,
        market: activeMarket,
      }),
    enabled: open,
    staleTime: 20_000,
  });

  const send = useMutation({
    mutationFn: (text: string) =>
      chatApi.send({
        message: text,
        history: messages,
        pagePath: fullPath || pathname || undefined,
        symbol: activeSymbol,
        market: activeMarket,
      }),
    onMutate: (text) => {
      setPendingUser(text);
      setInput("");
    },
    onSuccess: (data, text) => {
      setPendingUser(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: data.reply },
      ]);
    },
    onError: () => {
      setPendingUser(null);
    },
  });

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [open, messages, pendingUser, send.isPending]);

  const onSubmit = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? input).trim().slice(0, MAX_LEN);
      if (!text || send.isPending) return;
      send.mutate(text);
    },
    [input, send]
  );

  const configured = status.data?.configured ?? false;

  useEffect(() => {
    if (!open || !bootstrapMessage || status.isLoading) return;
    const text = bootstrapMessage.trim().slice(0, MAX_LEN);
    if (!configured) {
      if (text) setInput(text);
      setBootstrapMessage(null);
      return;
    }
    if (send.isPending || !text) return;
    setBootstrapMessage(null);
    send.mutate(text);
  }, [open, bootstrapMessage, configured, status.isLoading, send.isPending, send]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const maxLen = status.data?.maxMessageLength ?? MAX_LEN;
  const prompts = context.data?.suggestedPrompts ?? [];
  const quote = context.data?.quote;
  const pageLabel = context.data?.pageLabel ?? pageCtx.pageLabel;

  return (
    <div className="ai-chat-root" aria-live="polite">
      {open ? (
        <div
          className="ai-chat-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {!open ? (
        <button
          type="button"
          className="ai-chat-fab"
          aria-label="Open AI Assistant"
          onClick={() => setOpen(true)}
        >
          <span className="ai-chat-fab-icon" aria-hidden>
            <MessageCircle size={20} strokeWidth={2} />
          </span>
          <span className="ai-chat-fab-label">AI Assistant</span>
          {configured ? (
            <span className="ai-chat-fab-dot" title="Connected" aria-hidden />
          ) : null}
        </button>
      ) : (
        <section className="ai-chat-panel" aria-label="AI Assistant">
          <header className="ai-chat-header">
            <div className="ai-chat-header-glow" aria-hidden />
            <div className="ai-chat-header-main">
              <div className="ai-chat-title-row">
                <span className="ai-chat-brand-mark" aria-hidden>
                  <Bot size={18} strokeWidth={2.25} />
                </span>
                <div className="ai-chat-title-block">
                  <h2 className="ai-chat-title">AI Assistant</h2>
                  <p className="ai-chat-tagline">Market context · terms · screen help</p>
                </div>
                {configured ? (
                  <span className="ai-chat-online" title="Model ready">
                    <span className="ai-chat-online-pulse" aria-hidden />
                    Live
                  </span>
                ) : null}
              </div>
              <div className="ai-chat-sub">
                {configured ? (
                  <>
                    <span className="ai-chat-badge">
                      <Sparkles size={10} aria-hidden />
                      {status.data?.providerLabel ?? status.data?.provider}
                    </span>
                    <span className="ai-chat-badge ai-chat-badge--muted">{status.data?.model}</span>
                  </>
                ) : (
                  <span className="ai-chat-badge ai-chat-badge--warn">API key required</span>
                )}
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="ai-chat-icon-btn"
                aria-label="대화 지우기"
                title="대화 지우기"
                disabled={messages.length === 0 && !pendingUser}
                onClick={clearChat}
              >
                <Eraser size={17} aria-hidden />
              </button>
              <button
                type="button"
                className="ai-chat-icon-btn"
                aria-label="Minimize"
                onClick={() => setOpen(false)}
              >
                <Minimize2 size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="ai-chat-icon-btn"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </header>

          {(pageLabel || quote || activeSymbol) && (
            <div className="ai-chat-context-bar">
              {pageLabel ? (
                <span className="ai-chat-context-chip">
                  <MapPin size={12} aria-hidden />
                  {pageLabel}
                </span>
              ) : null}
              {quote?.symbol ? (
                <div className="ai-chat-quote-card">
                  <div className="ai-chat-quote-top">
                    <span className="ai-chat-quote-symbol">{quote.symbol}</span>
                    {quote.sector ? <span className="ai-chat-quote-sector">{quote.sector}</span> : null}
                  </div>
                  <div className="ai-chat-quote-main">
                    <span className="ai-chat-quote-name">{quote.name ?? quote.symbol}</span>
                    {quote.price != null ? (
                      <span className="ai-chat-quote-price">{formatPrice(Number(quote.price), activeMarket)}</span>
                    ) : null}
                  </div>
                  {quote.changePercent != null ? (
                    <span
                      className={
                        Number(quote.changePercent) >= 0
                          ? "ai-chat-chg-pill ai-chat-chg-pill--up"
                          : "ai-chat-chg-pill ai-chat-chg-pill--down"
                      }
                    >
                      {formatChangePct(Number(quote.changePercent))}
                    </span>
                  ) : null}
                </div>
              ) : activeSymbol && context.isFetching ? (
                <span className="ai-chat-context-loading">Loading quote snapshot…</span>
              ) : null}
            </div>
          )}

          <div className="ai-chat-body" ref={scrollRef}>
          <div className="ai-chat-messages">
            {messages.length === 0 && !pendingUser ? (
              <div className="ai-chat-welcome">
                <p className="ai-chat-welcome-title">무엇을 도와드릴까요?</p>
                <p className="ai-chat-welcome-lead">
                  지금 보고 있는 화면·종목 시세(캐시)를 참고해 한국어로 답합니다.
                </p>
                <p className="ai-chat-welcome-actions-label">Quick topics</p>
                <div className="ai-chat-action-grid">
                  {WELCOME_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className="ai-chat-action-btn"
                        disabled={!configured || send.isPending}
                        onClick={() => onSubmit(action.prompt)}
                      >
                        <span className="ai-chat-action-icon" aria-hidden>
                          <Icon size={16} strokeWidth={2.25} />
                        </span>
                        <span className="ai-chat-action-copy">
                          <span className="ai-chat-action-title">{action.title}</span>
                          <span className="ai-chat-action-desc">{action.desc}</span>
                        </span>
                        <ChevronRight size={18} className="ai-chat-action-chevron" aria-hidden />
                      </button>
                    );
                  })}
                </div>
                {status.data?.disclaimer ? (
                  <p className="ai-chat-disclaimer">
                    <Shield size={12} aria-hidden />
                    {status.data.disclaimer}
                  </p>
                ) : null}
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`ai-chat-row ai-chat-row--${m.role}`}>
                <div className="ai-chat-row-inner">
                  <span
                    className={`ai-chat-avatar ai-chat-avatar--${m.role === "user" ? "user" : "bot"}`}
                    aria-hidden
                  >
                    {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </span>
                  <div className="ai-chat-bubble-col">
                    <span className="ai-chat-role">{m.role === "user" ? "You" : "Assistant"}</span>
                    <div className={`ai-chat-bubble ai-chat-bubble--${m.role}`}>
                      {m.role === "assistant" ? (
                        <ChatMessageBody text={m.content} role="assistant" />
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {pendingUser ? (
              <div className="ai-chat-row ai-chat-row--user">
                <div className="ai-chat-row-inner">
                  <span className="ai-chat-avatar ai-chat-avatar--user" aria-hidden>
                    <User size={14} />
                  </span>
                  <div className="ai-chat-bubble-col">
                    <span className="ai-chat-role">You</span>
                    <div className="ai-chat-bubble ai-chat-bubble--user">{pendingUser}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {send.isPending ? (
              <div className="ai-chat-row ai-chat-row--assistant">
                <div className="ai-chat-row-inner">
                  <span className="ai-chat-avatar ai-chat-avatar--bot" aria-hidden>
                    <Bot size={14} />
                  </span>
                  <div className="ai-chat-bubble-col">
                    <span className="ai-chat-role">Assistant</span>
                    <div className="ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--typing">
                      <span className="ai-chat-typing-label">Thinking</span>
                      <span className="ai-chat-typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {prompts.length > 0 && configured && messages.length < 6 ? (
            <div className="ai-chat-prompts" aria-label="Suggested prompts">
              <div className="ai-chat-prompts-head">
                <p className="ai-chat-prompts-label">Suggested questions</p>
                <span className="ai-chat-prompts-hint">Tap to send</span>
              </div>
              {prompts.slice(0, 3).map((p, idx) => (
                <button
                  key={p}
                  type="button"
                  className="ai-chat-prompt-chip"
                  disabled={send.isPending}
                  onClick={() => onSubmit(p)}
                >
                  <span className="ai-chat-prompt-num">{idx + 1}</span>
                  <span className="ai-chat-prompt-text">{p}</span>
                  <ChevronRight size={16} className="ai-chat-prompt-chevron" aria-hidden />
                </button>
              ))}
            </div>
          ) : null}

          {!configured && !status.isLoading ? (
            <div className="ai-chat-setup">
              <p>
                <Link
                  href="/tools/integrations"
                  className="ai-chat-link"
                  onClick={() => {
                    setOpen(false);
                    void queryClient.invalidateQueries({ queryKey: ["chatStatus"] });
                  }}
                >
                  API 키 연동
                </Link>
                에서 <strong>OPENAI_API_KEY</strong> 또는 <strong>GEMINI_API_KEY</strong>를 저장하세요.
              </p>
            </div>
          ) : null}
          </div>

          {send.isError ? (
            <p className="ai-chat-error" role="alert">
              {send.error instanceof Error ? send.error.message : "전송 실패"}
            </p>
          ) : null}

          <footer className="ai-chat-footer">
            <div className="ai-chat-composer">
              <textarea
                ref={inputRef}
                className="ai-chat-input"
                rows={1}
                maxLength={maxLen}
                placeholder={configured ? "Ask about markets, terms, or this screen…" : "Set API key in Integrations"}
                value={input}
                disabled={!configured || send.isPending}
                onChange={(e) => setInput(e.target.value.slice(0, maxLen))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
              />
              <div className="ai-chat-composer-bar">
                <div className="ai-chat-kbd-hints">
                  <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line
                </div>
                <span className="ai-chat-counter">
                  {input.length}/{maxLen}
                </span>
                <button
                  type="button"
                  className="ai-chat-send"
                  disabled={!configured || !input.trim() || send.isPending}
                  aria-label="Send message"
                  onClick={() => onSubmit()}
                >
                  <Send size={17} aria-hidden />
                </button>
              </div>
            </div>
            {configured && status.data?.providerLabel ? (
              <p className="ai-chat-powered">
                Powered by {status.data.providerLabel}
                {status.data.model ? ` · ${status.data.model}` : ""}
              </p>
            ) : null}
          </footer>
        </section>
      )}
    </div>
  );
}
