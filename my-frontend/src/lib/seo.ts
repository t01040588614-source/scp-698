import type { Metadata } from "next";
import { brand } from "@/config/brand";

const siteName = brand.name;
const defaultDescription =
  "시장 데이터, 금융 뉴스, 차트, 경제 캘린더, 관심목록을 웹과 모바일에서 확인하세요.";

export function createPageMetadata({
  title,
  description = defaultDescription,
  path = "",
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const fullTitle = `${title} - ${siteName}`;
  const url = path ? `https://example.com${path}` : undefined;

  return {
    title: fullTitle,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      locale: "ko_KR",
      siteName,
      url,
    },
  };
}
