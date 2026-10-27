"use client";

import Link from "next/link";
import { useAppLinkNavigate } from "@/hooks/useAppLinkNavigate";
import type { ComponentProps } from "react";

function hrefToNavigateTarget(href: ComponentProps<typeof Link>["href"]): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "/";
  const q = href.query;
  if (!q) return path;
  if (typeof q === "string") return `${path}?${q}`;
  const params = new URLSearchParams(q as Record<string, string>);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Next Link + 확실한 SPA 이동 (오버레이·하이드레이션 이슈 대비) */
export default function AppLink({
  href,
  onClick,
  ...rest
}: ComponentProps<typeof Link>) {
  const navigate = useAppLinkNavigate();
  const target = hrefToNavigateTarget(href);

  return (
    <Link
      href={href}
      onClick={(e) => {
        navigate(target)(e);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
