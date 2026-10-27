"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SYSTEM_STATUS_ID, SYSTEM_STATUS_PATH, scrollToSystemStatusPanel } from "@/lib/systemStatusNav";

/** /tools#system-status 진입 시 헤더 아래로 스크롤 (App Router 해시 네비 보완) */
export default function ToolsHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== SYSTEM_STATUS_PATH) return;

    const sync = () => {
      if (window.location.hash.replace(/^#/, "") === SYSTEM_STATUS_ID) {
        scrollToSystemStatusPanel();
      }
    };

    sync();
    const delayed = window.setTimeout(sync, 120);
    window.addEventListener("hashchange", sync);
    return () => {
      window.clearTimeout(delayed);
      window.removeEventListener("hashchange", sync);
    };
  }, [pathname]);

  return null;
}
