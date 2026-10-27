"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import AuthAside from "@/components/auth/AuthAside";
import AuthServiceNotice from "@/components/auth/AuthServiceNotice";
import AppLogo from "@/components/layout/AppLogo";
import { authUi } from "@/content/authUi";
import { useAuth } from "@/context/AuthContext";
import {
  AUTH_POST_LOGIN_KEY,
  LOGIN_EMAIL_STORAGE_KEY,
  LOGIN_QUERY_ERRORS,
  resolvePostLoginPath,
} from "@/lib/authNavigation";
import { fetchOAuthProviders } from "@/services/integrationsApi";

export default function LoginFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const nextParam = searchParams.get("next");
  const postLoginPath = resolvePostLoginPath(nextParam);

  const { data: oauthProviders } = useQuery({
    queryKey: ["oauthProviders"],
    queryFn: fetchOAuthProviders,
    retry: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LOGIN_EMAIL_STORAGE_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code && LOGIN_QUERY_ERRORS[code]) {
      setError(LOGIN_QUERY_ERRORS[code]);
    }
    if (searchParams.get("reset") === "ok") {
      setNotice("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(postLoginPath);
    }
  }, [authLoading, isAuthenticated, postLoginPath, router]);

  const busy = isLoading || oauthBusy || authLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      if (typeof window !== "undefined") {
        if (remember) {
          localStorage.setItem(LOGIN_EMAIL_STORAGE_KEY, email.trim());
        } else {
          localStorage.removeItem(LOGIN_EMAIL_STORAGE_KEY);
        }
      }
      router.push(postLoginPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const startOAuth = (loginUrl: string) => {
    if (busy) return;
    setOauthBusy(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(AUTH_POST_LOGIN_KEY, postLoginPath);
    }
    window.location.href = loginUrl;
  };

  if (!authLoading && isAuthenticated) {
    return <p className="inv-page-desc p-8 text-center">이동 중…</p>;
  }

  return (
    <div className="auth-register-page auth-lens">
      <AuthAside />
      <div className="auth-register-main">
        <div className="auth-register-mobile-top auth-register-mobile-top--login">
          <Link href="/korea" className="auth-register-mobile-logo">
            <AppLogo link={false} />
          </Link>
        </div>
        <div className="auth-register-card auth-register-card--login">
          <div className="auth-register-card-ribbon">
            <p className="auth-register-card-ribbon-kicker">{authUi.login.ribbonKicker}</p>
            <h2 className="auth-register-card-ribbon-title">{authUi.login.ribbonTitle}</h2>
          </div>
          <div className="auth-register-card-body">
            <AuthServiceNotice />
            <header className="auth-register-card-head auth-register-card-head--lens">
              <h1 className="auth-lens-title">{authUi.login.title}</h1>
              <p className="auth-lens-desc">{authUi.login.desc}</p>
            </header>

            {notice ? (
              <div className="form-notice mb-3" role="status">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="login-email">
                  이메일
                </label>
                <div className="form-input-wrap">
                  <Mail className="form-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="name@example.com"
                    required
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="form-label" htmlFor="login-password">
                    비밀번호
                  </label>
                  <Link
                    href={
                      nextParam
                        ? `/login/forgot-password?next=${encodeURIComponent(nextParam)}`
                        : "/login/forgot-password"
                    }
                    className="text-muted-sm link-accent"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
                <div className="form-input-wrap">
                  <Lock className="form-input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input form-input--has-action"
                    placeholder="비밀번호 입력"
                    required
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="form-input-action"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="auth-check-row auth-check-row--inline">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={busy}
                />
                <span>이메일 기억하기</span>
              </label>

              <button type="submit" disabled={busy} className="btn-primary auth-register-btn w-full">
                {isLoading ? "로그인 중…" : oauthBusy ? "소셜 로그인 이동 중…" : "로그인"}
              </button>
            </form>

            {(oauthProviders?.length ?? 0) > 0 ? (
              <div className="auth-login-oauth">
                <p className="text-muted-sm text-center">또는 소셜 계정으로 계속</p>
                {oauthProviders?.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    className="btn-secondary w-full block text-center py-2.5"
                    onClick={() => startOAuth(p.loginUrl)}
                  >
                    {p.name}로 계속
                  </button>
                ))}
              </div>
            ) : null}

            <p className="auth-register-login-prompt">
              계정이 없으신가요?{" "}
              <Link href="/register" className="link-accent">
                회원가입
              </Link>
            </p>
            <p className="text-muted-sm text-center mt-2">
              <Link href="/tools/integrations" className="link-accent">
                API 키 연동
              </Link>
            </p>
            <footer className="auth-register-card-foot">
              <p>{authUi.login.footer}</p>
              <p className="auth-register-card-foot-sub">{authUi.login.integrationsHint}</p>
              <p className="auth-register-card-foot-sub mt-2">
                <Link href="/legal/terms" className="link-accent">
                  이용약관
                </Link>
                {" · "}
                <Link href="/legal/privacy" className="link-accent">
                  개인정보처리방침
                </Link>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
