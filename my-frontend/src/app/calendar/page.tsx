import EconomicCalendar from "@/components/calendar/EconomicCalendar";
import InvestingPageLayout from "@/components/layout/InvestingPageLayout";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "경제 캘린더",
  description: "주요 경제 이벤트 일정",
  path: "/calendar",
});

export default function CalendarPage() {
  return (
    <InvestingPageLayout
      breadcrumbs={[
        { label: "홈", href: "/" },
        { label: "경제 캘린더" },
      ]}
      title="경제 캘린더"
      description="국가·중요도별 필터로 FOMC, 고용, 물가 등 주요 이벤트를 추적합니다."
      sidebar={{ showCalendar: false, showNews: true }}
    >
      <EconomicCalendar hideShell />
    </InvestingPageLayout>
  );
}
