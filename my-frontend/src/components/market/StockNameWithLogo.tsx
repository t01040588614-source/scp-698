"use client";

import StockCompanyLogo from "@/components/market/StockCompanyLogo";
import type { ReactNode } from "react";

type StockNameWithLogoProps = {
  market: "korea" | "us";
  symbol: string;
  name: string;
  size?: number;
  className?: string;
  nameClassName?: string;
  children?: ReactNode;
};

/** 회사 로고 + 이름 (표·검색·위젯 공통) */
export default function StockNameWithLogo({
  market,
  symbol,
  name,
  size = 24,
  className = "inv-stock-name-with-logo",
  nameClassName = "inv-name",
  children,
}: StockNameWithLogoProps) {
  return (
    <span className={className}>
      <StockCompanyLogo market={market} symbol={symbol} name={name} size={size} />
      {children ?? <span className={nameClassName}>{name}</span>}
    </span>
  );
}
