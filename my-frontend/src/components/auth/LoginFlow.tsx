"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import AuthAside from "@/components/auth/AuthAside";
import AuthServiceNotice from "@/components/auth/AuthServiceNotice";
import AppLogo from "@/components/layout/AppLogo";
import { authUi } from "@/content/authUi";
import { useAuth } from "@/context/AuthContext";
import { fetchOAuthProviders } from "@/services/integrationsApi";

export default function LoginFlow() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: oauthProviders } = useQuery({
    queryKey: ["oauthProviders"],
    queryFn: fetchOAuthProviders,
    retry: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("stock-dashboard-login-email");
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      if (remember && typeof window !== "undefined") {
        localStorage.setItem("stock-dashboard-login-email", email.trim());
      }
      router.push("/korea");
    } catch (err) {
      setError(err instanceof Error ? err.message : "이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-register-page auth-lens">
      <AuthAside />
      <div className="auth-register-main">
        <div className="auth-register-mobile-top auth-register-mobile-top--login">
          <Link href="/korea" className="auth-register-mobile-logo">
            <AppLogo />
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

          {error && <div className="form-error">{error}</div>}

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
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="login-password">
                비밀번호
              </label>
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
            </div>

            <label className="auth-check-row auth-check-row--inline">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>이메일 기억하기</span>
            </label>

            <button type="submit" disabled={isLoading} className="btn-primary auth-register-btn w-full">
              {isLoading ? "로그인 중…" : "로그인"}
            </button>
          </form>

          {(oauthProviders?.length ?? 0) > 0 ? (
            <div className="auth-login-oauth">
              <p className="text-muted-sm text-center">또는 소셜 계정으로 계속</p>
              {oauthProviders?.map((p) => (
                <a key={p.id} href={p.loginUrl} className="btn-secondary w-full block text-center py-2.5">
                  {p.name}로 계속
                </a>
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
          </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
