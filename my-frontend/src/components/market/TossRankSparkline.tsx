"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStockHistory } from "@/services/chartApi";
import { buildSparklinePath } from "@/lib/sparklinePath";

type Props = {
  symbol: string;
  livePrice?: number;
  positive: boolean;
  enabled?: boolean;
};

const SPARK_W = 64;
const SPARK_H = 28;

export default function TossRankSparkline({ symbol, livePrice, positive, enabled = true }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["toss-spark", symbol],
    queryFn: () =>
      getStockHistory({
        symbol,
        market: "korea",
        period: "1d",
        interval: "5m",
      }),
    staleTime: 45_000,
    refetchInterval: 60_000,
    enabled: enabled && Boolean(symbol),
  });

  const path = useMemo(() => {
    let closes = (data?.points ?? []).map((p) => p.close).filter((n) => Number.isFinite(n));
    if (livePrice !== undefined && Number.isFinite(livePrice)) {
      if (closes.length) closes = [...closes.slice(0, -1), livePrice];
      else closes = [livePrice, livePrice];
    }
    if (closes.length < 2) return "";
    return buildSparklinePath(closes, SPARK_W, SPARK_H);
  }, [data?.points, livePrice]);

  const stroke = positive ? "var(--color-up, #e54545)" : "var(--color-down, #3182f6)";

  if (!enabled) return <span className="toss-rank-spark toss-rank-spark--empty" aria-hidden />;

  return (
    <span className="toss-rank-spark" aria-hidden>
      {isLoading && !path ? (
        <span className="toss-rank-spark-skeleton" />
      ) : path ? (
        <svg
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          width={SPARK_W}
          height={SPARK_H}
          preserveAspectRatio="none"
          className="toss-rank-spark-svg"
        >
          <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="toss-rank-spark-skeleton" />
      )}
    </span>
  );
}
