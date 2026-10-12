export const uiConfig = {
  serviceName: "MarketLens",
  breakpoints: {
    mobile: 767,
    tablet: 1023,
    desktop: 1280,
  },
  layout: {
    maxWidth: 1920,
    sidebarWidth: 320,
    mobileGutter: 10,
    desktopGutter: 16,
  },
  navigation: {
    primary: [
      { href: "/markets", label: "시장" },
      { href: "/korea", label: "한국 종목" },
      { href: "/stocks", label: "종목(DOCX)" },
      { href: "/portfolio#docx-accounts", label: "포트폴리오" },
      { href: "/watchlist", label: "관심목록" },
      { href: "/charts", label: "차트" },
      { href: "/news", label: "뉴스" },
      { href: "/analysis", label: "분석" },
      { href: "/calendar", label: "경제 캘린더" },
      { href: "/tools", label: "도구" },
    ],
    mobileItems: [
      { href: "/korea", label: "홈", short: "홈" },
      { href: "/korea", label: "종목", short: "종목" },
      { href: "/news", label: "뉴스", short: "뉴스" },
      { href: "/watchlist", label: "관심목록", short: "관심" },
    ],
    legacy: [
      { href: "/korea", label: "한국주식" },
      { href: "/us", label: "미국주식" },
      { href: "/portfolio", label: "포트폴리오" },
    ],
  },
  marketTable: {
    mobileHiddenFromColumn: 5,
  },
  chart: {
    desktopHeight: 360,
    mobileHeight: 260,
  },
  news: {
    thumbnailWidthDesktop: 120,
    thumbnailHeightDesktop: 80,
    thumbnailWidthMobile: 92,
    thumbnailHeightMobile: 64,
  },
} as const;
