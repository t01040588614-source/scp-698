import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "한국 주식",
  description: "KOSPI·KOSDAQ 종목 시세와 등락률",
  path: "/korea",
});

export default function KoreaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
