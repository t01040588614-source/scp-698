import InvestingNewsBoard from "@/components/news/InvestingNewsBoard";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "주식 시장 뉴스",
  description: "한국·글로벌 주식 시장 헤드라인 (Investing.com 스타일)",
  path: "/news",
});

export default function NewsPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "뉴스", href: "/news" },
        { label: "주식 시장" },
      ]}
      title="주식 시장 뉴스"
      description="RSS 헤드라인 · 한국 주식시장 지수와 함께 확인합니다."
      sidebar={{ market: "korea", showNews: false, showCalendar: true, showRankings: true }}
      compactHead
    >
      <InvestingNewsBoard />
    </InvestingPageLayout>
  );
}
