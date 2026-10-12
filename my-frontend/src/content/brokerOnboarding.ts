/** 증권사별 실제 계좌 개설·Open API 안내 (MarketLens는 중개사가 아님) */

export type BrokerProfile = {
  id: string;
  match: RegExp;
  displayName: string;
  accountOpenUrl: string;
  accountOpenCta: string;
  supportsKisOpenApi: boolean;
  openApiPortalUrl: string;
  openApiSteps: readonly string[];
  accountOpenSteps: readonly string[];
};

export const BROKER_PROFILES: readonly BrokerProfile[] = [
  {
    id: "kis",
    match: /한국투자/i,
    displayName: "한국투자증권",
    accountOpenUrl: "https://securities.koreainvestment.com/",
    accountOpenCta: "한국투자증권 계좌 개설·안내",
    supportsKisOpenApi: true,
    openApiPortalUrl: "https://apiportal.koreainvestment.com/",
    openApiSteps: [
      "한국투자증권 홈페이지·앱에서 비대면 계좌 개설 (신분증·본인명의 휴대폰 필요)",
      "apiportal.koreainvestment.com 회원가입 → 「Open API」 앱 등록",
      "App Key · App Secret 발급 (실전/모의 VTS 구분)",
      "계좌번호 8자리 + 상품코드(보통 01) 확인 — HTS·앱 「계좌관리」",
      "아래 5단계에서 Key 입력 → 연동 테스트 → 가입 완료",
    ],
    accountOpenSteps: [
      "증권사 선택 후 비대면 계좌개설 메뉴 진행",
      "투자자 정보 확인·약관·금융거래목적 확인",
      "비밀번호·OTP(또는 공인인증) 설정",
      "계좌 개설 완료 후 입금·매매 가능 (영업일 기준)",
    ],
  },
  {
    id: "kiwoom",
    match: /키움/i,
    displayName: "키움증권",
    accountOpenUrl: "https://www.kiwoom.com/h/customer/account/VAccountOpenInfoView",
    accountOpenCta: "키움증권 계좌 개설 안내",
    supportsKisOpenApi: false,
    openApiPortalUrl: "https://www.kiwoom.com/h/customer/download/VOpenApiInfoView",
    openApiSteps: [
      "키움 Open API+ 별도 신청 (영웅문 기준)",
      "MarketLens에서는 수동 매매·잔고 입력으로 포트폴리오 관리",
    ],
    accountOpenSteps: [
      "키움 홈페이지·영웅문에서 비대면 계좌개설",
      "신분증 촬영·본인 확인 후 위탁계좌 발급",
    ],
  },
  {
    id: "toss",
    match: /토스/i,
    displayName: "토스증권",
    accountOpenUrl: "https://tossinvest.com/",
    accountOpenCta: "토스증권 계좌 개설",
    supportsKisOpenApi: false,
    openApiPortalUrl: "",
    openApiSteps: ["토스증권 앱에서 계좌 개설 후, MarketLens에 계좌 별칭·잔고를 등록해 관리합니다."],
    accountOpenSteps: ["토스 앱 → 증권 탭 → 계좌 만들기 (약 3분)"],
  },
  {
    id: "kakao",
    match: /카카오/i,
    displayName: "카카오페이증권",
    accountOpenUrl: "https://securities.kakaopay.com/",
    accountOpenCta: "카카오페이증권 계좌 개설",
    supportsKisOpenApi: false,
    openApiPortalUrl: "",
    openApiSteps: ["카카오페이증권 앱 비대면 개설 후 MarketLens 포트폴리오에 계좌를 추가합니다."],
    accountOpenSteps: ["카카오페이증권 앱에서 비대면 계좌 개설"],
  },
] as const;

export const DEFAULT_BROKER_PROFILE: BrokerProfile = {
  id: "generic",
  match: /.*/,
  displayName: "선택한 증권사",
  accountOpenUrl: "https://www.krx.co.kr/",
  accountOpenCta: "증권사 홈페이지에서 계좌 개설",
  supportsKisOpenApi: false,
  openApiPortalUrl: "",
  openApiSteps: [
    "해당 증권사에서 위탁계좌를 개설한 뒤, MarketLens 4단계에 계좌 정보를 입력합니다.",
    "잔고 자동 연동은 증권사 Open API 정책에 따릅니다 (한국투자증권은 5단계 KIS 연동).",
  ],
  accountOpenSteps: [
    "증권사 홈페이지·앱에서 「계좌개설」",
    "실명 확인·약관 동의·비밀번호 설정",
    "개설 완료 후 계좌번호 확인",
  ],
};

export function resolveBrokerProfile(brokerLabel: string): BrokerProfile {
  const label = brokerLabel.trim();
  if (!label) return DEFAULT_BROKER_PROFILE;
  for (const p of BROKER_PROFILES) {
    if (p.match.test(label)) return p;
  }
  return { ...DEFAULT_BROKER_PROFILE, displayName: label };
}

export function brokerSupportsKis(brokerLabel: string): boolean {
  return resolveBrokerProfile(brokerLabel).supportsKisOpenApi;
}
