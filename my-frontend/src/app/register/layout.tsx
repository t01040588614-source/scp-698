import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "회원가입",
  description: "MarketLens 회원가입 — 약관 동의, 본인 정보, 계정·보안 설정",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
