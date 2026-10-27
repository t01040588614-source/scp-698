import Link from "next/link";
import WatchlistPanel from "@/components/watchlist/WatchlistPanel";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "관심목록",
  description: "관심 종목 시세와 등락률",
  path: "/watchlist",
});

export default function WatchlistPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "관심목록" },
      ]}
      title="관심목록"
      description="로그인 후 ★로 저장한 관심종목과 계정 포트폴리오를 관리합니다."
      sidebar={{ showRankings: true, showCalendar: true, showNews: false }}
    >
      <div className="panel-header" style={{ marginBottom: "var(--space-3)" }}>
        <Link href="/portfolio" className="panel-action">
          포트폴리오 관리 →
        </Link>
      </div>
      <WatchlistPanel />
    </InvestingPageLayout>
  );
}
