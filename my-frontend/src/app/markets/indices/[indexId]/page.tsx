import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import IndexDetailPageContent from "@/components/market/IndexDetailPageContent";
import { seedHubIndexQuote } from "@/lib/hubIndexSeeds";

type PageProps = {
  params: Promise<{ indexId: string }>;
};

export default async function IndexDetailPage({ params }: PageProps) {
  const { indexId } = await params;
  const meta = seedHubIndexQuote(decodeURIComponent(indexId));

  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "시장 개요", href: "/markets" },
        { label: meta.name },
      ]}
      title={meta.name}
      description={`${meta.name} 실시간 시세, 등락, 차트`}
      sidebar={{ market: "korea", showIndicesWidget: true }}
      compactHead
    >
      <IndexDetailPageContent indexId={decodeURIComponent(indexId)} />
    </InvestingPageLayout>
  );
}
