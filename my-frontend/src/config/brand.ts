import { SYSTEM_STATUS_HREF } from "@/lib/systemStatusNav";

/** 앱 공통 브랜드 (헤더·메타·푸터) */
export const brand = {
  /** Display name — header, footer, watermark */
  name: "MarketLens",
  /** Logo wordmark split (accent on second part) */
  wordmark: { lead: "Market", accent: "Lens" } as const,
  /** Same as name (meta, a11y) */
  nameEn: "MarketLens",
  tagline: "한국·미국 실시간 시장",
  highlight: {
    message: "WebSocket 시세 · 차트 · 포트폴리오. 연결 상태는 도구 메뉴에서 확인하세요.",
    href: SYSTEM_STATUS_HREF,
    linkLabel: "시스템 상태",
  },
  searchPlaceholder: "종목 검색 (코드 또는 이름)",
} as const;
