"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, type MouseEvent } from "react";

function hrefLocation(href: string): { pathname: string; search: string; hash: string } {
  try {
    const url = new URL(href, "http://cursor.local");
    return {
      pathname: url.pathname || "/",
      search: url.search,
      hash: url.hash,
    };
  } catch {
    const [pathPart, rest] = href.split("?");
    const pathname = pathPart?.split("#")[0] || "/";
    const q = rest?.split("#")[0] ?? "";
    const hash = href.includes("#") ? `#${href.split("#").slice(1).join("#")}` : "";
    return { pathname, search: q ? `?${q}` : "", hash };
  }
}

function locationKey(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

/**
 * Next Link 보조 — 오버레이·하이드레이션 꼬임 시에도 SPA 이동을 확실히 한다.
 * Ctrl/Cmd+클릭 등 새 탭은 Link 기본 동작을 유지한다.
 */
export function useAppLinkNavigate() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const next = hrefLocation(href);
      const currentPath = pathname ?? "/";
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const currentHash =
        typeof window !== "undefined" ? window.location.hash : "";
      const currentKey = locationKey(currentPath, currentSearch, currentHash);
      const nextKey = locationKey(next.pathname, next.search, next.hash);
      if (currentKey === nextKey) return;

      e.preventDefault();
      router.push(href);

      // App Router 전환이 멈출 때 전체 이동으로 복구
      window.setTimeout(() => {
        const nowPath = window.location.pathname || "/";
        const nowKey = locationKey(
          nowPath,
          window.location.search,
          window.location.hash
        );
        if (nowKey !== nextKey && !nowPath.startsWith(`${next.pathname}/`)) {
          window.location.assign(href);
        }
      }, 350);
    },
    [pathname, router]
  );
}
