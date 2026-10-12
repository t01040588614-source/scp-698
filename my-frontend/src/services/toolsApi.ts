export async function getToolsList() {
  // TODO: 실제 도구 API 연결
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    data: [
      { id: "t1", name: "종목 스크리너", desc: "KOSPI·KOSDAQ 필터·정렬 표", href: "/korea" },
      { id: "t2", name: "미국 종목", desc: "NASDAQ·NYSE 주요 종목 시세", href: "/us" },
      { id: "t3", name: "차트 · 기술적 분석", desc: "OHLCV, MA, 캔들 차트", href: "/charts" },
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
      {
        id: "t10",
        name: "시스템 상태",
        desc: "API·WebSocket·캐시 갱신 시각",
        href: "/tools#system-status",
      },
      {
        id: "t11",
        name: "가격 알림",
        desc: "목표가 도달 시 토스트·브라우저 알림",
        href: "/watchlist",
      },
    ],
    status: "mock" as const,
  };
}
