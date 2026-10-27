import { Suspense } from "react";
import ResetPasswordFlow from "@/components/auth/ResetPasswordFlow";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="inv-page-desc p-8 text-center">로딩…</p>}>
      <ResetPasswordFlow />
    </Suspense>
  );
}
