"use client";

import { useRef } from "react";
import InvestingToolRail from "@/components/layout/InvestingToolRail";
import { useViewportPinnedSideColumns } from "@/hooks/useViewportPinnedSideColumns";

type MarketsSplitLayoutProps = {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  showToolRail?: boolean;
};

export default function MarketsSplitLayout({
  main,
  sidebar,
  showToolRail = true,
}: MarketsSplitLayoutProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  useViewportPinnedSideColumns(gridRef, showToolRail ? railRef : { current: null }, asideRef, true);

  return (
    <div
      ref={gridRef}
      className={`inv-layout-3col inv-layout-3col--sticky-sides${showToolRail ? "" : " inv-layout-3col--no-rail"}`}
    >
      {showToolRail && (
        <div className="inv-side-slot inv-side-slot--rail">
          <InvestingToolRail railRef={railRef} />
        </div>
      )}
      <div className="inv-split-main">{main}</div>
      <div className="inv-side-slot inv-side-slot--aside">
        <aside ref={asideRef} className="inv-split-aside" aria-label="시장 위젯">
          <div className="inv-sidebar-stack">{sidebar}</div>
        </aside>
      </div>
    </div>
  );
}
