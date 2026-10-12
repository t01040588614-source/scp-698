import {
  ACCOUNT_KINDS,
  ACCOUNT_MARKETS,
  KR_BROKERS,
  US_BROKERS,
  type AccountKindId,
  type AccountMarketId,
} from "@/content/accountRegistryOptions";
import { brokerSupportsKis } from "@/content/brokerOnboarding";

export type RegisterAccountForm = {
  skip: boolean;
  ownership: "have" | "need_open";
  brokerOpenConfirmed: boolean;
  linkKis: boolean;
  name: string;
  market: AccountMarketId;
  kind: AccountKindId;
  broker: string;
  brokerCustom: string;
  accountNumber: string;
  currency: string;
  initialCash: string;
  memo: string;
  numberStorageConsent: boolean;
};

export type RegisterKisForm = {
  appKey: string;
  appSecret: string;
  accountNo: string;
  accountProductCode: string;
  useMock: boolean;
  verified: boolean;
};

export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/\s/g, "").replace(/-/g, "");
}

export function shouldLinkKisAtSignup(form: RegisterAccountForm): boolean {
  if (form.skip || form.market !== "KR") return false;
  const broker = resolveBrokerLabel(form);
  return form.linkKis || brokerSupportsKis(broker);
}

export function validateKisStep(form: RegisterAccountForm, kis: RegisterKisForm): string | null {
  if (!shouldLinkKisAtSignup(form)) return null;
  if (!kis.appKey.trim() || !kis.appSecret.trim()) {
    return "한국투자증권 Open API App Key·Secret을 입력하세요.";
  }
  if (!kis.verified) {
    return "KIS 「연동 테스트」를 먼저 완료해 주세요.";
  }
  return null;
}

export function validateRegisterAccount(form: RegisterAccountForm): string | null {
  if (form.skip) return null;

  if (form.ownership === "need_open" && !form.brokerOpenConfirmed) {
    return "증권사 계좌 개설(또는 진행) 확인에 체크해 주세요.";
  }

  const name = form.name.trim();
  if (name.length < 2) return "계좌 별칭을 2자 이상 입력해 주세요.";
  if (name.length > 40) return "계좌 별칭은 40자 이내로 입력해 주세요.";

  const broker = resolveBrokerLabel(form);
  if (!broker) return "증권사를 선택하거나 직접 입력해 주세요.";

  const digits = normalizeAccountNumber(form.accountNumber);
  if (digits.length > 0) {
    if (form.market === "KR" && !/^\d{8,14}$/.test(digits)) {
      return "국내 계좌번호는 숫자 8~14자리로 입력해 주세요. (하이픈은 자동 제거됩니다)";
    }
    if (form.market === "US" && digits.length < 4) {
      return "해외 계좌번호(또는 계정 ID)를 4자 이상 입력해 주세요.";
    }
    if (!form.numberStorageConsent) {
      return "계좌번호 저장에 동의해 주세요. (포트폴리오·매매 기록용)";
    }
  }

  if (form.initialCash.trim() !== "") {
    const n = Number(form.initialCash.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return "초기 현금은 0 이상의 숫자로 입력해 주세요.";
    if (n > 1_000_000_000_000) return "초기 현금 금액을 확인해 주세요.";
  }

  if (form.memo.trim().length > 120) return "메모는 120자 이내로 입력해 주세요.";

  return null;
}

export function resolveBrokerLabel(form: RegisterAccountForm): string {
  const pick = form.broker.trim();
  if (!pick) return form.brokerCustom.trim();
  if (pick.includes("기타")) return form.brokerCustom.trim();
  return pick;
}

export function buildAccountApiPayload(form: RegisterAccountForm): {
  name: string;
  broker?: string;
  accountNumber?: string;
  currency?: string;
  cashBalance?: number;
} {
  const kind = ACCOUNT_KINDS.find((k) => k.id === form.kind)?.short ?? form.kind;
  const market = ACCOUNT_MARKETS.find((m) => m.id === form.market)?.label ?? form.market;
  const broker = resolveBrokerLabel(form);
  const brokerLine = broker ? `${broker} · ${kind}` : kind;

  let name = form.name.trim();
  const memo = form.memo.trim();
  if (memo) name = `${name} (${memo})`;
  name = name.slice(0, 100);

  const digits = normalizeAccountNumber(form.accountNumber);
  let cash = 0;
  if (form.initialCash.trim() !== "") {
    cash = Number(form.initialCash.replace(/,/g, ""));
  }

  return {
    name,
    broker: `${brokerLine} · ${market}`,
    accountNumber: digits || undefined,
    currency: form.currency || "KRW",
    cashBalance: cash,
  };
}

export function brokerOptionsForMarket(market: AccountMarketId): readonly string[] {
  return market === "US" ? US_BROKERS : KR_BROKERS;
}
