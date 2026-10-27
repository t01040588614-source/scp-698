/** 차트·스파크라인 고정 크기 — 화면마다 들쭉날쭉하지 않게 단일 기준 */

export const CHART_HEIGHT = {
  default: 420,
  hubDesktop: 520,
  hubMobile: 340,
  panelDesktop: 560,
  panelMobile: 400,
  embedDesktop: 500,
  embedMobile: 340,
  equityDesktop: 460,
  equityMobile: 360,
  sidebar: 268,
  sidebarCompact: 200,
  stockDetail: 320,
  tossKr: 420,
  portfolioPie: 300,
  account: 250,
} as const;

export const SPARKLINE_SIZE = {
  table: { width: 64, height: 28 },
  mini: { width: 120, height: 36 },
  sidebar: { width: 280, height: 120 },
} as const;

export function chartHeightForViewport(
  variant: "hub" | "panel" | "embed" | "equity",
  mobile: boolean
): number {
  switch (variant) {
    case "hub":
      return mobile ? CHART_HEIGHT.hubMobile : CHART_HEIGHT.hubDesktop;
    case "embed":
      return mobile ? CHART_HEIGHT.embedMobile : CHART_HEIGHT.embedDesktop;
    case "equity":
      return mobile ? CHART_HEIGHT.equityMobile : CHART_HEIGHT.equityDesktop;
    case "panel":
    default:
      return mobile ? CHART_HEIGHT.panelMobile : CHART_HEIGHT.panelDesktop;
  }
}
