"use client";

import { useRef } from "react";
import InvestingToolRail from "@/components/layout/InvestingToolRail";
import { useViewportPinnedSideColumns } from "@/hooks/useViewportPinnedSideColumns";

type MarketsSplitLayoutProps = {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  showToolRail?: boolean;
  /** inv-sidebar-stack 추가 클래스 (종목 상세 등) */
  sidebarStackClassName?: string;
};

export default function MarketsSplitLayout({
  main,
  sidebar,
  showToolRail = true,
  sidebarStackClassName,
}: MarketsSplitLayoutProps) {
  const isEquityQuoteLayout =
    sidebarStackClassName === "inv-sidebar-stack--equity-quote";
  const gridRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const asideSlotRef = useRef<HTMLDivElement>(null);

  /* fixed pin은 좌표 오류 시 본문·버튼 클릭을 막을 수 있어 CSS sticky만 사용 */
  useViewportPinnedSideColumns(
    gridRef,
    showToolRail ? railRef : { current: null },
    asideRef,
    asideSlotRef,
    false
  );

  return (
    <div
      ref={gridRef}
      className={`inv-layout-3col inv-layout-3col--sticky-sides${showToolRail ? "" : " inv-layout-3col--no-rail"}${isEquityQuoteLayout ? " inv-layout-3col--equity-quote inv-layout-3col--equity-float-aside" : ""}`}
    >
      {showToolRail && (
        <div className="inv-side-slot inv-side-slot--rail">
          <InvestingToolRail railRef={railRef} />
        </div>
      )}
      <div className="inv-split-main">{main}</div>
      <div ref={asideSlotRef} className="inv-side-slot inv-side-slot--aside">
        <aside
          ref={asideRef}
          className={`inv-split-aside${isEquityQuoteLayout ? " inv-split-aside--equity-quote" : ""}`}
          aria-label="시장 위젯"
        >
          <div
            className={
              sidebarStackClassName
                ? `inv-sidebar-stack ${sidebarStackClassName}`
                : "inv-sidebar-stack"
            }
          >
            {sidebar}
          </div>
        </aside>
      </div>
    </div>
  );
}
