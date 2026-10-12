import { brand } from "@/config/brand";
import { AUTH_TERMS_VERSION } from "@/content/authTerms";

/** 회원가입·로그인 화면 카피 — README·이용약관(authTerms)과 동일한 서비스 정의 */
export const authUi = {
  productName: brand.name,
  tagline: brand.tagline,
  termsVersion: AUTH_TERMS_VERSION,
  serviceNature:
    "시장 정보·포트폴리오·리서치 도구이며, 투자 권유·중개·집합투자업을 하지 않습니다.",

  aside: {
    headline: "한국·미국 시장을 한 화면에서",
    subhead: "WebSocket(캐시)·차트·관심종목·간편 포트폴리오",
    features: [
      "KRX·NYSE 시세 — Yahoo·KIS·Finnhub 연동 (API 키 설정 시)",
      "1초 단위 WebSocket 푸시 · /korea · /us 보드",
      "관심종목·간편 보유(서버 저장) · 경제 캘린더 · 뉴스",
    ] as const,
    disclaimerTitle: "투자정보 면책",
    disclaimerBody:
      "시세·차트·뉴스는 참고용이며 지연·오류가 있을 수 있습니다. 투자 판단과 결과에 대한 책임은 이용자에게 있습니다.",
    systemLink: brand.highlight,
  },

  register: {
    ribbonKicker: `${brand.name} · 회원 계정`,
    ribbonTitles: {
      1: "약관 동의",
      2: "회원 정보",
      3: "로그인 설정",
      4: "계좌 등록",
      5: "증권 API 연동",
      6: "가입 완료",
    } as const,
    step1: {
      title: "서비스 이용약관 동의",
      desc: `시장 데이터·포트폴리오 기능 이용을 위해 약관에 동의해 주세요. (약관 버전 ${AUTH_TERMS_VERSION})`,
      noticeTitle: "서비스 성격",
    },
    step2: {
      title: "회원 정보 · 휴대폰 인증",
      desc: "포트폴리오 서버 저장·본인 확인을 위해 실명·연락처·SMS 인증을 진행합니다.",
      sectionProfile: "기본 정보",
      sectionPhone: "휴대폰 인증",
    },
    step3: {
      title: "로그인 계정 설정",
      desc: "이메일로 로그인하며, 표시용 사용자명과 비밀번호를 등록합니다.",
    },
    step4: {
      title: "증권 계좌 등록",
      desc: "실제 증권사 계좌 개설 여부를 확인하고, MarketLens 포트폴리오에 계좌를 등록합니다.",
      noticeTitle: "계좌 정보 안내",
    },
    step5: {
      title: "증권 Open API 연동",
      desc: "한국투자증권은 KIS Open API로 잔고를 확인·저장합니다. 다른 증권사는 수동 포트폴리오로 이어집니다.",
    },
    success: {
      title: "회원가입이 완료되었습니다",
      bodySuffix: "관심종목·포트폴리오·경제 캘린더·차트를 바로 이용할 수 있습니다.",
      primaryCta: "한국 시장 홈 (/korea)",
      secondaryCta: "포트폴리오 설정",
      accountCreatedSuffix: "등록한 계좌에서 매매·잔고를 바로 관리할 수 있습니다.",
    },
    footer: "시세 지연·WebSocket 상태는 도구 → 시스템 상태에서 확인할 수 있습니다.",
  },

  login: {
    ribbonKicker: `${brand.name} · 로그인`,
    ribbonTitle: "로그인",
    title: "MarketLens 로그인",
    desc: "가입한 이메일과 비밀번호로 시장 대시보드·포트폴리오에 접속합니다.",
    footer: "공용 PC에서는 로그아웃 후 브라우저를 종료해 주세요.",
    integrationsHint: "KIS·Finnhub·뉴스 API는 도구 → API 키 연동에서 설정합니다.",
  },
} as const;

export function registerRibbonTitle(step: number): string {
  const key = (step >= 6 ? 6 : step) as keyof typeof authUi.register.ribbonTitles;
  return `회원가입 · ${authUi.register.ribbonTitles[key]}`;
}
