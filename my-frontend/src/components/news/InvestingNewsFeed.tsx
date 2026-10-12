"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNewsList, type NewsListResponse } from "@/services/newsApi";
import type { NewsItem } from "@/data/mockData";
import { formatRelativeTime } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
const PLACEHOLDER = "/images/news-placeholder.svg";
const PAGE_SIZE = 30;

const NEWS_TABS = [
  { id: "latest", label: "최신", category: "전체" as const },
  { id: "market", label: "주식 시장", category: "시장" as const },
  { id: "economy", label: "경제", category: "경제" as const },
  { id: "company", label: "기업", category: "기업" as const },
  { id: "us", label: "미국", category: "미국" as const },
];

function isRealThumbnail(url: string) {
  return url.startsWith("http") && !url.includes("news-placeholder");
}

function formatByLine(source: string) {
  const s = source.trim();
  if (!s) return "By MarketLens";
  if (/^by\s/i.test(s)) return s;
  return `By ${s}`;
}

function InvestingNewsRow({ news }: { news: NewsItem }) {
  const [imgSrc, setImgSrc] = useState(news.thumbnail);

  useEffect(() => {
    setImgSrc(news.thumbnail);
  }, [news.thumbnail]);

  const body = (
    <>
      <div className="inv-news-row-text">
        <h3 className="inv-news-row-title">{news.title}</h3>
        <p className="inv-news-row-meta">
          {formatByLine(news.source)} · {formatRelativeTime(news.publishedAt)}
        </p>
      </div>
      <div className="inv-news-row-media">
        <Image
          className="inv-news-row-image"
          src={isRealThumbnail(imgSrc) ? imgSrc : PLACEHOLDER}
          alt=""
          width={112}
          height={84}
          unoptimized
          loading="lazy"
          onError={() => setImgSrc(PLACEHOLDER)}
        />
      </div>
    </>
  );

  if (news.url) {
    return (
      <article className="inv-news-row">
        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inv-news-row-link"
        >
          {body}
        </a>
      </article>
    );
  }

  return (
    <article className="inv-news-row">
      <div className="inv-news-row-link">{body}</div>
    </article>
  );
}

export default function InvestingNewsFeed() {
  const [activeTab, setActiveTab] = useState(NEWS_TABS[0].id);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const category = NEWS_TABS.find((t) => t.id === activeTab)?.category ?? "전체";

  const { data, isLoading, isError, refetch, isFetching } = useQuery<NewsListResponse>({
    queryKey: ["newsList"],
    queryFn: () => getNewsList(),
    refetchInterval: (query) => {
      const sec = query.state.data?.refreshSec ?? 90;
      return Math.max(30, sec) * 1000;
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const all = data?.data ?? [];
    if (category === "전체") {
      return [...all].sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1));
    }
    return all.filter((n) => n.category === category);
  }, [data?.data, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  return (
    <div className="inv-table-panel inv-investing-panel inv-news-panel">
      <div className="inv-news-panel-head">
        <h2 className="inv-news-panel-title">주식 시장 뉴스</h2>
        <p className="inv-news-panel-desc">
          Investing.com 주식 시장 뉴스와 동일한 목록 형식 · RSS
          {data?.fetchedAt ? (
            <>
              {" "}
              · {formatRelativeTime(data.fetchedAt)} 갱신
              {isFetching ? " …" : ""}
            </>
          ) : null}
        </p>
      </div>

      <div className="inv-view-tabs inv-news-tabs" role="tablist" aria-label="뉴스 분류">
        {NEWS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`inv-view-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="inv-news-feed">
        {isLoading && <LoadingState rows={6} />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && pageItems.length === 0 && (
          <EmptyState title="뉴스가 없습니다." description="잠시 후 다시 시도해 주세요." />
        )}
        {!isLoading && !isError && pageItems.length > 0 && (
          <div className="inv-news-feed-list">
            {pageItems.map((news) => (
              <InvestingNewsRow key={news.id} news={news} />
            ))}
          </div>
        )}
      </div>

      {!isLoading && !isError && filtered.length > 0 && (
        <footer className="inv-table-footer inv-news-footer">
          <div className="inv-news-pagination">
            <button
              type="button"
              className="inv-news-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <span className="inv-news-page-info">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="inv-news-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={isFetching}
            onClick={() => {
              void (async () => {
                const fresh = await getNewsList({ refresh: true });
                queryClient.setQueryData(["newsList"], fresh);
              })();
            }}
          >
            새로고침
          </button>
        </footer>
      )}
    </div>
  );
}
