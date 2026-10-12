"use client";

import Link from "next/link";
import KoreaEquitiesBoard from "@/components/market/KoreaEquitiesBoard";

export default function HomePageContent() {
  return (
    <div className="container page-section inv-equities-page">
      <header className="inv-page-head">
        <ol className="inv-breadcrumb">
          <li>홈</li>
          <li>시장</li>
          <li>
            <Link href="/korea">한국 주식</Link>
          </li>
        </ol>
        <h1 className="inv-page-title">한국 주식</h1>
        <p className="inv-page-desc">
          시세·등락률·거래량과 시장 위젯을 한 화면에서 확인합니다.
        </p>
      </header>

      <KoreaEquitiesBoard />
    </div>
  );
}
