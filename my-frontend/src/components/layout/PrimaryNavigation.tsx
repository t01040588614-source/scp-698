"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { uiConfig } from "@/config/uiConfig";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <div className="primary-navigation-bar">
      <nav className="primary-navigation inv-gnav container hidden md:flex" aria-label="주요 메뉴">
        {uiConfig.navigation.primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
