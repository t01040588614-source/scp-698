"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "@/services/accountsApi";

import { CHART_HEIGHT } from "@/config/chartLayout";
import { layoutTimeScaleFit } from "@/lib/chartTimeScaleFit";
import { clearLightweightChartsReloadFlag, loadLightweightCharts } from "@/lib/loadLightweightCharts";

/** DOCX AccountAssetChart — lightweight-charts 라인 */
export default function AccountAssetChartLightweight({ accountId }: { accountId: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartLibError, setChartLibError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["account-snapshots-lwc", accountId],
    queryFn: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      return accountsApi.snapshots(accountId, from, to);
    },
  });

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;
    let disposed = false;
    let chart: { remove: () => void } | null = null;

    setChartLibError(null);
    void loadLightweightCharts()
      .then(({ createChart }) => {
        if (disposed || !containerRef.current) return;
        clearLightweightChartsReloadFlag();
        const el = containerRef.current;
        const c = createChart(el, { width: el.clientWidth, height: CHART_HEIGHT.account });
        chart = c;
        const line = c.addLineSeries({ color: "#2563eb", lineWidth: 2 });
        const series = data
          .filter((d) => d.totalAsset != null)
          .map((d) => ({ time: d.date, value: d.totalAsset as number }));
        line.setData(series);
        layoutTimeScaleFit(c, el.clientWidth, series.length, false, { period: "3m" });
      })
      .catch(() => {
        if (!disposed) setChartLibError("차트 모듈 로드 실패");
      });

    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [data]);

  if (chartLibError) {
    return (
      <p className="text-sm text-muted" role="alert">
        {chartLibError}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: CHART_HEIGHT.account,
        minHeight: CHART_HEIGHT.account,
        maxHeight: CHART_HEIGHT.account,
      }}
    />
  );
}
