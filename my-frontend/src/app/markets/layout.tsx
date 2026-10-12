import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "시장 · 종목",
  description: "한국·미국 주식 목록과 시장 개요",
  path: "/markets",
});

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
