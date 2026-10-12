import { api } from "@/lib/api";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatQuoteContext = {
  symbol?: string;
  name?: string;
  price?: number;
  changePercent?: number;
  sector?: string;
};

export type ChatStatus = {
  configured: boolean;
  active: boolean;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  maxMessageLength: number;
  maxHistoryTurns: number;
  disclaimer: string;
};

export type ChatContextPayload = {
  pagePath?: string | null;
  pageLabel?: string | null;
  symbol?: string | null;
  market?: string | null;
  quote?: ChatQuoteContext | null;
  suggestedPrompts: string[];
};

export type ChatReply = {
  reply: string;
  provider: string;
  model: string;
  context?: ChatQuoteContext | null;
};

export const chatApi = {
  getStatus: () => api.get<ChatStatus>("/chat/status").then((r) => r.data),
  getContext: (params: { pagePath?: string; symbol?: string; market?: string }) =>
    api
      .get<ChatContextPayload>("/chat/context", {
        params: {
          pagePath: params.pagePath,
          symbol: params.symbol,
          market: params.market,
        },
      })
      .then((r) => r.data),
  send: (body: {
    message: string;
    history: ChatTurn[];
    pagePath?: string;
    symbol?: string;
    market?: string;
  }) => api.post<ChatReply>("/chat", body).then((r) => r.data),
};
