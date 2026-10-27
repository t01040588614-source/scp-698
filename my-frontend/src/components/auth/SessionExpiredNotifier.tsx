"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { buildLoginHref } from "@/lib/authNavigation";

export default function SessionExpiredNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const { clearSession } = useAuth();
  const redirectingRef = useRef(false);

  useEffect(() => {
    const onExpired = () => {
      if (redirectingRef.current) return;
      if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) return;
      redirectingRef.current = true;
      clearSession();
      const returnPath = `${pathname ?? "/"}${search ? `?${search}` : ""}`;
      router.replace(buildLoginHref(returnPath, { error: "session" }));
    };
    window.addEventListener("auth:session-expired", onExpired);
    return () => window.removeEventListener("auth:session-expired", onExpired);
  }, [clearSession, pathname, router, search]);

  return null;
}
