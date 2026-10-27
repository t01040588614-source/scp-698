import { Suspense } from "react";
import LoginFlow from "@/components/auth/LoginFlow";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="inv-page-desc p-8 text-center">로딩…</p>}>
      <LoginFlow />
    </Suspense>
  );
}
