export const MARKET_AI_CHAT_OPEN_EVENT = "marketlens:ai-chat-open";

export type MarketAiChatOpenDetail = {
  /** 입력창에 넣거나 전송할 메시지 */
  message?: string;
  /** true면 패널을 연 뒤 메시지를 바로 전송 */
  autoSend?: boolean;
  symbol?: string;
  market?: string;
};

export function openMarketAiChat(detail: MarketAiChatOpenDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<MarketAiChatOpenDetail>(MARKET_AI_CHAT_OPEN_EVENT, { detail })
  );
}

export function buildSymbolTrendPrompt(symbol: string) {
  return `${symbol} 종목이 단기적으로 상승할 가능성이 큰지, 하락 압력이 큰지 현재 시세·추세·주요 통계 관점에서 참고 의견을 정리해줘. 매매·목표가 권유는 하지 마.`;
}
