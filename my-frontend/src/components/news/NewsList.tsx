"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNewsList } from "@/services/newsApi";
import type { NewsItem } from "@/data/mockData";
import { formatRelativeTime } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { uiConfig } from "@/config/uiConfig";

const PLACEHOLDER = "/images/news-placeholder.svg";

interface NewsListProps {
  compact?: boolean;
}

function isRealThumbnail(url: string) {
  return url.startsWith("http") && !url.includes("news-placeholder");
}

function NewsThumbnail({ src, compact }: { src: string; compact: boolean }) {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const w = compact ? uiConfig.news.thumbnailWidthMobile : uiConfig.news.thumbnailWidthDesktop;
  const h = compact ? uiConfig.news.thumbnailHeightMobile : uiConfig.news.thumbnailHeightDesktop;

  return (
    <Image
      className="news-thumbnail"
      src={isRealThumbnail(imgSrc) ? imgSrc : PLACEHOLDER}
      alt=""
      width={w}
      height={h}
      unoptimized
      loading="lazy"
      onError={() => setImgSrc(PLACEHOLDER)}
    />
  );
}

function NewsCard({ news, compact }: { news: NewsItem; compact: boolean }) {
  const inner = (
    <>
      <div className="news-card-content">
        <span className="news-category">{news.category}</span>
        <h3 className="news-title">{news.title}</h3>
        <div className="news-meta">
          <span>{news.source}</span>
          <time dateTime={news.publishedAt}>{formatRelativeTime(news.publishedAt)}</time>
        </div>
      </div>
      {!compact && <NewsThumbnail src={news.thumbnail} compact={false} />}
    </>
  );

  if (news.url) {
    return (
      <article className="news-card news-card--link">
        <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-card-anchor">
          {inner}
        </a>
      </article>
    );
  }

  return <article className="news-card">{inner}</article>;
}

/** 사이드바 등 compact 위젯용 */
export default function NewsList({ compact = true }: NewsListProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["newsList"],
    queryFn: () => getNewsList(),
    refetchInterval: (query) => {
      const sec = query.state.data?.refreshSec ?? 90;
      return Math.max(30, sec) * 1000;
    },
    staleTime: 60_000,
  });

  const items = (data?.data ?? []).slice(0, compact ? 6 : 12);

  const body = (
    <>
      {isLoading && <LoadingState rows={3} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState title="뉴스가 없습니다." description="새로운 뉴스를 기다려주세요." />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <div className={`news-list${compact ? " news-list--compact" : ""}`}>
          {items.map((news) => (
            <NewsCard key={news.id} news={news} compact={compact} />
          ))}
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <>
        <header className="inv-widget-head">
          <h3 className="inv-widget-title">주요 뉴스</h3>
          <a href="/news" className="inv-widget-more">
            더 보기
          </a>
        </header>
        <div className="inv-widget-body">{body}</div>
      </>
    );
  }

  return <section className="panel">{body}</section>;
}
