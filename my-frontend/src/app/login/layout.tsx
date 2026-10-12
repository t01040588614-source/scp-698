import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "로그인",
  description: "MarketLens account sign-in",
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
