import { mockNewsList, type NewsItem } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiBase";

function normalizeNews(raw: Record<string, unknown>): NewsItem {
  const urlRaw = raw.url;
  return {
    id: String(raw.id),
    category: String(raw.category),
    title: String(raw.title),
    source: String(raw.source),
    publishedAt: String(raw.publishedAt ?? raw.published_at ?? raw.published ?? ""),
    thumbnail: String(raw.thumbnail ?? "/images/news-placeholder.svg"),
    url: typeof urlRaw === "string" && urlRaw.startsWith("http") ? urlRaw : undefined,
  };
}

export type NewsListResponse = {
  data: NewsItem[];
  page: number;
  total: number;
  status: "live" | "mock" | "fallback";
  fetchedAt?: string;
  refreshSec?: number;
  counts?: Record<string, number>;
};

export async function getNewsList(params: { page?: number; refresh?: boolean } = {}): Promise<NewsListResponse> {
  const qs = params.refresh ? "?refresh=true" : "";
  try {
    const res = await fetch(`${getApiBaseUrl()}/news${qs}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Record<string, unknown>[];
        status?: string;
        fetched_at?: string;
        refresh_sec?: number;
        counts?: Record<string, number>;
      };
      if (json.data?.length) {
        const data = json.data.map(normalizeNews);
        const st = json.status === "fallback" ? "fallback" : "live";
        return {
          data,
          page: params.page || 1,
          total: data.length,
          status: st,
          fetchedAt: json.fetched_at,
          refreshSec: json.refresh_sec,
          counts: json.counts,
        };
      }
    }
  } catch {
    // backend news route not ready — fallback below
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return {
    data: mockNewsList,
    page: params.page || 1,
    total: mockNewsList.length,
    status: "mock",
  };
}
