import Link from "next/link";
import { brand } from "@/config/brand";

/** 시장 페이지 상단 안내 (프로모가 아닌 서비스 소개 톤) */
export default function AppHighlightBar() {
  const { highlight } = brand;
  return (
    <div className="app-highlight-bar" role="region" aria-label="서비스 안내">
      <div className="container app-highlight-bar-inner">
        <span>{highlight.message}</span>
        <Link href={highlight.href}>{highlight.linkLabel}</Link>
      </div>
    </div>
  );
}
