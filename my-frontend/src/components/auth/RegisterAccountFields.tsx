"use client";

import { Building2, CircleDollarSign, Info, Wallet } from "lucide-react";
import {
  ACCOUNT_KINDS,
  ACCOUNT_MARKETS,
  CURRENCY_OPTIONS,
} from "@/content/accountRegistryOptions";
import RegisterBrokerOpenPanel from "@/components/auth/RegisterBrokerOpenPanel";
import {
  brokerOptionsForMarket,
  type RegisterAccountForm,
} from "@/components/auth/registerAccountValidation";
import { brokerSupportsKis } from "@/content/brokerOnboarding";

type Props = {
  value: RegisterAccountForm;
  onChange: (patch: Partial<RegisterAccountForm>) => void;
};

export default function RegisterAccountFields({ value, onChange }: Props) {
  const brokers = brokerOptionsForMarket(value.market);
  const brokerIsOther = value.broker.includes("기타");

  return (
    <div className="auth-form-stack auth-account-fields">
      <label className="auth-check-row auth-check-row--master auth-account-skip">
        <input
          type="checkbox"
          className="auth-check-input"
          checked={value.skip}
          onChange={(e) => onChange({ skip: e.target.checked })}
        />
        <span className="auth-check-mark" aria-hidden />
        <span>
          <strong>계좌는 나중에 등록</strong>
          <span className="auth-account-skip-sub">포트폴리오 → 새 계좌에서 추가할 수 있습니다.</span>
        </span>
      </label>

      {!value.skip && (
        <>
          <RegisterBrokerOpenPanel form={value} onChange={onChange} />

          <div className="auth-lens-notice auth-account-notice">
            <Info size={16} aria-hidden />
            <p className="auth-lens-notice-text">
              아래 정보는 <strong>MarketLens 포트폴리오</strong>에 저장됩니다. 한국투자증권을 선택하면 5단계에서{" "}
              <strong>Open API</strong>로 잔고 확인까지 이어집니다.
            </p>
          </div>

          <section className="auth-form-section" aria-labelledby="reg-acc-basic">
            <h3 id="reg-acc-basic" className="auth-form-section-title">
              <Wallet size={14} aria-hidden /> 기본 정보
            </h3>
            <div>
              <label className="form-label" htmlFor="reg-acc-name">
                계좌 별칭 <span className="auth-required">필수</span>
              </label>
              <input
                id="reg-acc-name"
                type="text"
                className="form-input-plain w-full"
                placeholder="예: 주식 위탁, ISA, 미국 ETF"
                value={value.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={40}
              />
              <p className="form-hint">포트폴리오 목록에 표시되는 이름입니다.</p>
            </div>

            <div className="auth-account-market-row">
              <span className="form-label">시장 구분</span>
              <div className="auth-account-pills" role="radiogroup" aria-label="시장 구분">
                {ACCOUNT_MARKETS.map((m) => (
                  <label key={m.id} className={`auth-account-pill ${value.market === m.id ? "is-active" : ""}`}>
                    <input
                      type="radio"
                      name="reg-acc-market"
                      value={m.id}
                      checked={value.market === m.id}
                      onChange={() =>
                        onChange({
                          market: m.id,
                          currency: m.currency,
                          broker: "",
                          kind: m.id === "US" ? "us_direct" : value.kind === "us_direct" ? "general" : value.kind,
                        })
                      }
                    />
                    <span className="auth-account-pill-label">{m.label}</span>
                    <span className="auth-account-pill-hint">{m.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="form-label">계좌 유형</span>
              <div className="auth-account-kind-grid">
                {ACCOUNT_KINDS.filter((k) => (value.market === "US" ? k.id !== "isa" && k.id !== "pension" : true)).map(
                  (k) => (
                    <label key={k.id} className={`auth-account-kind ${value.kind === k.id ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="reg-acc-kind"
                        checked={value.kind === k.id}
                        onChange={() => onChange({ kind: k.id })}
                      />
                      {k.label}
                    </label>
                  )
                )}
              </div>
            </div>
          </section>

          <section className="auth-form-section" aria-labelledby="reg-acc-broker">
            <h3 id="reg-acc-broker" className="auth-form-section-title">
              <Building2 size={14} aria-hidden /> 증권사 · 계좌번호
            </h3>
            <div>
              <label className="form-label" htmlFor="reg-acc-broker">
                증권사 <span className="auth-required">필수</span>
              </label>
              <select
                id="reg-acc-broker"
                className="form-input-plain w-full"
                value={value.broker}
                onChange={(e) => {
                  const broker = e.target.value;
                  onChange({
                    broker,
                    linkKis: brokerSupportsKis(broker.includes("기타") ? value.brokerCustom : broker),
                  });
                }}
              >
                <option value="">선택하세요</option>
                {brokers.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            {brokerSupportsKis(value.broker.includes("기타") ? value.brokerCustom : value.broker) && (
              <p className="form-hint auth-verified-ok">다음 단계에서 KIS Open API(실전·모의) 연동을 진행합니다.</p>
            )}
            {brokerIsOther && (
              <div>
                <label className="form-label" htmlFor="reg-acc-broker-custom">
                  증권사명 (직접 입력)
                </label>
                <input
                  id="reg-acc-broker-custom"
                  type="text"
                  className="form-input-plain w-full"
                  value={value.brokerCustom}
                  onChange={(e) => onChange({ brokerCustom: e.target.value })}
                  placeholder="증권사명"
                  maxLength={60}
                />
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="reg-acc-number">
                계좌번호 <span className="auth-optional">선택</span>
              </label>
              <input
                id="reg-acc-number"
                type="text"
                inputMode={value.market === "KR" ? "numeric" : "text"}
                className="form-input-plain w-full"
                value={value.accountNumber}
                onChange={(e) => onChange({ accountNumber: e.target.value })}
                placeholder={value.market === "KR" ? "12345678-01 (하이픈 가능)" : "해외 계좌·로그인 ID"}
                autoComplete="off"
              />
              {value.accountNumber.trim().length > 0 && (
                <label className="auth-check-row auth-account-consent">
                  <input
                    type="checkbox"
                    className="auth-check-input"
                    checked={value.numberStorageConsent}
                    onChange={(e) => onChange({ numberStorageConsent: e.target.checked })}
                  />
                  <span className="auth-check-mark" aria-hidden />
                  <span>계좌번호를 서버에 저장하는 것에 동의합니다 (포트폴리오 식별용).</span>
                </label>
              )}
            </div>
          </section>

          <section className="auth-form-section" aria-labelledby="reg-acc-cash">
            <h3 id="reg-acc-cash" className="auth-form-section-title">
              <CircleDollarSign size={14} aria-hidden /> 잔고 · 메모
            </h3>
            <div className="auth-account-cash-row">
              <div>
                <label className="form-label" htmlFor="reg-acc-currency">
                  기준 통화
                </label>
                <select
                  id="reg-acc-currency"
                  className="form-input-plain w-full"
                  value={value.currency}
                  onChange={(e) => onChange({ currency: e.target.value })}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="reg-acc-cash">
                  초기 현금 잔고 <span className="auth-optional">선택</span>
                </label>
                <input
                  id="reg-acc-cash"
                  type="text"
                  inputMode="decimal"
                  className="form-input-plain w-full"
                  value={value.initialCash}
                  onChange={(e) => onChange({ initialCash: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder={value.currency === "USD" ? "10000" : "1000000"}
                />
                <p className="form-hint">매매 입력 전 기준 현금. 이후 매수·매도에 따라 재계산됩니다.</p>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="reg-acc-memo">
                메모 <span className="auth-optional">선택</span>
              </label>
              <textarea
                id="reg-acc-memo"
                className="form-input-plain w-full auth-account-memo"
                rows={2}
                maxLength={120}
                value={value.memo}
                onChange={(e) => onChange({ memo: e.target.value })}
                placeholder="예: 2024년부터 운용, 배당 재투자"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
