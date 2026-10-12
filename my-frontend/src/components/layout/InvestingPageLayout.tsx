import MarketPageShell from "@/components/market/MarketPageShell";
import MarketsSplitLayout from "@/components/market/MarketsSplitLayout";
import ResearchSidebar, { type ResearchSidebarOptions } from "@/components/layout/ResearchSidebar";

type Crumb = { label: string; href?: string };

type InvestingPageLayoutProps = {
  breadcrumbs: Crumb[];
  title: string;
  description: string;
  children: React.ReactNode;
  /** @deprecated false — 모든 페이지 양쪽 사이드(도구 레일·위젯) 고정 */
  sidebar?: ResearchSidebarOptions | false;
  /** ResearchSidebar 대신 커스텀 사이드 콘텐츠 */
  sidebarSlot?: React.ReactNode;
  compactHead?: boolean;
};

export default function InvestingPageLayout({
  breadcrumbs,
  title,
  description,
  children,
  sidebar = {},
  sidebarSlot,
  compactHead,
}: InvestingPageLayoutProps) {
  const sidebarNode =
    sidebarSlot ?? <ResearchSidebar {...(sidebar === false ? {} : sidebar)} />;

  return (
    <MarketPageShell
      breadcrumbs={breadcrumbs}
      title={title}
      description={description}
      compactHead={compactHead}
    >
      <MarketsSplitLayout showToolRail main={children} sidebar={sidebarNode} />
    </MarketPageShell>
  );
}
