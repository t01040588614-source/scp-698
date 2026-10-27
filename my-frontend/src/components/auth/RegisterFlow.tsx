"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import AuthAside from "@/components/auth/AuthAside";
import AuthServiceNotice from "@/components/auth/AuthServiceNotice";
import AppLogo from "@/components/layout/AppLogo";
import { authUi, registerRibbonTitle } from "@/content/authUi";
import { buildLoginHref } from "@/lib/authNavigation";
import {
  assessPasswordStrength,
  formatPhoneDisplay,
  isPasswordAcceptable,
  normalizePhoneDigits,
  validateBirthDate,
  validateEmail,
  validateFullName,
  validatePhone,
  validateUsername,
} from "@/components/auth/registerValidation";
import { AUTH_TERMS_VERSION, AUTH_TERM_SECTIONS } from "@/content/authTerms";
import { useAuth } from "@/context/AuthContext";
import RegisterAccountFields from "@/components/auth/RegisterAccountFields";
import RegisterKisLinkStep from "@/components/auth/RegisterKisLinkStep";
import {
  buildAccountApiPayload,
  shouldLinkKisAtSignup,
  validateKisStep,
  validateRegisterAccount,
  type RegisterAccountForm,
  type RegisterKisForm,
} from "@/components/auth/registerAccountValidation";
import { authApi } from "@/lib/api";
import { accountsApi } from "@/services/accountsApi";

const STEPS = [
  { id: 1, title: "약관 동의" },
  { id: 2, title: "본인·연락처" },
  { id: 3, title: "계정·보안" },
  { id: 4, title: "계좌 등록" },
  { id: 5, title: "증권 API" },
  { id: 6, title: "가입 완료" },
] as const;

const DEFAULT_ACCOUNT_FORM: RegisterAccountForm = {
  skip: false,
  ownership: "have",
  brokerOpenConfirmed: true,
  linkKis: false,
  name: "",
  market: "KR",
  kind: "general",
  broker: "",
  brokerCustom: "",
  accountNumber: "",
  currency: "KRW",
  initialCash: "",
  memo: "",
  numberStorageConsent: false,
};

const DEFAULT_KIS_FORM: RegisterKisForm = {
  appKey: "",
  appSecret: "",
  accountNo: "",
  accountProductCode: "01",
  useMock: false,
  verified: false,
};

type ConsentKey = "service" | "privacy" | "finance" | "age" | "marketing";

export default function RegisterFlow() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termDialog, setTermDialog] = useState<{ key: keyof typeof AUTH_TERM_SECTIONS; title: string } | null>(
    null
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [consent, setConsent] = useState<Record<ConsentKey, boolean>>({
    service: false,
    privacy: false,
    finance: false,
    age: false,
    marketing: false,
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    birthDate: "",
    phone: "",
    smsCode: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsDelivery, setSmsDelivery] = useState<"sms" | "demo" | null>(null);
  const [accountForm, setAccountForm] = useState<RegisterAccountForm>(DEFAULT_ACCOUNT_FORM);
  const [kisForm, setKisForm] = useState<RegisterKisForm>(DEFAULT_KIS_FORM);
  const [createdAccountId, setCreatedAccountId] = useState<number | null>(null);
  const [kisLinked, setKisLinked] = useState(false);

  const { data: smsStatus } = useQuery({
    queryKey: ["phoneSmsStatus"],
    queryFn: () => authApi.getPhoneSmsStatus(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = window.setTimeout(() => setSmsCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [smsCooldown]);

  const requiredOk = consent.service && consent.privacy && consent.finance && consent.age;
  const allConsentOk = requiredOk && consent.marketing;
  const pwdStrength = useMemo(() => assessPasswordStrength(form.password), [form.password]);

  const openTerm = (key: keyof typeof AUTH_TERM_SECTIONS, title: string) => {
    setTermDialog({ key, title });
    dialogRef.current?.showModal();
  };

  const closeTerm = () => {
    dialogRef.current?.close();
    setTermDialog(null);
  };

  const toggleConsent = (key: ConsentKey, value?: boolean) => {
    setConsent((prev) => ({ ...prev, [key]: value ?? !prev[key] }));
  };

  const setAllConsent = (checked: boolean) => {
    setConsent({
      service: checked,
      privacy: checked,
      finance: checked,
      age: checked,
      marketing: checked,
    });
  };

  const patchForm = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    if ("phone" in patch) {
      setPhoneVerified(false);
      setPhoneVerificationToken("");
      setDevCodeHint(null);
    }
  };

  const patchAccountForm = (patch: Partial<RegisterAccountForm>) => {
    setAccountForm((f) => ({ ...f, ...patch }));
  };

  const validateCredentialsStep = (): string | null => {
    const userErr = validateUsername(form.username);
    if (userErr) return userErr;
    if (!isPasswordAcceptable(form.password)) {
      return "비밀번호는 8자 이상이며 영문·숫자·특수문자 조합을 권장합니다.";
    }
    if (form.password !== form.confirmPassword) {
      return "비밀번호 확인이 일치하지 않습니다.";
    }
    return null;
  };

  const sendSms = async () => {
    setError("");
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    setSmsBusy(true);
    try {
      const res = await authApi.sendPhoneCode(normalizePhoneDigits(form.phone));
      setSmsCooldown(60);
      setSmsDelivery(res.delivery === "sms" ? "sms" : "demo");
      setDevCodeHint(res.devCode ?? null);
      if (res.devCode) {
        setForm((f) => ({ ...f, smsCode: res.devCode ?? f.smsCode }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setSmsBusy(false);
    }
  };

  const verifySms = async () => {
    setError("");
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (form.smsCode.trim().length !== 6) {
      setError("6자리 인증번호를 입력하세요.");
      return;
    }
    setSmsBusy(true);
    try {
      const res = await authApi.verifyPhoneCode(normalizePhoneDigits(form.phone), form.smsCode.trim());
      setPhoneVerificationToken(res.verificationToken);
      setPhoneVerified(true);
      setDevCodeHint(null);
    } catch (err) {
      setPhoneVerified(false);
      setPhoneVerificationToken("");
      setError(err instanceof Error ? err.message : "인증번호 확인에 실패했습니다.");
    } finally {
      setSmsBusy(false);
    }
  };

  const goNext = () => {
    setError("");
    if (step === 1) {
      if (!requiredOk) {
        setError("필수 약관 및 만 14세 이상 확인에 동의해 주세요.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const nameErr = validateFullName(form.fullName);
      const emailErr = validateEmail(form.email);
      const birthErr = validateBirthDate(form.birthDate);
      const phoneErr = validatePhone(form.phone);
      if (nameErr || emailErr || birthErr || phoneErr) {
        setError(nameErr || emailErr || birthErr || phoneErr || "");
        return;
      }
      if (!phoneVerified || !phoneVerificationToken) {
        setError("휴대폰 본인확인(인증번호)을 완료해 주세요.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const credErr = validateCredentialsStep();
      if (credErr) {
        setError(credErr);
        return;
      }
      setAccountForm((prev) => {
        if (prev.name.trim()) return prev;
        const base = form.fullName.trim();
        return { ...prev, name: base ? `${base}님 위탁계좌` : "내 주식 계좌" };
      });
      setStep(4);
      return;
    }
    if (step === 4) {
      const accountErr = validateRegisterAccount(accountForm);
      if (accountErr) {
        setError(accountErr);
        return;
      }
      setKisForm((k) => ({
        ...k,
        accountNo: k.accountNo || accountForm.accountNumber.replace(/\D/g, "").slice(0, 8),
        verified: false,
      }));
      setStep(5);
    }
  };

  const goBack = () => {
    setError("");
    if (step > 1 && step < 6) setStep(step - 1);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const credErr = validateCredentialsStep();
    if (credErr) {
      setError(credErr);
      return;
    }

    const accountErr = validateRegisterAccount(accountForm);
    if (accountErr) {
      setError(accountErr);
      return;
    }

    const kisErr = validateKisStep(accountForm, kisForm);
    if (kisErr) {
      setError(kisErr);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email.trim(),
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        password: form.password,
        phone: normalizePhoneDigits(form.phone),
        birthDate: form.birthDate,
        marketingConsent: consent.marketing,
        phoneVerificationToken,
        termsVersion: AUTH_TERMS_VERSION,
      });

      if (shouldLinkKisAtSignup(accountForm)) {
        await authApi.saveMyKisBroker({
          appKey: kisForm.appKey.trim(),
          appSecret: kisForm.appSecret.trim(),
          accountNo: kisForm.accountNo.trim() || accountForm.accountNumber,
          accountProductCode: kisForm.accountProductCode || "01",
          useMock: kisForm.useMock,
        });
        setKisLinked(true);
      }

      let accountId: number | null = null;
      if (!accountForm.skip) {
        const payload = buildAccountApiPayload(accountForm);
        const acc = await accountsApi.create(payload);
        accountId = acc.id;
      }
      setCreatedAccountId(accountId);
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const progressPct = step >= 6 ? 100 : ((step - 1) / (STEPS.length - 1)) * 100;

  const termRows: { key: ConsentKey | "service" | "privacy" | "finance" | "marketing"; label: string; required: boolean; legal?: keyof typeof AUTH_TERM_SECTIONS }[] = [
    { key: "service", label: "이용약관", required: true, legal: "service" },
    { key: "privacy", label: "개인정보 수집·이용", required: true, legal: "privacy" },
    { key: "finance", label: "투자정보·면책 고지", required: true, legal: "finance" },
    { key: "age", label: "만 14세 이상입니다", required: true },
    { key: "marketing", label: "마케팅 정보 수신 (선택)", required: false, legal: "marketing" },
  ];

  const ribbonTitle = registerRibbonTitle(step);

  return (
    <div className="auth-register-page auth-lens">
      <AuthAside />

      <div className="auth-register-main">
        <div className="auth-register-mobile-top">
          <Link href="/korea" className="auth-register-mobile-logo">
            <AppLogo link={false} />
          </Link>
          {step < 6 && (
            <p className="auth-register-mobile-step">
              <span className="auth-register-mobile-step-label">{STEPS[step - 1]?.title}</span>
              <span className="auth-register-mobile-step-count">
                {step} / {STEPS.length}
              </span>
            </p>
          )}
        </div>

        {step < 6 && (
          <nav className="auth-register-stepper" aria-label="가입 단계">
            <div className="auth-register-progress" aria-hidden>
              <div className="auth-register-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <ol className="auth-register-steps">
              {STEPS.slice(0, -1).map((s) => {
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <li
                    key={s.id}
                    className={`auth-register-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className="auth-register-step-num">
                      {done ? <Check size={14} strokeWidth={2.5} /> : String(s.id).padStart(2, "0")}
                    </span>
                    <span className="auth-register-step-label">{s.title}</span>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="auth-register-card">
          <div className="auth-register-card-ribbon">
            <p className="auth-register-card-ribbon-kicker">{authUi.register.ribbonKicker}</p>
            <h2 className="auth-register-card-ribbon-title">{ribbonTitle}</h2>
            {step < 6 && (
              <span className="auth-register-card-ribbon-badge">
                {String(step).padStart(2, "0")} / {String(STEPS.length - 1).padStart(2, "0")}
              </span>
            )}
          </div>

          <div className="auth-register-card-body">
          <AuthServiceNotice />
          <div className="auth-register-panel" key={step}>
          {step === 1 && (
            <>
              <header className="auth-register-card-head auth-register-card-head--lens">
                <p className="auth-lens-meta">약관 버전 {authUi.termsVersion}</p>
                <h1 className="auth-lens-title">{authUi.register.step1.title}</h1>
                <p className="auth-lens-desc">{authUi.register.step1.desc}</p>
              </header>

              {error && <div className="form-error">{error}</div>}

              <p className="auth-compliance-note">
                <strong>{authUi.register.step1.noticeTitle}</strong> {authUi.serviceNature}
              </p>

              <label className="auth-check-row auth-check-row--master">
                <input
                  type="checkbox"
                  className="auth-check-input"
                  checked={allConsentOk}
                  onChange={(e) => setAllConsent(e.target.checked)}
                />
                <span className="auth-check-mark" aria-hidden>
                  {allConsentOk ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                <span className="auth-check-copy">
                  <strong>전체 동의</strong>
                  <span className="auth-check-sub">필수·선택 항목을 한 번에 동의합니다.</span>
                </span>
              </label>

              <div className="auth-terms-list">
                {termRows.map(({ key, label, required, legal }) => {
                  const checked = consent[key as ConsentKey];
                  return (
                    <div key={key} className="auth-term-item">
                      <label className="auth-check-row auth-check-row--term" htmlFor={`consent-${key}`}>
                        <input
                          type="checkbox"
                          className="auth-check-input"
                          id={`consent-${key}`}
                          checked={checked}
                          onChange={() => toggleConsent(key as ConsentKey)}
                        />
                        <span className="auth-check-mark" aria-hidden>
                          {checked ? <Check size={12} strokeWidth={3} /> : null}
                        </span>
                        <span className="auth-check-label-text">
                          {required ? <span className="auth-required">필수</span> : <span className="auth-optional">선택</span>}
                          {label}
                        </span>
                      </label>
                      {legal && (
                        <div className="auth-term-actions">
                          <button type="button" className="auth-term-pill" onClick={() => openTerm(legal, label)}>
                            요약
                          </button>
                          <Link href={AUTH_TERM_SECTIONS[legal].href} className="auth-term-pill auth-term-pill--link" target="_blank">
                            전문
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="auth-register-actions">
                <button type="button" className="btn-primary auth-register-btn" disabled={!requiredOk} onClick={goNext}>
                  다음
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <header className="auth-register-card-head auth-register-card-head--lens">
                <h1 className="auth-lens-title">{authUi.register.step2.title}</h1>
                <p className="auth-lens-desc">{authUi.register.step2.desc}</p>
              </header>

              {error && <div className="form-error">{error}</div>}

              {smsStatus && !smsStatus.configured && (
                <div className="auth-sms-banner">
                  SMS 연동이 없습니다.{" "}
                  <Link href="/tools/integrations" className="link-accent">
                    API 키 연동
                  </Link>
                  에서 Aligo·NCP·Twilio를 설정하면 실제 문자가 발송됩니다.
                  {smsStatus.demoFallback ? " (현재는 화면 표시 모드)" : ""}
                </div>
              )}
              {smsStatus?.configured && (
                <p className="form-hint auth-sms-banner auth-sms-banner--ok">
                  SMS 연동됨: {smsStatus.label} — 인증번호가 휴대폰으로 전송됩니다.
                </p>
              )}

              <div className="auth-form-stack">
                <div className="auth-form-section">
                  <p className="auth-form-section-title">{authUi.register.step2.sectionProfile}</p>
                <div>
                  <label className="form-label" htmlFor="reg-fullname">
                    이름 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <User className="form-input-icon" />
                    <input
                      id="reg-fullname"
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(e) => patchForm({ fullName: e.target.value })}
                      className="form-input"
                      placeholder="홍길동"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-birth">
                    생년월일 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <Calendar className="form-input-icon" />
                    <input
                      id="reg-birth"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => patchForm({ birthDate: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-email">
                    이메일 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <Mail className="form-input-icon" />
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => patchForm({ email: e.target.value })}
                      className="form-input"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <p className="form-hint">로그인 ID로 사용됩니다.</p>
                </div>
                </div>

                <div className="auth-form-section auth-verify-block">
                  <p className="auth-form-section-title">{authUi.register.step2.sectionPhone}</p>
                <div>
                  <label className="form-label" htmlFor="reg-phone">
                    휴대폰 번호 <span className="auth-required">필수</span>
                  </label>
                  <div className="auth-phone-row">
                    <div className="form-input-wrap auth-phone-input">
                      <Phone className="form-input-icon" />
                      <input
                        id="reg-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => patchForm({ phone: formatPhoneDisplay(e.target.value) })}
                        className="form-input"
                        placeholder="010-0000-0000"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-secondary auth-phone-send"
                      disabled={smsBusy || smsCooldown > 0}
                      onClick={() => void sendSms()}
                    >
                      {smsCooldown > 0 ? `${smsCooldown}초` : "인증번호"}
                    </button>
                  </div>
                  {smsDelivery === "sms" && (
                    <p className="form-hint auth-verified-ok">문자를 발송했습니다. 수신된 6자리 번호를 입력하세요.</p>
                  )}
                  {devCodeHint && (
                    <p className="form-hint auth-dev-code">
                      화면 표시 인증번호: <strong>{devCodeHint}</strong> (SMS 미연동·데모)
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-sms">
                    인증번호 6자리 <span className="auth-required">필수</span>
                  </label>
                  <div className="auth-phone-row">
                    <input
                      id="reg-sms"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.smsCode}
                      onChange={(e) => patchForm({ smsCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      className="form-input-plain auth-sms-input"
                      placeholder="000000"
                    />
                    <button
                      type="button"
                      className="btn-primary auth-phone-send"
                      disabled={smsBusy || phoneVerified}
                      onClick={() => void verifySms()}
                    >
                      {phoneVerified ? "인증됨" : "확인"}
                    </button>
                  </div>
                  {phoneVerified && <p className="form-hint auth-verified-ok">휴대폰 본인확인이 완료되었습니다.</p>}
                </div>
                </div>
              </div>

              <div className="auth-register-actions auth-register-actions--split">
                <button type="button" className="btn-secondary auth-register-btn" onClick={goBack}>
                  이전
                </button>
                <button type="button" className="btn-primary auth-register-btn" onClick={goNext}>
                  다음
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <header className="auth-register-card-head auth-register-card-head--lens">
                <h1 className="auth-lens-title">{authUi.register.step3.title}</h1>
                <p className="auth-lens-desc">{authUi.register.step3.desc}</p>
              </header>

              {error && <div className="form-error">{error}</div>}

              <div className="auth-form-stack">
                <div>
                  <label className="form-label" htmlFor="reg-username">
                    사용자명 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <User className="form-input-icon" />
                    <input
                      id="reg-username"
                      type="text"
                      autoComplete="username"
                      value={form.username}
                      onChange={(e) => patchForm({ username: e.target.value })}
                      className="form-input"
                      placeholder="market_user"
                      required
                    />
                  </div>
                  <p className="form-hint">4~20자, 영문·숫자·밑줄(_)만 사용</p>
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-password">
                    비밀번호 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <Lock className="form-input-icon" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => patchForm({ password: e.target.value })}
                      className="form-input form-input--has-action"
                      placeholder="8자 이상, 영문·숫자·특수문자 조합"
                      required
                    />
                    <button
                      type="button"
                      className="form-input-action"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="auth-pwd-strength" data-level={pwdStrength.level}>
                      <div className="auth-pwd-strength-bar">
                        <span style={{ width: `${(pwdStrength.score / 4) * 100}%` }} />
                      </div>
                      <span className="auth-pwd-strength-label">보안 강도: {pwdStrength.label}</span>
                      <ul className="auth-pwd-checks">
                        {pwdStrength.checks.map((c) => (
                          <li key={c.label} className={c.ok ? "is-ok" : ""}>
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label" htmlFor="reg-confirm">
                    비밀번호 확인 <span className="auth-required">필수</span>
                  </label>
                  <div className="form-input-wrap">
                    <Lock className="form-input-icon" />
                    <input
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => patchForm({ confirmPassword: e.target.value })}
                      className="form-input form-input--has-action"
                      placeholder="비밀번호 다시 입력"
                      required
                    />
                    <button
                      type="button"
                      className="form-input-action"
                      aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.confirmPassword.length > 0 && form.password !== form.confirmPassword && (
                    <p className="form-hint form-hint--error">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>

                <div className="auth-register-actions auth-register-actions--split">
                  <button type="button" className="btn-secondary auth-register-btn" onClick={goBack}>
                    이전
                  </button>
                  <button type="button" className="btn-primary auth-register-btn" onClick={goNext}>
                    다음
                    <ChevronRight size={18} aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <header className="auth-register-card-head auth-register-card-head--lens">
                <h1 className="auth-lens-title">{authUi.register.step4.title}</h1>
                <p className="auth-lens-desc">{authUi.register.step4.desc}</p>
              </header>

              {error && <div className="form-error">{error}</div>}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="auth-form-stack"
              >
                <RegisterAccountFields value={accountForm} onChange={patchAccountForm} />

                <div className="auth-register-actions auth-register-actions--split">
                  <button type="button" className="btn-secondary auth-register-btn" onClick={goBack}>
                    이전
                  </button>
                  <button type="submit" className="btn-primary auth-register-btn">
                    다음 (증권 API)
                    <ChevronRight size={18} aria-hidden />
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 5 && (
            <>
              <header className="auth-register-card-head auth-register-card-head--lens">
                <h1 className="auth-lens-title">{authUi.register.step5.title}</h1>
                <p className="auth-lens-desc">{authUi.register.step5.desc}</p>
              </header>

              {error && <div className="form-error">{error}</div>}

              <form onSubmit={handleFinalSubmit} className="auth-form-stack">
                <RegisterKisLinkStep
                  accountForm={accountForm}
                  kis={kisForm}
                  onKisChange={(patch) => setKisForm((k) => ({ ...k, ...patch }))}
                  onAccountPatch={patchAccountForm}
                />

                <div className="auth-register-actions auth-register-actions--split">
                  <button type="button" className="btn-secondary auth-register-btn" onClick={goBack}>
                    이전
                  </button>
                  <button type="submit" disabled={isLoading} className="btn-primary auth-register-btn">
                    {isLoading ? "가입 처리 중…" : "회원·계좌 가입 완료"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 6 && (
            <div className="auth-register-success">
              <span className="auth-register-success-icon" aria-hidden>
                <Check size={28} />
              </span>
              <h1 className="auth-lens-title text-center">{authUi.register.success.title}</h1>
              <p className="auth-lens-desc text-center mt-2">
                <strong>{form.email}</strong> 계정으로 로그인되었습니다.
                <br />
                {authUi.register.success.bodySuffix}
                {createdAccountId != null && (
                  <>
                    <br />
                    {authUi.register.success.accountCreatedSuffix}
                  </>
                )}
              </p>
              <ul className="auth-lens-success-list" aria-label="이용 가능 기능">
                <li>관심종목 · 가격 알림</li>
                <li>간편 포트폴리오 (서버 저장)</li>
                <li>차트 · 경제 캘린더 · 뉴스</li>
                {createdAccountId != null && <li>등록한 증권 계좌 · 매매 입력</li>}
                {kisLinked && <li>KIS Open API 회원 연동 완료</li>}
              </ul>
              <button type="button" className="btn-primary auth-register-btn w-full mt-6" onClick={() => router.push("/korea")}>
                {authUi.register.success.primaryCta}
              </button>
              {createdAccountId != null ? (
                <Link href={`/accounts/${createdAccountId}`} className="link-accent auth-register-secondary-link">
                  등록한 계좌 열기
                </Link>
              ) : (
                <Link href="/portfolio" className="link-accent auth-register-secondary-link">
                  {authUi.register.success.secondaryCta}
                </Link>
              )}
            </div>
          )}

          {step < 6 && (
            <p className="auth-register-login-prompt">
              이미 계정이 있으신가요?{" "}
              <Link href={buildLoginHref("/korea")} className="link-accent">
                로그인
              </Link>
            </p>
          )}
          </div>

          {step < 6 && (
            <footer className="auth-register-card-foot">
              <p>{authUi.register.footer}</p>
            </footer>
          )}
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} className="auth-term-dialog" onClose={closeTerm}>
        {termDialog && (
          <>
            <header className="auth-term-dialog-head">
              <h2>{termDialog.title}</h2>
              <button type="button" className="auth-term-dialog-close" onClick={closeTerm}>
                닫기
              </button>
            </header>
            <div className="auth-terms-scroll">{AUTH_TERM_SECTIONS[termDialog.key].body}</div>
            <footer className="auth-term-dialog-foot">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  const map: Partial<Record<keyof typeof AUTH_TERM_SECTIONS, ConsentKey>> = {
                    service: "service",
                    privacy: "privacy",
                    finance: "finance",
                    marketing: "marketing",
                  };
                  const c = map[termDialog.key];
                  if (c) toggleConsent(c, true);
                  closeTerm();
                }}
              >
                동의합니다
              </button>
            </footer>
          </>
        )}
      </dialog>
    </div>
  );
}
