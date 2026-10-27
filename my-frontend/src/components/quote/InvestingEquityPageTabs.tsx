"use client";

import {
  hashForPrimary,
  hashForSub,
  type EquityPrimaryTabId,
  type EquitySubTabId,
} from "@/hooks/useEquityPageHash";

type TabItem = { id: EquityPrimaryTabId; label: string; disabled?: boolean };

const PRIMARY: (TabItem | { id: "forum"; label: string; disabled: true })[] = [
  { id: "general", label: "일반" },
  { id: "chart", label: "차트" },
  { id: "news", label: "뉴스 & 분석" },
  { id: "financials", label: "재정 상황" },
  { id: "technical", label: "기술 분석" },
  { id: "forum", label: "포럼", disabled: true },
];

const SUB: { id: EquitySubTabId; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "profile", label: "프로필" },
  { id: "ownership", label: "소유권" },
  { id: "historical", label: "과거 데이터" },
  { id: "splits", label: "과거 액면분할" },
  { id: "index", label: "지수 구성요소" },
];

type Props = {
  primary: EquityPrimaryTabId;
  sub: EquitySubTabId;
  onNavigate: (hash: string) => void;
};

function TabButton({
  className,
  active,
  disabled,
  onClick,
  children,
}: {
  className: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className={`${className} is-disabled`}>{children}</span>;
  }
  return (
    <button
      type="button"
      className={`${className}${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

export default function InvestingEquityPageTabs({ primary, sub, onNavigate }: Props) {
  return (
    <div className="inv-equity-tabs-wrap">
      <nav className="inv-equity-tabs inv-equity-tabs--primary" aria-label="종목 메뉴">
        {PRIMARY.map((tab) =>
          tab.id === "forum" ? (
            <span key="forum" className="inv-equity-tab is-disabled">
              {tab.label}
            </span>
          ) : (
            <TabButton
              key={tab.id}
              className="inv-equity-tab"
              active={primary === tab.id}
              disabled={"disabled" in tab && tab.disabled}
              onClick={() => onNavigate(hashForPrimary(tab.id))}
            >
              {tab.label}
            </TabButton>
          )
        )}
      </nav>
      <nav className="inv-equity-tabs inv-equity-tabs--sub" aria-label="개요 하위">
        {SUB.map((tab) => (
          <TabButton
            key={tab.id}
            className="inv-equity-subtab"
            active={primary === "general" && sub === tab.id}
            onClick={() => onNavigate(hashForSub(tab.id))}
          >
            {tab.label}
          </TabButton>
        ))}
      </nav>
    </div>
  );
}
