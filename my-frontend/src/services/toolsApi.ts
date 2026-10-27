import { api } from "@/lib/api";
import { SYSTEM_STATUS_HREF } from "@/lib/systemStatusNav";

export type ToolListItem = {
  id: string;
  name: string;
  desc: string;
  href: string;
};

const FALLBACK: ToolListItem[] = [
  { id: "t1", name: "종목 스크리너", desc: "KOSPI·KOSDAQ 필터·정렬 표", href: "/korea" },
  { id: "t2", name: "미국 종목", desc: "NASDAQ·NYSE 주요 종목 시세", href: "/us" },
  {
    id: "t3",
    name: "차트 · 기술적 분석",
    desc: "OHLCV, MA, 캔들 · 주요 통계(적정가·베타·RSI)",
    href: "/charts",
  },
  {
    id: "t3b",
    name: "밸류에이션 · Pro 인사이트",
    desc: "적정가·애널리스트·회사 점수 — 종목 상세 우측 패널",
    href: "/quote/korea/005930",
  },
  { id: "t4", name: "경제 캘린더", desc: "국가·중요도별 이벤트", href: "/calendar" },
  { id: "t5", name: "시장 분석", desc: "매크로·산업 리포트", href: "/analysis" },
  { id: "t6", name: "포트폴리오", desc: "보유 종목 손익 관리", href: "/portfolio" },
  {
    id: "t7",
    name: "API 키 연동",
    desc: "KIS·Finnhub·OAuth·News·AI 챗봇 — 키 입력 즉시 적용",
    href: "/tools/integrations",
  },
  {
    id: "t12",
    name: "AI Assistant",
    desc: "우측 하단 챗봇 — OpenAI/Gemini 키 설정 후 대화",
    href: "/tools/integrations",
  },
  { id: "t8", name: "관심목록", desc: "WS로 추적하는 관심 종목", href: "/watchlist" },
  { id: "t9", name: "종목 검색", desc: "코드·이름 통합 검색", href: "/search" },
  { id: "t10", name: "시스템 상태", desc: "API·WebSocket·캐시 갱신 시각", href: SYSTEM_STATUS_HREF },
  { id: "t11", name: "가격 알림", desc: "목표가 도달 시 토스트·FCM 푸시", href: "/watchlist" },
];

export async function getToolsList() {
  try {
    const res = await api.get<{ status: string; data: ToolListItem[] }>("/tools");
    const data = res.data?.data?.length ? res.data.data : FALLBACK;
    return { data, status: (res.data?.status === "live" ? "live" : "mock") as "live" | "mock" };
  } catch {
    return { data: FALLBACK, status: "mock" as const };
  }
}
