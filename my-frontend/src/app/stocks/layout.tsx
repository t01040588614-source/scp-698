import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "종목 스크리너",
  description: "필터·정렬·스크리너 저장으로 한국 종목을 찾아보세요.",
  path: "/stocks",
});

export default function StocksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
