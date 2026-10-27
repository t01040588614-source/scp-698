"use client";

import { usePathname } from "next/navigation";
import AppLink from "@/components/common/AppLink";
import { uiConfig } from "@/config/uiConfig";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <div className="primary-navigation-bar">
      <nav className="primary-navigation inv-gnav container" aria-label="주요 메뉴">
        {uiConfig.navigation.primary.map((item) => (
          <AppLink
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </AppLink>
        ))}
      </nav>
    </div>
  );
}
