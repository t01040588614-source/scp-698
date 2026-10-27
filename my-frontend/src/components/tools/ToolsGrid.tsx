"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import SystemStatusLink from "@/components/navigation/SystemStatusLink";
import { SYSTEM_STATUS_HREF } from "@/lib/systemStatusNav";
import { getToolsList } from "@/services/toolsApi";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

export default function ToolsGrid() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["toolsList"],
    queryFn: () => getToolsList(),
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <section className="panel inv-table-panel">
      <div className="inv-toolbar">
        <span className="inv-toolbar-meta">시장 데이터·분석·포트폴리오 도구 모음</span>
      </div>
      <div className="inv-tools-grid">
        {data?.data.map((tool) => {
          const card = (
            <>
              <span className="inv-tool-icon" aria-hidden>
                ◆
              </span>
              <h3 className="inv-tool-name">{tool.name}</h3>
              <p className="inv-tool-desc">{tool.desc}</p>
              <span className="inv-tool-link">열기 →</span>
            </>
          );
          if (tool.href === SYSTEM_STATUS_HREF) {
            return (
              <SystemStatusLink key={tool.id} href={tool.href} className="inv-tool-card">
                {card}
              </SystemStatusLink>
            );
          }
          return (
            <Link key={tool.id} href={tool.href} className="inv-tool-card">
              {card}
            </Link>
          );
        })}
      </div>
      <footer className="inv-table-footer">
        <span>
          상단 <strong>시스템 · 연결 상태</strong>에서 API·WebSocket·캐시를 확인할 수 있습니다.
        </span>
      </footer>
    </section>
  );
}
