import IntegrationsPanel from "@/components/tools/IntegrationsPanel";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "API 키 연동",
  description: "증권사·OAuth·뉴스 API 키 설정",
  path: "/tools/integrations",
});

export default function IntegrationsPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "도구", href: "/tools" },
        { label: "API 키" },
      ]}
      title="API 키 연동"
      description="키만 입력하면 한국투자증권 시세, Alpha/Finnhub, Google·Kakao 로그인, NewsAPI, FCM, AI 챗봇(OpenAI/Gemini)이 자동 활성화됩니다."
      sidebar={{ showNews: true, showCalendar: false }}
    >
      <IntegrationsPanel />
    </InvestingPageLayout>
  );
}
