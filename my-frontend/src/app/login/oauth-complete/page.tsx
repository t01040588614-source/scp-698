"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function OAuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokenFromOAuth } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.replace("/login?error=oauth");
      return;
    }
    setTokenFromOAuth(token);
    router.replace("/");
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
