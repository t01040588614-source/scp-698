import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "포트폴리오",
  description: "보유 종목과 손익 관리",
  path: "/portfolio",
});

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/korea" },
        { label: "포트폴리오" },
      ]}
      title="포트폴리오"
      description="증권 계좌(매매·현금)와 로그인 간편 보유를 한 화면에서 관리합니다."
      sidebar={{ showRankings: true, showNews: true, showCalendar: true }}
    >
      {children}
    </InvestingPageLayout>
  );
}
