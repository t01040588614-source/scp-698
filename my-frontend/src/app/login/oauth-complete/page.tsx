"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { buildLoginOAuthErrorHref, readStoredPostLoginPath } from "@/lib/authNavigation";

function OAuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokenFromOAuth } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const token = params.get("token");
    const refresh = params.get("refresh");
    if (!token) {
      router.replace(buildLoginOAuthErrorHref());
      return;
    }
    (async () => {
      try {
        await setTokenFromOAuth(token, refresh);
        if (!cancelled) router.replace(readStoredPostLoginPath());
      } catch {
        if (!cancelled) router.replace(buildLoginOAuthErrorHref());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router, setTokenFromOAuth]);

  return <p className="inv-page-desc p-8 text-center">로그인 처리 중…</p>;
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<p className="inv-page-desc p-8">로딩…</p>}>
      <OAuthCompleteInner />
    </Suspense>
  );
}
