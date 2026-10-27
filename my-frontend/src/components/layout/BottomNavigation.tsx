"use client";

import { usePathname } from "next/navigation";
import AppLink from "@/components/common/AppLink";
import { uiConfig } from "@/config/uiConfig";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="bottom-navigation flex md:hidden" aria-label="모바일 주요 메뉴">
      {uiConfig.navigation.mobileItems.map((item) => (
        <AppLink
          key={item.id}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          <span aria-hidden="true">{item.short}</span>
          <span>{item.label}</span>
        </AppLink>
      ))}
    </nav>
  );
}
