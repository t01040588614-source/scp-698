import AnalysisList from "@/components/analysis/AnalysisList";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "시장 분석",
  description: "산업·매크로·종목 분석 리포트",
  path: "/analysis",
});

export default function AnalysisPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/markets" },
        { label: "분석" },
      ]}
      title="시장 분석"
      description="한국·미국 종목 분석과 산업·매크로·외환 리포트를 탭별로 확인합니다."
      sidebar={{ showCalendar: true, showNews: true }}
    >
      <AnalysisList />
    </InvestingPageLayout>
  );
}
