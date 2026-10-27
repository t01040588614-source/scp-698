export const LOGIN_EMAIL_STORAGE_KEY = "stock-dashboard-login-email";
export const AUTH_POST_LOGIN_KEY = "auth:postLogin";
export const DEFAULT_POST_LOGIN_PATH = "/korea";

/** Open redirect 방지 — 동일 origin 상대 경로만 허용 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  const pathname = raw.split("?")[0] ?? raw;
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  if (pathname === "/register" || pathname.startsWith("/register/")) return null;
  return raw;
}

export function resolvePostLoginPath(next: string | null | undefined): string {
  return sanitizeNextPath(next) ?? DEFAULT_POST_LOGIN_PATH;
}

export function buildLoginHref(returnPath: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  const next = sanitizeNextPath(returnPath);
  if (next) params.set("next", next);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

/** OAuth 등 실패 시 — sessionStorage는 유지한 채 next만 읽음 */
export function peekStoredPostLoginPath(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_POST_LOGIN_KEY);
}

export function readStoredPostLoginPath(): string {
  if (typeof window === "undefined") return DEFAULT_POST_LOGIN_PATH;
  const stored = sessionStorage.getItem(AUTH_POST_LOGIN_KEY);
  sessionStorage.removeItem(AUTH_POST_LOGIN_KEY);
  return resolvePostLoginPath(stored);
}

export function buildLoginOAuthErrorHref(): string {
  return buildLoginHref(peekStoredPostLoginPath() ?? "", { error: "oauth" });
}

export const LOGIN_QUERY_ERRORS: Record<string, string> = {
  oauth: "소셜 로그인에 실패했습니다. 다시 시도하거나 이메일로 로그인해 주세요.",
  session: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
};
