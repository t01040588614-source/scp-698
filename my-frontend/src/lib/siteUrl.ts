/** 공개 사이트 origin (메타·OG·canonical) */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (raw?.startsWith("http")) return raw;
  return "http://127.0.0.1:3000";
}
