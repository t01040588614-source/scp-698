"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import AppLogo from "@/components/layout/AppLogo";
import { isPasswordAcceptable } from "@/components/auth/registerValidation";
import { authApi } from "@/lib/api";
import { buildLoginHref } from "@/lib/authNavigation";

export default function ResetPasswordFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fromQuery = params.get("token");
    if (fromQuery) setToken(fromQuery);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    if (!isPasswordAcceptable(password)) {
      setError("비밀번호는 8자 이상이며 영문·숫자·특수문자 중 3가지 이상을 포함해야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(token.trim(), password);
      router.replace(buildLoginHref("/korea", { reset: "ok" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
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
            <header className="auth-register-card-head auth-register-card-head--lens mb-4">
              <h1 className="auth-lens-title">새 비밀번호 설정</h1>
              <p className="auth-lens-desc">재설정 링크의 토큰과 새 비밀번호를 입력하세요.</p>
            </header>

            {error ? (
              <div className="form-error" role="alert">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="reset-token">
                  재설정 토큰
                </label>
                <input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="form-input"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="reset-password">
                  새 비밀번호
                </label>
                <div className="form-input-wrap">
                  <Lock className="form-input-icon" />
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input form-input--has-action"
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
              <div>
                <label className="form-label" htmlFor="reset-confirm">
                  비밀번호 확인
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary auth-register-btn w-full">
                {isLoading ? "저장 중…" : "비밀번호 변경"}
              </button>
            </form>

            <p className="auth-register-login-prompt mt-6">
              <Link href={buildLoginHref("/korea")} className="link-accent">
                로그인으로 돌아가기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
