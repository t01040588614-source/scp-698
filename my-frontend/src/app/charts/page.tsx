import ChartPanel from "@/components/chart/ChartPanel";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";

export default function ChartsPage() {
  return (
    <InvestingPageLayout
      compactHead
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "차트" },
      ]}
      title="차트"
      description="종목 차트 · 기간별 수익률 · 기술적 분석"
      sidebar={{ showIndicesWidget: true }}
    >
      <ChartPanel showSymbolPicker />
    </InvestingPageLayout>
  );
}
