"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { SYSTEM_STATUS_HREF, goToSystemStatus } from "@/lib/systemStatusNav";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string;
};

export default function SystemStatusLink({
  href = SYSTEM_STATUS_HREF,
  onClick,
  children,
  ...rest
}: Props) {
  const pathname = usePathname() ?? "";

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    goToSystemStatus(pathname);
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
