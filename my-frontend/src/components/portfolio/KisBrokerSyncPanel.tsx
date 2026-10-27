"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function KisBrokerSyncPanel() {
  const { isAuthenticated } = useAuth();

  const snapshot = useQuery({
    queryKey: ["kisSnapshot"],
    queryFn: () => authApi.getMyKisSnapshot(),
    enabled: isAuthenticated,
    retry: false,
  });

  const sync = useMutation({
    mutationFn: () => authApi.syncMyKisSnapshot(),
    onSuccess: () => void snapshot.refetch(),
  });

  if (!isAuthenticated) return null;

  const data = snapshot.data ?? sync.data;

  return (
    <section className="panel p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">KIS 계좌 동기화</h3>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
        >
          {sync.isPending ? "동기화 중…" : "잔고·보유 조회"}
        </button>
      </div>
      <p className="text-muted-sm text-sm">
        저장된 KIS 키·계좌로 예수금과 보유 종목을 가져옵니다. (15분마다 서버 백그라운드 동기화)
      </p>
      {sync.isError && (
        <p className="text-sm">{(sync.error as Error).message}</p>
      )}
      {data?.cashBalance != null ? (
        <p className="text-sm tabular">
          예수금(총): {data.cashBalance.toLocaleString("ko-KR")}원 · 보유{" "}
          {data.holdings?.length ?? 0}종
          {data.syncedAt ? ` · ${new Date(data.syncedAt).toLocaleString("ko-KR")}` : ""}
        </p>
      ) : snapshot.isError && !sync.isPending ? (
        <p className="text-muted-sm text-sm">아직 스냅샷 없음 — 동기화를 실행하세요.</p>
      ) : null}
      {data?.holdings && data.holdings.length > 0 ? (
        <ul className="text-sm space-y-1 max-h-40 overflow-auto">
          {data.holdings.slice(0, 20).map((h) => (
            <li key={h.symbol} className="flex justify-between gap-2 tabular">
              <span>
                {h.name} ({h.symbol})
              </span>
              <span>
                {h.quantity}주 · 평단 {Math.round(h.avgPrice).toLocaleString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
