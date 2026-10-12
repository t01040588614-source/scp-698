"use client";

import Link from "next/link";
import { useId } from "react";
import { brand } from "@/config/brand";

type AppLogoProps = {
  onClick?: () => void;
  className?: string;
  /** 브랜드 그라데이션 패널(로그인·가입 aside) — 밝은 워드마크, 하단 태그 숨김 */
  variant?: "default" | "onBrand";
};

/** 헤더 브랜드 — 차트·캔들 마크 + 워드마크 */
export default function AppLogo({ onClick, className = "", variant = "default" }: AppLogoProps) {
  const gradId = useId().replace(/:/g, "");
  const onBrand = variant === "onBrand";

  return (
    <Link
      className={`app-logo ${onBrand ? "app-logo--on-brand" : ""} ${className}`.trim()}
      href="/korea"
      onClick={onClick}
      aria-label={`${brand.name} 홈`}
    >
      <span className="app-logo-mark" aria-hidden>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="app-logo-svg"
        >
          <defs>
            <linearGradient id={gradId} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6eb4ff" />
              <stop stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
          <path
            d="M4 12.5C4 8.91 6.91 6 10.5 6H21.5C25.09 6 28 8.91 28 12.5V19.5C28 23.09 25.09 26 21.5 26H10.5C6.91 26 4 23.09 4 19.5V12.5Z"
            fill="white"
            fillOpacity="0.1"
          />
          <rect x="9" y="19" width="2" height="5" rx="0.5" fill="white" fillOpacity="0.45" />
          <rect x="9" y="17.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
          <rect x="13.5" y="20" width="2" height="4" rx="0.5" fill="white" fillOpacity="0.45" />
          <rect x="13.5" y="18.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
          <rect x="18" y="18" width="2" height="6" rx="0.5" fill="white" fillOpacity="0.45" />
          <rect x="18" y="16.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
          <path
            d="M8 21.5L12.5 17.5L16.5 19L23.5 12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="23.5" cy="12" r="2" fill="white" />
        </svg>
      </span>
      <span className="app-logo-text">
        <span className="app-logo-name">
          <span className="app-logo-name-lead">{brand.wordmark.lead}</span>
          <span className="app-logo-name-accent">{brand.wordmark.accent}</span>
        </span>
        {!onBrand ? <span className="app-logo-tag">{brand.tagline}</span> : null}
      </span>
    </Link>
  );
}
