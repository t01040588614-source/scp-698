/** 가입·계좌 등록 UI — 증권사·계좌 유형 (포트폴리오 관리용, 실제 중개 연동 아님) */

export const ACCOUNT_MARKETS = [
  { id: "KR", label: "국내 (KRX)", currency: "KRW", hint: "원화 위탁·ISA·연금 등" },
  { id: "US", label: "해외 (미국)", currency: "USD", hint: "USD 결제·해외 위탁" },
] as const;

export type AccountMarketId = (typeof ACCOUNT_MARKETS)[number]["id"];

export const ACCOUNT_KINDS = [
  { id: "general", label: "위탁 (일반)", short: "위탁" },
  { id: "isa", label: "ISA / 중개형 ISA", short: "ISA" },
  { id: "pension", label: "연금저축·퇴직연금", short: "연금" },
  { id: "cma", label: "CMA / RP", short: "CMA" },
  { id: "us_direct", label: "미국 주식 (해외)", short: "미국" },
  { id: "other", label: "기타", short: "기타" },
] as const;

export type AccountKindId = (typeof ACCOUNT_KINDS)[number]["id"];

export const KR_BROKERS = [
  "한국투자증권",
  "키움증권",
  "미래에셋증권",
  "삼성증권",
  "NH투자증권",
  "KB증권",
  "신한투자증권",
  "하나증권",
  "대신증권",
  "한화투자증권",
  "유안타증권",
  "메리츠증권",
  "카카오페이증권",
  "토스증권",
  "기타 (직접 입력)",
] as const;

export const US_BROKERS = [
  "Interactive Brokers (IBKR)",
  "Charles Schwab",
  "Fidelity",
  "TD Ameritrade",
  "Robinhood",
  "한국투자증권 (해외)",
  "키움증권 (해외)",
  "기타 (직접 입력)",
] as const;

export const CURRENCY_OPTIONS = [
  { id: "KRW", label: "KRW (원)" },
  { id: "USD", label: "USD (달러)" },
] as const;
