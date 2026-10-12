"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";
import LiveStreamBadge from "@/components/common/LiveStreamBadge";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

function formatAge(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}초 전`;
  return `${Math.floor(sec / 60)}분 ${Math.round(sec % 60)}초 전`;
}

function formatLastError(code: string | null | undefined) {
  if (!code) return null;
  if (code === "yahoo_timeout") {
    return "Yahoo Finance 응답 지연 (한국은 FDR, 미국은 캐시·Yahoo로 계속 표시)";
  }
  if (code === "yahoo_rate_limit") {
    return "Yahoo Finance 요청 제한 (429) — 잠시 후 자동 재시도";
  }
  if (code === "yahoo_empty") {
    return "Yahoo에서 빈 응답 — 참고 시세·FDR 사용 중";
  }
  return code;
}

export default function SystemStatusPanel() {
  const qc = useQueryClient();
  const ws = useMarketWebSocketContext();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => stockApi.getHealth().then((r) => r.data),
    refetchInterval: 15_000,
  });

  const cache = useQuery({
    queryKey: ["marketCacheStatus"],
    queryFn: () => stockApi.getMarketCacheStatus().then((r) => r.data),
    refetchInterval: 5_000,
  });

  const refresh = useMutation({
    mutationFn: () => stockApi.refreshMarketCache().then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketCacheStatus"] });
      void qc.invalidateQueries({ queryKey: ["koreaStocks"] });
      void qc.invalidateQueries({ queryKey: ["usStocks"] });
    },
  });

  if (health.isLoading && cache.isLoading) return <LoadingState rows={3} />;
  if (health.isError && cache.isError) {
    return (
      <ErrorState
        title="백엔드에 연결할 수 없습니다"
        message="stock-backend(8000)와 my-frontend(3000)가 실행 중인지 확인하세요. 프로젝트 루트의 주식대시보드_실행.bat을 사용할 수 있습니다."
        onRetry={() => {
          void health.refetch();
          void cache.refetch();
        }}
      />
    );
  }

  const c = cache.data;
  const stale = c?.cacheAgeSeconds != null && c.cacheAgeSeconds > 45;

  return (
    <section className="panel inv-table-panel system-status-panel" id="system-status">
      <div className="inv-toolbar system-status-toolbar">
        <h2 className="system-status-title">시스템 · 연결 상태</h2>
        <div className="system-status-actions">
          <LiveStreamBadge connected={ws?.isConnected ?? false} showOffline />
          <button
            type="button"
            className="inv-btn inv-btn--ghost"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? "갱신 중…" : "시세 캐시 새로고침"}
          </button>
        </div>
      </div>
      <dl className="system-status-grid">
        <div>
          <dt>API 서버</dt>
          <dd className={health.data?.status === "healthy" ? "is-ok" : "is-warn"}>
            {health.data?.status === "healthy" ? "정상 (8000)" : health.isError ? "오프라인" : "확인 중"}
          </dd>
        </div>
        <div>
          <dt>WebSocket</dt>
          <dd
            className={
              ws?.isConnected && c?.wsBroadcastAlive !== false ? "is-ok" : "is-warn"
            }
          >
            {ws?.isConnected
              ? c?.wsBroadcastAlive === false
                ? "연결됨 · 서버 푸시 중단 (페이지 새로고침 또는 백엔드 재시작)"
                : "연결됨 · 약 1초 푸시"
              : "끊김 · REST 폴링"}
          </dd>
        </div>
        <div>
          <dt>한국 장</dt>
          <dd>
            {c?.krHoliday
              ? `휴장${c.krHolidayName ? ` (${c.krHolidayName})` : ""}`
              : c?.krMarketOpen
                ? "정규장"
                : c?.krSession === "pre"
                  ? "장전"
                  : c?.krSession === "after"
                    ? "장후"
                    : "휴장/프리·애프터"}
          </dd>
        </div>
        <div>
          <dt>미국 장</dt>
          <dd>
            {c?.usHoliday
              ? `휴장${c.usHolidayName ? ` (${c.usHolidayName})` : ""}`
              : c?.usMarketOpen
                ? "정규장"
                : c?.usSession === "pre"
                  ? "프리마켓"
                  : c?.usSession === "after"
                    ? "애프터"
                    : "휴장/프리·애프터"}
          </dd>
        </div>
        <div>
          <dt>종목 캐시</dt>
          <dd>
            KR {c?.koreaCount ?? "—"} · US {c?.usCount ?? "—"} ({c?.koreaSource}/{c?.usSource})
          </dd>
        </div>
        <div>
          <dt>마지막 갱신</dt>
          <dd className={stale ? "is-warn" : undefined}>
            {formatAge(c?.cacheAgeSeconds)}
            {stale ? " · 지연 — 새로고침 권장" : ""}
          </dd>
        </div>
      </dl>
      {c?.message ? <p className="system-status-note">{c.message}</p> : null}
      {c?.lastError ? (
        <p className="system-status-error">최근 오류: {formatLastError(c.lastError)}</p>
      ) : null}
    </section>
  );
}
