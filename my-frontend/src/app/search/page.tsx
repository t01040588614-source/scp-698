import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import SearchPageContent from "@/components/search/SearchPageContent";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "종목 검색",
  description: "한국·미국 종목 검색 결과",
  path: "/search",
});

export default function SearchPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "검색" },
      ]}
      title="종목 검색"
      description="종목명·심볼로 시세 페이지로 이동합니다."
      sidebar={{ showNews: false, showCalendar: true, showRankings: true }}
    >
      <SearchPageContent />
    </InvestingPageLayout>
  );
}
