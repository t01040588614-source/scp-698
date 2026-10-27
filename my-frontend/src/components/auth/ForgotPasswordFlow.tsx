"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import AppLogo from "@/components/layout/AppLogo";
import AuthServiceNotice from "@/components/auth/AuthServiceNotice";
import { authApi } from "@/lib/api";
import { buildLoginHref } from "@/lib/authNavigation";

export default function ForgotPasswordFlow() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const loginBackHref = nextParam
    ? buildLoginHref(nextParam)
    : buildLoginHref("/korea");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setMessage("");
    setDevToken(null);
    setIsLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email.trim());
      setMessage(res.message);
      if (res.devResetToken) setDevToken(res.devResetToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-register-page auth-lens min-h-screen flex items-center justify-center p-4">
      <div className="auth-register-main w-full max-w-md">
        <div className="auth-register-mobile-top auth-register-mobile-top--login">
          <Link href="/korea" className="auth-register-mobile-logo">
            <AppLogo link={false} />
          </Link>
        </div>
        <div className="auth-register-card auth-register-card--login">
          <div className="auth-register-card-body">
            <AuthServiceNotice />
            <header className="auth-register-card-head auth-register-card-head--lens mb-4">
              <h1 className="auth-lens-title">비밀번호 찾기</h1>
              <p className="auth-lens-desc">가입한 이메일로 재설정 안내를 보냅니다.</p>
            </header>

            {error ? (
              <div className="form-error" role="alert">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="form-notice mb-4" role="status">
                {message}
                {devToken ? (
                  <p className="text-muted-sm mt-2">
                    (개발 모드){" "}
                    <Link href={`/login/reset-password?token=${encodeURIComponent(devToken)}`} className="link-accent">
                      재설정 페이지로 이동
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="forgot-email">
                  이메일
                </label>
                <div className="form-input-wrap">
                  <Mail className="form-input-icon" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary auth-register-btn w-full">
                {isLoading ? "전송 중…" : "재설정 안내 받기"}
              </button>
            </form>

            <p className="auth-register-login-prompt mt-6">
              <Link href={loginBackHref} className="link-accent">
                로그인으로 돌아가기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
