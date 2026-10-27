"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio#accounts");
  }, [router]);
  return null;
}
