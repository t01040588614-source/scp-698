import { Suspense } from "react";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="inv-page-desc p-8 text-center">로딩…</p>}>
      <ForgotPasswordFlow />
    </Suspense>
  );
}
