import type { ReactNode } from "react";
import TossSessionHeader from "@/components/market/TossSessionHeader";

type Props = {
  children: ReactNode;
};

/** 토스증권형 국내 홈 — Investing 브레드크럼·밴드 없음 */
export default function TossPageShell({ children }: Props) {
  return (
    <div className="toss-page-shell">
      <TossSessionHeader />
      {children}
    </div>
  );
}
