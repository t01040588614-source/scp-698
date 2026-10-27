import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { getSiteUrl } from "@/lib/siteUrl";

const siteName = brand.name;
const defaultDescription =
  "한국·미국 실시간 시세, 차트, 금융 뉴스, 경제 캘린더, 관심목록과 포트폴리오를 한곳에서 확인하세요.";

export function pageTitle(segment: string): string {
  return `${segment} · ${siteName}`;
}

export function createPageMetadata({
  title,
  description = defaultDescription,
  path = "",
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const fullTitle = pageTitle(title);
  const base = getSiteUrl();
  const url = path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : undefined;

  const ogImage = `${base}/og-marketlens.svg`;

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: pageTitle(brand.tagline) }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

export const rootSiteDescription = defaultDescription;
