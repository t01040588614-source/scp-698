import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description:
      "한국·미국 실시간 시세, 차트, 뉴스, 경제 캘린더, 관심목록과 포트폴리오.",
    start_url: "/markets",
    display: "standalone",
    background_color: "#0f1419",
    theme_color: "#2563eb",
    lang: "ko",
    orientation: "any",
    categories: ["finance", "business"],
  };
}
