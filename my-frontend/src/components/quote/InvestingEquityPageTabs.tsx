"use client";

type TabItem = { id: string; label: string; href: string; disabled?: boolean };

const PRIMARY: TabItem[] = [
  { id: "general", label: "일반", href: "#overview" },
  { id: "chart", label: "차트", href: "#chart" },
  { id: "news", label: "뉴스 & 분석", href: "#news" },
  { id: "financials", label: "재정 상황", href: "#financials" },
  { id: "technical", label: "기술 분석", href: "#chart" },
  { id: "forum", label: "포럼", href: "#overview", disabled: true },
];

const SUB: TabItem[] = [
  { id: "overview", label: "개요", href: "#overview" },
  { id: "profile", label: "프로필", href: "#financials", disabled: true },
  { id: "ownership", label: "소유권", href: "#overview", disabled: true },
  { id: "historical", label: "과거 데이터", href: "#chart", disabled: true },
  { id: "splits", label: "과거 액면분할", href: "#chart", disabled: true },
  { id: "index", label: "지수 구성요소", href: "#overview", disabled: true },
];

export default function InvestingEquityPageTabs() {
  return (
    <div className="inv-equity-tabs-wrap">
      <nav className="inv-equity-tabs inv-equity-tabs--primary" aria-label="종목 메뉴">
        {PRIMARY.map((tab) =>
          tab.disabled ? (
            <span key={tab.id} className="inv-equity-tab is-disabled">
              {tab.label}
            </span>
          ) : (
            <a
              key={tab.id}
              href={tab.href}
              className={`inv-equity-tab${tab.id === "general" ? " is-active" : ""}`}
            >
              {tab.label}
            </a>
          )
        )}
      </nav>
      <nav className="inv-equity-tabs inv-equity-tabs--sub" aria-label="개요 하위">
        {SUB.map((tab) =>
          tab.disabled ? (
            <span key={tab.id} className="inv-equity-subtab is-disabled">
              {tab.label}
            </span>
          ) : (
            <a
              key={tab.id}
              href={tab.href}
              className={`inv-equity-subtab${tab.id === "overview" ? " is-active" : ""}`}
            >
              {tab.label}
            </a>
          )
        )}
      </nav>
    </div>
  );
}
