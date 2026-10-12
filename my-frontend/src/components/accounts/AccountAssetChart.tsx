"use client";

import { useQuery } from "@tanstack/react-query";
import { CHART_HEIGHT } from "@/config/chartLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { accountsApi } from "@/services/accountsApi";

export default function AccountAssetChart({ accountId }: { accountId: number }) {
  const { data } = useQuery({
    queryKey: ["account-snapshots", accountId],
    queryFn: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      return accountsApi.snapshots(accountId, from, to);
    },
  });

  const points = (data ?? [])
    .filter((d) => d.totalAsset != null)
    .map((d) => ({ date: d.date.slice(5), total: d.totalAsset as number }));

  if (points.length === 0) {
    return <p className="inv-page-desc">스냅샷 데이터가 없습니다. 매매 후 갱신됩니다.</p>;
  }

  return (
    <div
      className="inv-account-chart"
      style={{
        width: "100%",
        height: CHART_HEIGHT.account,
        minHeight: CHART_HEIGHT.account,
        maxHeight: CHART_HEIGHT.account,
      }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.account}>
        <LineChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
          <Tooltip formatter={(v: number) => [`${v.toLocaleString("ko-KR")}원`, "총자산"]} />
          <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
