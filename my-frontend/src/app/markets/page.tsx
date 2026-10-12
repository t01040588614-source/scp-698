import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import MarketsPageContent from "@/components/market/MarketsPageContent";

/** MarketLens — 시장 개요 (Investing 스타일) */
export default function MarketsPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "시장 개요" },
      ]}
      title="시장 · 종목"
      description="한국·미국 지수, 종목, 외환·원자재를 한곳에서 확인합니다."
      sidebar={{ market: "korea", showIndicesWidget: true }}
      compactHead
    >
      <MarketsPageContent />
    </InvestingPageLayout>
  );
}
