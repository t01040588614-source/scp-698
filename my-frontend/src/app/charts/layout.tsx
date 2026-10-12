import { Suspense } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "차트",
  description: "종목 차트와 기술적 분석",
  path: "/charts",
});

export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
