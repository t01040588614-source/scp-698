import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "미국 주식",
  description: "NASDAQ · NYSE 시세",
  path: "/us",
});

export default function USLayout({ children }: { children: React.ReactNode }) {
  return children;
}
