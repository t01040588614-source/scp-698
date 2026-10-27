import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

const STATIC_PATHS = [
  "/markets",
  "/korea",
  "/us",
  "/stocks",
  "/charts",
  "/news",
  "/analysis",
  "/calendar",
  "/watchlist",
  "/portfolio",
  "/search",
  "/tools",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/news" ? "hourly" : "daily",
    priority: path === "/markets" || path === "/korea" ? 1 : 0.7,
  }));
}
