"use client";

import { useEffect, useMemo, useState } from "react";
import {
  canShowStockLogo,
  getStockLogoCandidates,
  resolveLogoMarket,
} from "@/lib/stockLogoUrl";

type StockCompanyLogoProps = {
  market: "korea" | "us";
  symbol: string;
  name: string;
  size?: number;
  className?: string;
};

function logoInitials(symbol: string): string {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return "?";
  if (sym.length <= 4) return sym;
  return sym.slice(0, 3);
}

function StockLogoEmpty({
  size,
  className,
  symbol,
}: {
  size: number;
  className: string;
  symbol: string;
}) {
  const label = logoInitials(symbol);
  const fontSize = Math.max(9, Math.round(size * 0.38));
  return (
    <span
      className={`${className} inv-stock-logo--empty`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden
      title={symbol}
    >
      {label}
    </span>
  );
}

export default function StockCompanyLogo({
  market,
  symbol,
  size = 24,
  className,
}: StockCompanyLogoProps) {
  const effectiveMarket = resolveLogoMarket(market, symbol);
  const candidates = useMemo(
    () => getStockLogoCandidates(effectiveMarket, symbol),
    [effectiveMarket, symbol],
  );
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIndex(0);
    setExhausted(false);
  }, [candidates]);

  const rootClass = ["inv-stock-logo", className].filter(Boolean).join(" ");
  const url = candidates[index];

  if (!canShowStockLogo(symbol)) {
    return null;
  }

  if (!url || exhausted) {
    return <StockLogoEmpty size={size} className={rootClass} symbol={symbol} />;
  }

  const dimensionStyle = { width: size, height: size, minWidth: size, minHeight: size };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={url}
      src={url}
      alt=""
      width={size}
      height={size}
      style={dimensionStyle}
      className={rootClass}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((current) => {
          const next = current + 1;
          if (next < candidates.length) return next;
          setExhausted(true);
          return current;
        });
      }}
    />
  );
}
