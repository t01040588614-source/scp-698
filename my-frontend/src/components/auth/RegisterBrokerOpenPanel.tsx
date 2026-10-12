"use client";

import { ExternalLink } from "lucide-react";
import { resolveBrokerProfile } from "@/content/brokerOnboarding";
import { resolveBrokerLabel, type RegisterAccountForm } from "@/components/auth/registerAccountValidation";

type Props = {
  form: RegisterAccountForm;
  onChange: (patch: Partial<RegisterAccountForm>) => void;
};

export default function RegisterBrokerOpenPanel({ form, onChange }: Props) {
  if (form.skip) return null;

  const brokerLabel = resolveBrokerLabel(form);
  const profile = resolveBrokerProfile(brokerLabel);

  return (
    <section className="auth-form-section auth-broker-open" aria-labelledby="reg-broker-open">
      <h3 id="reg-broker-open" className="auth-form-section-title">
        증권사 계좌 (실제 개설)
      </h3>
      <p className="form-hint">
        <strong>MarketLens 회원가입</strong>과 <strong>{profile.displayName} 계좌</strong>는 별개입니다. 주식 매매·
        입출금은 반드시 증권사에서 개설한 계좌로 이루어집니다.
      </p>

      <div className="auth-account-pills" role="radiogroup" aria-label="계좌 보유 여부">
        <label className={`auth-account-pill ${form.ownership === "have" ? "is-active" : ""}`}>
          <input
            type="radio"
            name="reg-ownership"
            checked={form.ownership === "have"}
            onChange={() => onChange({ ownership: "have", brokerOpenConfirmed: true })}
          />
          <span className="auth-account-pill-label">이미 증권 계좌가 있습니다</span>
          <span className="auth-account-pill-hint">4단계에서 계좌 정보 입력</span>
        </label>
        <label className={`auth-account-pill ${form.ownership === "need_open" ? "is-active" : ""}`}>
          <input
            type="radio"
            name="reg-ownership"
            checked={form.ownership === "need_open"}
            onChange={() => onChange({ ownership: "need_open", brokerOpenConfirmed: false })}
          />
          <span className="auth-account-pill-label">아직 계좌가 없습니다</span>
          <span className="auth-account-pill-hint">증권사에서 먼저 개설</span>
        </label>
      </div>

      {form.ownership === "need_open" && (
        <div className="auth-broker-open-steps">
          <ol className="auth-broker-step-list">
            {profile.accountOpenSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a
            href={profile.accountOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary auth-broker-open-link"
          >
            {profile.accountOpenCta}
            <ExternalLink size={16} aria-hidden />
          </a>
          <label className="auth-check-row auth-account-consent">
            <input
              type="checkbox"
              className="auth-check-input"
              checked={form.brokerOpenConfirmed}
              onChange={(e) => onChange({ brokerOpenConfirmed: e.target.checked })}
            />
            <span className="auth-check-mark" aria-hidden />
            <span>
              {profile.displayName} 계좌 개설을 완료했거나, 개설 진행 중이며 계좌번호를 확인했습니다.
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
