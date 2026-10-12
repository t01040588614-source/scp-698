"use client";

type TabId = "overview" | "chart" | "news" | "financials";

const TABS: { id: TabId; label: string; hash: string }[] = [
  { id: "overview", label: "개요", hash: "#overview" },
  { id: "chart", label: "차트", hash: "#chart" },
  { id: "news", label: "뉴스", hash: "#news" },
  { id: "financials", label: "재무", hash: "#financials" },
];

type Props = {
  active?: TabId;
};

export default function InvestingEquityNavTabs({ active = "overview" }: Props) {
  return (
    <nav className="inv-equity-nav" aria-label="종목 섹션">
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={tab.hash}
          className={`inv-equity-nav-tab${active === tab.id ? " is-active" : ""}`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
