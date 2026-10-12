"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { resolveBrokerProfile } from "@/content/brokerOnboarding";
import {
  resolveBrokerLabel,
  type RegisterAccountForm,
  type RegisterKisForm,
} from "@/components/auth/registerAccountValidation";
import { integrationsApi } from "@/services/integrationsApi";

type Props = {
  accountForm: RegisterAccountForm;
  kis: RegisterKisForm;
  onKisChange: (patch: Partial<RegisterKisForm>) => void;
  onAccountPatch: (patch: Partial<RegisterAccountForm>) => void;
};

export default function RegisterKisLinkStep({ accountForm, kis, onKisChange, onAccountPatch }: Props) {
  const [testMsg, setTestMsg] = useState("");
  const [testError, setTestError] = useState("");
  const [testing, setTesting] = useState(false);

  const brokerLabel = resolveBrokerLabel(accountForm);
  const profile = resolveBrokerProfile(brokerLabel);

  const runTest = async () => {
    setTestError("");
    setTestMsg("");
    if (!kis.appKey.trim() || !kis.appSecret.trim()) {
      setTestError("App Key와 App Secret을 입력하세요.");
      return;
    }
    setTesting(true);
    try {
      const res = await integrationsApi.verifyKis({
        appKey: kis.appKey.trim(),
        appSecret: kis.appSecret.trim(),
        accountNo: kis.accountNo.trim() || accountForm.accountNumber,
        accountProductCode: kis.accountProductCode || "01",
        useMock: kis.useMock,
      });
      setTestMsg(res.message);
      onKisChange({ verified: true });
      if (res.cashBalance != null && !accountForm.initialCash.trim()) {
        onAccountPatch({ initialCash: String(Math.floor(res.cashBalance)) });
      }
      if (kis.accountNo.trim() && !accountForm.accountNumber.trim()) {
        onAccountPatch({ accountNumber: kis.accountNo.trim() });
      }
    } catch (err) {
      onKisChange({ verified: false });
      setTestError(err instanceof Error ? err.message : "KIS 연동 테스트 실패");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="auth-form-stack">
      <div className="auth-lens-notice">
        <KeyRound size={16} aria-hidden />
        <p className="auth-lens-notice-text">
          <strong>5단계 — 증권 Open API 연동</strong>
          <br />
          {profile.supportsKisOpenApi
            ? "한국투자증권 포털에서 발급한 Key로 실전·모의 계좌 잔고를 확인합니다. Key는 회원 계정에 저장됩니다."
            : "선택한 증권사는 KIS Open API가 아닙니다. 계좌는 수동 등록되며, 자동 잔고 연동은 해당사 API 정책을 따릅니다."}
        </p>
      </div>

      {profile.supportsKisOpenApi && (
        <>
          <section className="auth-form-section">
            <h3 className="auth-form-section-title">KIS Open API 발급 절차</h3>
            <ol className="auth-broker-step-list">
              {profile.openApiSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <a
              href={profile.openApiPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inv-widget-more text-sm inline-flex items-center gap-1"
            >
              KIS API 포털 열기
              <ExternalLink size={14} aria-hidden />
            </a>
          </section>

          <section className="auth-form-section">
            <label className="auth-check-row">
              <input
                type="checkbox"
                className="auth-check-input"
                checked={kis.useMock}
                onChange={(e) => onKisChange({ useMock: e.target.checked, verified: false })}
              />
              <span className="auth-check-mark" aria-hidden />
              <span>모의투자(VTS) App Key 사용</span>
            </label>

            <div>
              <label className="form-label" htmlFor="kis-app-key">
                App Key <span className="auth-required">필수</span>
              </label>
              <input
                id="kis-app-key"
                type="password"
                className="form-input-plain w-full"
                autoComplete="off"
                value={kis.appKey}
                onChange={(e) => onKisChange({ appKey: e.target.value, verified: false })}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="kis-app-secret">
                App Secret <span className="auth-required">필수</span>
              </label>
              <input
                id="kis-app-secret"
                type="password"
                className="form-input-plain w-full"
                autoComplete="off"
                value={kis.appSecret}
                onChange={(e) => onKisChange({ appSecret: e.target.value, verified: false })}
              />
            </div>
            <div className="auth-account-cash-row">
              <div>
                <label className="form-label" htmlFor="kis-account-no">
                  계좌번호 (8자리)
                </label>
                <input
                  id="kis-account-no"
                  className="form-input-plain w-full"
                  inputMode="numeric"
                  value={kis.accountNo}
                  onChange={(e) => onKisChange({ accountNo: e.target.value, verified: false })}
                  placeholder={accountForm.accountNumber || "12345678"}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="kis-prdt">
                  상품코드
                </label>
                <input
                  id="kis-prdt"
                  className="form-input-plain w-full"
                  maxLength={2}
                  value={kis.accountProductCode}
                  onChange={(e) => onKisChange({ accountProductCode: e.target.value, verified: false })}
                  placeholder="01"
                />
                <p className="form-hint">위탁 종합계좌는 보통 01</p>
              </div>
            </div>

            <button type="button" className="btn-secondary w-full" disabled={testing} onClick={() => void runTest()}>
              {testing ? (
                <>
                  <Loader2 size={16} className="inline animate-spin mr-2" aria-hidden />
                  KIS 연동 테스트 중…
                </>
              ) : (
                "KIS 연동 테스트 (토큰·잔고 확인)"
              )}
            </button>
            {testMsg ? <p className="form-hint auth-verified-ok">{testMsg}</p> : null}
            {testError ? <p className="form-hint form-hint--error">{testError}</p> : null}
          </section>
        </>
      )}

      {!profile.supportsKisOpenApi && !accountForm.skip && (
        <p className="auth-lens-desc">
          {brokerLabel || "선택한 증권사"} 계좌는 MarketLens에 저장됩니다. 매매·잔고는 포트폴리오에서 직접 입력하거나, 추후
          해당 증권사 API 연동을 추가할 수 있습니다.
        </p>
      )}
    </div>
  );
}
