"use client";

import Link from "next/link";
import { useId } from "react";
import { brand } from "@/config/brand";
import BrandMarkSvg from "@/components/brand/BrandMarkSvg";

type AppLogoProps = {
  onClick?: () => void;
  className?: string;
  /** false — Link 없이 마크업만 (바깥 Link 래핑·중첩 <a> 방지) */
  link?: boolean;
  /** 브랜드 그라데이션 패널(로그인·가입 aside) — 밝은 워드마크, 하단 태그 숨김 */
  variant?: "default" | "onBrand";
};

/** 헤더 브랜드 — 차트·캔들 마크 + 워드마크 */
export default function AppLogo({
  onClick,
  className = "",
  link = true,
  variant = "default",
}: AppLogoProps) {
  const gradId = useId().replace(/:/g, "");
  const onBrand = variant === "onBrand";
  const rootClass = `app-logo ${onBrand ? "app-logo--on-brand" : ""} ${className}`.trim();

  const inner = (
    <>
      <span className="app-logo-mark" aria-hidden>
        <BrandMarkSvg size={32} gradId={gradId} className="app-logo-svg" />
      </span>
      <span className="app-logo-text">
        <span className="app-logo-name">
          <span className="app-logo-name-lead">{brand.wordmark.lead}</span>
          <span className="app-logo-name-accent">{brand.wordmark.accent}</span>
        </span>
        {!onBrand ? <span className="app-logo-tag">{brand.tagline}</span> : null}
      </span>
    </>
  );

  if (!link) {
    return (
      <div className={rootClass} onClick={onClick} role="img" aria-label={`${brand.name} 로고`}>
        {inner}
      </div>
    );
  }

  return (
    <Link className={rootClass} href="/korea" onClick={onClick} aria-label={`${brand.name} 홈`}>
      {inner}
    </Link>
  );
}
