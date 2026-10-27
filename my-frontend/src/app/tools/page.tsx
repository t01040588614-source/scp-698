import ToolsGrid from "@/components/tools/ToolsGrid";
import ToolsHashScroll from "@/components/tools/ToolsHashScroll";
import SystemStatusPanel from "@/components/tools/SystemStatusPanel";
import QuoteRefreshSettingsPanel from "@/components/tools/QuoteRefreshSettingsPanel";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "투자 도구",
  description: "스크리너, 계산기 등 투자 도구 모음",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "도구" },
      ]}
      title="투자 도구"
      description="스크리너, API 연동, 시스템·연결됨 상태를 확인합니다."
      sidebar={{ showCalendar: false, showNews: true }}
    >
      <div className="tools-page-stack">
        <ToolsHashScroll />
        <SystemStatusPanel />
        <QuoteRefreshSettingsPanel />
        <ToolsGrid />
      </div>
    </InvestingPageLayout>
  );
}
